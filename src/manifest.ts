import { join } from "path";

export interface PackageResult {
  name: string;
  version?: string;
  spec?: number;
  path: string;
  size: number;
  sha256: string;
}

export interface Manifest {
  generated: string;
  skills: PackageResult[];
}

export async function writeManifest(
  outputDir: string,
  results: PackageResult[],
): Promise<string> {
  const manifest: Manifest = {
    generated: new Date().toISOString(),
    skills: results,
  };

  const manifestPath = join(outputDir, "manifest.json");
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Manifest written to ${manifestPath}`);
  return manifestPath;
}
