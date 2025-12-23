import { Glob } from "bun";
import { dirname, join, resolve } from "path";
import { appendFile, mkdir } from "fs/promises";
import { parseFrontmatter, validateSkill } from "./validate";
import { writeManifest, type PackageResult } from "./manifest";
import { findPluginForSkill, groupSkillsByPlugin } from "./plugin";
import { createReleasesFromGroups } from "./release";

interface ExtendedPackageResult extends PackageResult {
  pluginPath?: string;
}

async function computeSha256(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const hash = new Bun.CryptoHasher("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

async function packageSkill(
  skillPath: string,
  outputDir: string,
): Promise<ExtendedPackageResult | null> {
  const validation = await validateSkill(skillPath);

  for (const warning of validation.warnings) {
    console.warn(`WARN ${warning}`);
  }

  if (!validation.valid) {
    for (const error of validation.errors) {
      console.error(`ERROR ${error}`);
    }
    return null;
  }

  const skillMdPath = join(skillPath, "SKILL.md");
  const content = await Bun.file(skillMdPath).text();
  const meta = parseFrontmatter(content);

  if (!meta) {
    console.error(`ERROR Missing frontmatter in ${skillMdPath}`);
    return null;
  }

  const versionSuffix = meta.version ? `-v${meta.version}` : "";
  const filename = `${meta.name}${versionSuffix}.zip`;
  const outPath = resolve(outputDir, filename);

  const proc = Bun.spawn(["zip", "-r", "-q", outPath, "."], {
    cwd: skillPath,
  });
  await proc.exited;

  if (proc.exitCode !== 0) {
    console.error(`ERROR Failed to create zip for ${skillPath}`);
    return null;
  }

  const zipFile = Bun.file(outPath);
  const size = zipFile.size;
  const sha256 = await computeSha256(outPath);

  const displayVersion = meta.version ? ` v${meta.version}` : "";
  const sizeKb = (size / 1024).toFixed(1);
  console.log(`Packaged ${meta.name}${displayVersion} -> ${filename} (${sizeKb}KB)`);

  // Find parent plugin if any
  const plugin = await findPluginForSkill(skillPath);

  return {
    name: meta.name,
    version: meta.version,
    spec: meta.spec,
    path: outPath,
    size,
    sha256,
    pluginPath: plugin?.path,
  };
}

async function discoverSkillPaths(skillsDir: string): Promise<string[]> {
  const glob = new Glob("**/SKILL.md");
  const paths: string[] = [];
  const seen = new Set<string>();

  for await (const file of glob.scan({ cwd: skillsDir, onlyFiles: true })) {
    const depth = file.split("/").length - 1;
    if (depth > 3) continue;

    const dir = join(skillsDir, dirname(file));
    if (seen.has(dir)) continue;

    seen.add(dir);
    paths.push(dir);
  }

  return paths.sort();
}

function normalizeSkillPaths(skillPathsRaw: string): string[] {
  const trimmed = skillPathsRaw
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry.endsWith("SKILL.md") ? dirname(entry) : entry));

  return Array.from(new Set(trimmed));
}

async function writeOutput(value: string): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;

  await appendFile(outputFile, `${value}\n`);
}

async function main() {
  const skillPathsRaw = process.env.INPUT_SKILL_PATHS;
  const skillsDir = process.env.INPUT_SKILLS_DIR || "skills";
  const outputDir = process.env.INPUT_OUTPUT_DIR || "dist";
  const validateOnly = process.env.INPUT_VALIDATE_ONLY === "true";
  const createRelease = process.env.INPUT_CREATE_RELEASE === "true";
  const releasePrefix = process.env.INPUT_RELEASE_PREFIX || "";
  const draft = process.env.INPUT_DRAFT === "true";

  await mkdir(outputDir, { recursive: true });

  let skillPaths: string[];

  if (skillPathsRaw && skillPathsRaw.trim().length > 0) {
    skillPaths = normalizeSkillPaths(skillPathsRaw);
  } else {
    skillPaths = await discoverSkillPaths(skillsDir);
  }

  if (skillPaths.length === 0) {
    console.log("No skills found to process");
    return;
  }

  console.log(`Found ${skillPaths.length} skill(s) to process`);

  if (validateOnly) {
    let allValid = true;

    for (const path of skillPaths) {
      console.log(`Validating ${path}...`);
      const result = await validateSkill(path);

      for (const warning of result.warnings) {
        console.warn(`WARN ${warning}`);
      }

      for (const error of result.errors) {
        console.error(`ERROR ${error}`);
      }

      if (!result.valid) {
        allValid = false;
      }
    }

    await writeOutput(`valid=${allValid}`);
    if (!allValid) process.exit(1);
    return;
  }

  const results: ExtendedPackageResult[] = [];

  for (const path of skillPaths) {
    const result = await packageSkill(path, outputDir);
    if (result) results.push(result);
  }

  // Group skills by plugin
  const groups = await groupSkillsByPlugin(results);

  // Write manifest with groups
  const manifestPath = await writeManifest(outputDir, results, groups);

  // Output flat packages (without pluginPath for backward compat)
  const flatResults: PackageResult[] = results.map(
    ({ pluginPath: _, ...rest }) => rest,
  );

  await writeOutput(`packages=${JSON.stringify(flatResults)}`);
  await writeOutput(`manifest=${manifestPath}`);
  await writeOutput(`valid=${results.length === skillPaths.length}`);
  await writeOutput(`groups=${JSON.stringify(groups)}`);

  console.log(`Packaged ${results.length}/${skillPaths.length} skill(s)`);

  // Log plugin grouping info
  const pluginCount = groups.filter((g) => g.plugin).length;
  const standaloneCount = groups.filter((g) => !g.plugin).length;
  if (pluginCount > 0 || standaloneCount > 0) {
    console.log(`Grouped into ${pluginCount} plugin(s), ${standaloneCount} standalone skill(s)`);
  }

  // Create releases if requested
  if (createRelease && results.length > 0) {
    console.log("Creating GitHub releases...");
    const releases = await createReleasesFromGroups(groups, manifestPath, {
      draft,
      prefix: releasePrefix,
    });
    await writeOutput(`releases=${JSON.stringify(releases)}`);
    console.log(`Created ${releases.length} release(s)`);
  }

  if (results.length < skillPaths.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("ERROR", error);
  process.exit(1);
});
