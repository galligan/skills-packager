import { join } from "path";

export interface PackageResult {
  name: string;
  version?: string;
  spec?: number;
  path: string;
  size: number;
  sha256: string;
}

export interface PluginMeta {
  name: string;
  version?: string;
  path: string;
}

export interface SkillGroup {
  plugin?: PluginMeta;
  skills: PackageResult[];
}

export interface Manifest {
  generated: string;
  skills: PackageResult[];
  groups?: SkillGroup[];
}

export async function writeManifest(
  outputDir: string,
  results: PackageResult[],
  groups?: SkillGroup[],
): Promise<string> {
  const manifest: Manifest = {
    generated: new Date().toISOString(),
    skills: results,
  };

  if (groups && groups.length > 0) {
    manifest.groups = groups;
  }

  const manifestPath = join(outputDir, "manifest.json");
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Manifest written to ${manifestPath}`);
  return manifestPath;
}
