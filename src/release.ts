import type { SkillGroup } from "./manifest";

export interface ReleaseResult {
  tag: string;
  url: string;
  plugin?: string; // plugin name if from a plugin
  assets: string[]; // paths to uploaded assets
}

export interface ReleaseOptions {
  draft?: boolean;
  prefix?: string; // prefix for release tag
}

/**
 * Creates a GitHub release using the gh CLI.
 *
 * @param tag - The release tag (e.g., "skill-name-v1.0.0")
 * @param assets - Array of file paths to upload as release assets
 * @param options - Optional release configuration
 * @returns Release result with tag, URL, and uploaded assets
 * @throws Error if gh CLI is not available or release creation fails
 */
export async function createRelease(
  tag: string,
  assets: string[],
  options?: ReleaseOptions,
): Promise<ReleaseResult> {
  const args = ["release", "create", tag];

  if (options?.draft) {
    args.push("--draft");
  }

  // Add all assets
  for (const asset of assets) {
    args.push(asset);
  }

  // Generate release notes automatically
  args.push("--generate-notes");

  console.log(`Creating release ${tag}...`);

  const proc = Bun.spawn(["gh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error(
      `Failed to create release ${tag}: ${stderr || stdout}`,
    );
  }

  // Parse the release URL from gh output
  // gh outputs the URL on the last line of stdout
  const lines = stdout.trim().split("\n");
  const url = lines[lines.length - 1].trim();

  if (!url.startsWith("http")) {
    throw new Error(
      `Failed to parse release URL from gh output: ${stdout}`,
    );
  }

  console.log(`Created release ${tag}: ${url}`);

  return {
    tag,
    url,
    assets,
  };
}

/**
 * Creates GitHub releases from skill groups.
 *
 * For plugin groups: creates one release per plugin containing all its skills
 * For standalone skills: creates one release per skill
 *
 * @param groups - Array of skill groups to release
 * @param manifestPath - Path to manifest.json to include in all releases
 * @param options - Optional release configuration
 * @returns Array of release results (continues on individual failures)
 */
export async function createReleasesFromGroups(
  groups: SkillGroup[],
  manifestPath: string,
  options?: ReleaseOptions,
): Promise<ReleaseResult[]> {
  const prefix = options?.prefix || "";
  const results: ReleaseResult[] = [];

  for (const group of groups) {
    try {
      if (group.plugin) {
        // Plugin group: create one release for the plugin with all its skills
        const tag = `${prefix}${group.plugin.name}-v${group.plugin.version}`;
        const assets = [
          manifestPath,
          ...group.skills.map((skill) => skill.path),
        ];

        const result = await createRelease(tag, assets, options);
        results.push({
          ...result,
          plugin: group.plugin.name,
        });
      } else {
        // Standalone skills: create one release per skill
        for (const skill of group.skills) {
          const version = skill.version || "0.0.0";
          const tag = `${prefix}${skill.name}-v${version}`;
          const assets = [manifestPath, skill.path];

          const result = await createRelease(tag, assets, options);
          results.push(result);
        }
      }
    } catch (error) {
      const groupName = group.plugin
        ? `plugin ${group.plugin.name}`
        : `standalone skills (${group.skills.map((s) => s.name).join(", ")})`;

      console.error(`ERROR Failed to create release for ${groupName}:`, error);
      // Continue with remaining groups
      continue;
    }
  }

  return results;
}
