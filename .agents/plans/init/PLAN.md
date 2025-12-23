# Skill Packager GitHub Action

A GitHub Action that creates distributable `.zip` files from skill directories for use in Claude.ai, Claude Desktop, and other compatible clients.

## Philosophy

- **Do one thing well**: Package skills into zips, output metadata for downstream use
- **Stay out of the way**: Fast execution, minimal dependencies, no unnecessary steps
- **Composable**: Let calling workflows decide what to do with the output (artifact, release asset, deploy)
- **Zero friction adoption**: Works immediately with existing skill directory structures

## How It Works

1. Detects skill directories (via explicit path, changed files, or directory scan)
2. Validates structure (SKILL.md exists, frontmatter is valid)
3. Parses YAML frontmatter to extract metadata (name, version, etc.)
4. Creates a zip of each skill directory with SHA256 checksum
5. Generates a `manifest.json` with all packaged skills
6. Outputs structured JSON for downstream workflow steps

## Repository Structure

```text
skill-packager/
├── action.yml        # Action definition
├── src/
│   ├── package.ts    # Main packaging logic
│   ├── validate.ts   # Validation logic
│   └── manifest.ts   # Manifest generation
├── README.md         # Usage documentation
└── LICENSE
```

## Action Definition

```yaml
# action.yml
name: 'Package Skills'
description: 'Creates distributable .zip files from skill directories for Claude.ai and compatible clients'
branding:
  icon: 'package'
  color: 'purple'

inputs:
  skill-paths:
    description: 'Newline-separated list of skill directory paths (e.g., from paths-filter)'
    required: false
  skills-dir:
    description: 'Root directory to scan for skills (used if skill-paths not provided)'
    required: false
    default: 'skills'
  output-dir:
    description: 'Directory for output .zip files and manifest'
    required: false
    default: 'dist'
  validate-only:
    description: 'Only validate skills, do not package'
    required: false
    default: 'false'

outputs:
  packages:
    description: 'JSON array of packaged skills with metadata'
    value: ${{ steps.package.outputs.packages }}
  manifest:
    description: 'Path to generated manifest.json'
    value: ${{ steps.package.outputs.manifest }}
  valid:
    description: 'Whether all skills passed validation'
    value: ${{ steps.package.outputs.valid }}

runs:
  using: 'composite'
  steps:
    - uses: oven-sh/setup-bun@v2
    - id: package
      shell: bash
      run: bun run ${{ github.action_path }}/src/package.ts
      env:
        INPUT_SKILL_PATHS: ${{ inputs.skill-paths }}
        INPUT_SKILLS_DIR: ${{ inputs.skills-dir }}
        INPUT_OUTPUT_DIR: ${{ inputs.output-dir }}
        INPUT_VALIDATE_ONLY: ${{ inputs.validate-only }}
```

## Implementation

### Validation (`src/validate.ts`)

Lightweight validation that ensures the packager will succeed:

```typescript
// src/validate.ts
import { join } from "path";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SkillMeta {
  name: string;
  description?: string;
  version?: string;
  spec?: number;
}

export function parseFrontmatter(content: string): SkillMeta | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const meta: SkillMeta = { name: "" };

  for (const line of yaml.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (key === "name") meta.name = value;
    if (key === "description") meta.description = value;
    if (key === "version") meta.version = value;
    if (key === "spec") meta.spec = parseInt(value, 10);
  }

  return meta.name ? meta : null;
}

export async function validateSkill(skillPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check SKILL.md exists
  const skillMdPath = join(skillPath, "SKILL.md");
  const skillMd = Bun.file(skillMdPath);

  if (!await skillMd.exists()) {
    errors.push(`SKILL.md not found in ${skillPath}`);
    return { valid: false, errors, warnings };
  }

  // Check frontmatter
  const content = await skillMd.text();
  const meta = parseFrontmatter(content);

  if (!meta) {
    errors.push(`Invalid or missing YAML frontmatter in ${skillMdPath}`);
    return { valid: false, errors, warnings };
  }

  // Required fields
  if (!meta.name) {
    errors.push(`Missing required 'name' field in frontmatter`);
  }

  if (!meta.description) {
    errors.push(`Missing required 'description' field in frontmatter`);
  }

  // Warnings for recommended fields
  if (!meta.version) {
    warnings.push(`No 'version' field - zip will not include version in filename`);
  }

  // Validate name format (lowercase, hyphens, no spaces)
  if (meta.name && !/^[a-z0-9-]+$/.test(meta.name)) {
    errors.push(`Skill name '${meta.name}' should be lowercase with hyphens only`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

### Packaging (`src/package.ts`)

```typescript
// src/package.ts
import { Glob } from "bun";
import { dirname, join } from "path";
import { mkdir } from "fs/promises";
import { validateSkill, parseFrontmatter, type SkillMeta } from "./validate";

interface PackageResult {
  name: string;
  version?: string;
  spec?: number;
  path: string;
  size: number;
  sha256: string;
}

interface Manifest {
  generated: string;
  skills: PackageResult[];
}

async function computeSha256(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const hash = new Bun.CryptoHasher("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

async function packageSkill(skillPath: string, outputDir: string): Promise<PackageResult | null> {
  // Validate first
  const validation = await validateSkill(skillPath);
  
  for (const warning of validation.warnings) {
    console.warn(`⚠️  ${warning}`);
  }
  
  if (!validation.valid) {
    for (const error of validation.errors) {
      console.error(`❌ ${error}`);
    }
    return null;
  }

  // Parse metadata
  const skillMdPath = join(skillPath, "SKILL.md");
  const content = await Bun.file(skillMdPath).text();
  const meta = parseFrontmatter(content)!;

  // Build filename
  const versionSuffix = meta.version ? `-v${meta.version}` : "";
  const filename = `${meta.name}${versionSuffix}.zip`;
  const outPath = join(outputDir, filename);

  // Create zip using system zip
  const proc = Bun.spawn(["zip", "-r", "-q", outPath, "."], {
    cwd: skillPath,
  });
  await proc.exited;

  if (proc.exitCode !== 0) {
    console.error(`❌ Failed to create zip for ${skillPath}`);
    return null;
  }

  // Get file info
  const zipFile = Bun.file(outPath);
  const size = zipFile.size;
  const sha256 = await computeSha256(outPath);

  console.log(`📦 ${meta.name}${meta.version ? ` v${meta.version}` : ""} → ${filename} (${(size / 1024).toFixed(1)}KB)`);

  return {
    name: meta.name,
    version: meta.version,
    spec: meta.spec,
    path: outPath,
    size,
    sha256,
  };
}

async function discoverSkillPaths(skillsDir: string): Promise<string[]> {
  const glob = new Glob("**/SKILL.md");
  const paths: string[] = [];
  const seen = new Set<string>();

  for await (const file of glob.scan({ cwd: skillsDir, onlyFiles: true })) {
    // Limit to 3 directories deep
    const depth = file.split("/").length - 1;
    if (depth > 3) continue;

    const dir = join(skillsDir, dirname(file));
    if (seen.has(dir)) continue;
    seen.add(dir);
    paths.push(dir);
  }

  return paths;
}

async function writeManifest(outputDir: string, results: PackageResult[]): Promise<string> {
  const manifest: Manifest = {
    generated: new Date().toISOString(),
    skills: results,
  };

  const manifestPath = join(outputDir, "manifest.json");
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`📋 Manifest written to ${manifestPath}`);
  return manifestPath;
}

async function main() {
  const skillPathsRaw = process.env.INPUT_SKILL_PATHS;
  const skillsDir = process.env.INPUT_SKILLS_DIR || "skills";
  const outputDir = process.env.INPUT_OUTPUT_DIR || "dist";
  const validateOnly = process.env.INPUT_VALIDATE_ONLY === "true";

  await mkdir(outputDir, { recursive: true });

  // Determine which skills to process
  let skillPaths: string[];

  if (skillPathsRaw) {
    // Explicit paths provided (e.g., from paths-filter detecting changed SKILL.md files)
    skillPaths = skillPathsRaw
      .split("\n")
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        // If path is to SKILL.md, get parent directory
        if (p.endsWith("SKILL.md")) {
          return dirname(p);
        }
        return p;
      });
  } else {
    // Scan for skills (up to 3 levels deep)
    skillPaths = await discoverSkillPaths(skillsDir);
  }

  if (skillPaths.length === 0) {
    console.log("No skills found to process");
    process.exit(0);
  }

  console.log(`Found ${skillPaths.length} skill(s) to process\n`);

  // Validate only mode
  if (validateOnly) {
    let allValid = true;
    for (const path of skillPaths) {
      console.log(`Validating ${path}...`);
      const result = await validateSkill(path);
      
      for (const warning of result.warnings) {
        console.warn(`  ⚠️  ${warning}`);
      }
      for (const error of result.errors) {
        console.error(`  ❌ ${error}`);
      }
      
      if (result.valid) {
        console.log(`  ✅ Valid\n`);
      } else {
        allValid = false;
        console.log();
      }
    }

    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      await Bun.write(outputFile, `valid=${allValid}\n`, { append: true });
    }

    process.exit(allValid ? 0 : 1);
  }

  // Package mode
  const results: PackageResult[] = [];

  for (const path of skillPaths) {
    const result = await packageSkill(path, outputDir);
    if (result) results.push(result);
  }

  // Generate manifest
  const manifestPath = await writeManifest(outputDir, results);

  // Write outputs for GitHub Actions
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    const outputs = [
      `packages=${JSON.stringify(results)}`,
      `manifest=${manifestPath}`,
      `valid=${results.length === skillPaths.length}`,
    ].join("\n") + "\n";
    
    await Bun.write(outputFile, outputs, { append: true });
  }

  console.log(`\n✅ Packaged ${results.length}/${skillPaths.length} skill(s)`);

  if (results.length < skillPaths.length) {
    process.exit(1);
  }
}

main();
```

## Output Format

### `packages` Output

JSON array of packaged skills:

```json
[
  {
    "name": "frontend-design",
    "version": "1.2.0",
    "spec": 1,
    "path": "dist/frontend-design-v1.2.0.zip",
    "size": 15234,
    "sha256": "a1b2c3d4e5f6..."
  },
  {
    "name": "docx",
    "path": "dist/docx.zip",
    "size": 8921,
    "sha256": "f6e5d4c3b2a1..."
  }
]
```

### `manifest.json`

Generated in the output directory (should be gitignored):

```json
{
  "generated": "2025-01-15T10:30:00.000Z",
  "skills": [
    {
      "name": "frontend-design",
      "version": "1.2.0",
      "path": "dist/frontend-design-v1.2.0.zip",
      "size": 15234,
      "sha256": "a1b2c3d4e5f6..."
    }
  ]
}
```

### Recommended `.gitignore`

```gitignore
# Skill packager outputs
dist/
manifest.json
*.zip
```

## Usage Patterns

### Pattern 1: Package Only Changed Skills (Recommended)

Uses GitHub's path detection to find which `SKILL.md` files changed, then packages only those skills. Most efficient for repos with multiple skills.

```yaml
name: Package Changed Skills
on:
  push:
    paths:
      - '**/SKILL.md'
      - '**/*.py'
      - '**/*.md'

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: dorny/paths-filter@v3
        id: changes
        with:
          list-files: shell
          filters: |
            skills:
              - '**/SKILL.md'

      - uses: your-org/skill-packager@v1
        if: steps.changes.outputs.skills == 'true'
        with:
          skill-paths: ${{ steps.changes.outputs.skills_files }}

      - uses: actions/upload-artifact@v4
        if: steps.changes.outputs.skills == 'true'
        with:
          name: skills
          path: |
            dist/*.zip
            dist/manifest.json
```

### Pattern 2: Validate on PR, Package on Merge

Run validation on pull requests to catch issues early, only package on merge to main.

```yaml
name: Skills CI
on:
  pull_request:
    paths:
      - '**/SKILL.md'
  push:
    branches:
      - main
    paths:
      - '**/SKILL.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: your-org/skill-packager@v1
        with:
          validate-only: 'true'

  package:
    if: github.event_name == 'push'
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: your-org/skill-packager@v1
        id: package
      
      - uses: actions/upload-artifact@v4
        with:
          name: skills
          path: dist/*.zip
```

### Pattern 3: Attach to GitHub Releases

Packages all skills and attaches them as release assets when you push a version tag.

```yaml
name: Release Skills
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: your-org/skill-packager@v1
        id: package

      - uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/*.zip
            dist/manifest.json
          body: |
            ## Packaged Skills
            
            | Skill | Version | SHA256 |
            |-------|---------|--------|
            ${{ fromJSON(steps.package.outputs.packages).map(p => `| ${p.name} | ${p.version || '-'} | \`${p.sha256.slice(0,12)}...\` |`).join('\n') }}
```

### Pattern 4: Package All Skills

Scans the entire skills directory and packages everything. Good for initial setup or full rebuilds.

```yaml
- uses: your-org/skill-packager@v1
  with:
    skills-dir: 'skills'
```

### Pattern 5: Single Skill

Explicitly package one skill by path.

```yaml
- uses: your-org/skill-packager@v1
  with:
    skill-paths: 'skills/my-custom-skill'
```

## Versioning Strategy

### Skill Metadata Fields

| Field | Purpose | Required | Example |
|-------|---------|----------|---------|
| `name` | Skill identifier, used in zip filename | Yes | `frontend-design` |
| `description` | What the skill does, when to use it | Yes | `Create web interfaces...` |
| `version` | Skill release version (semver recommended) | No | `1.2.0` |
| `spec` | Skill format version for compatibility | No | `1` |

### Filename Convention

- With version: `{name}-v{version}.zip` → `frontend-design-v1.2.0.zip`
- Without version: `{name}.zip` → `frontend-design.zip`

### Future Compatibility Fields

The frontmatter could support structured compatibility requirements:

```yaml
---
name: advanced-skill
description: Requires specific capabilities
version: 2.0.0
spec: 1
compatibility:
  products:
    - claude-desktop >= 1.0
  capabilities:
    - computer-use
    - web-search
---
```

The action extracts these and includes them in the output JSON, allowing release workflows to make smart decisions about publishing.

## Performance

| Step | Estimated Time |
|------|----------------|
| Checkout | ~1-2s |
| setup-bun (cached) | ~2-3s |
| Package script | ~1s per skill |
| **Total** | **~5-10s typical** |

The action uses:
- `oven-sh/setup-bun@v2` which caches Bun installations
- System `zip` command (faster than JS-based zip libraries)
- Bun's native file APIs (no npm dependencies)

## What This Action Does NOT Do

Keeping scope tight for composability:

- **No publishing**: Doesn't upload to registries or CDNs (calling workflow's job)
- **No changelog generation**: Doesn't create release notes (use other tools)
- **No version bumping**: Doesn't modify files (use semantic-release, etc.)
- **No deep content validation**: Checks structure, not whether the skill logic is correct

## Validation Checks

The validator ensures:

| Check | Severity | Description |
|-------|----------|-------------|
| SKILL.md exists | Error | Required file for all skills |
| Valid frontmatter | Error | Must have `---` delimited YAML block |
| `name` field | Error | Required, must be lowercase with hyphens |
| `description` field | Error | Required |
| `version` field | Warning | Recommended for release tracking |

### Running Validation Only

```yaml
- uses: your-org/skill-packager@v1
  with:
    validate-only: 'true'
```

Exit code is non-zero if any skill fails validation.

## Decisions Made

| Question | Decision |
|----------|----------|
| Validation | Built-in, lightweight—checks structure before packaging |
| Manifest | Generated as `manifest.json` in output dir, should be gitignored |
| Checksums | SHA256 computed for each zip, included in output JSON and manifest |
| Scan depth | 3 directories max, but prefer explicit paths from `paths-filter` |

## Future Considerations

1. **Registry publishing**: Action could optionally push to a skill registry/CDN
2. **Signature verification**: Could sign packages for authenticity beyond checksums
3. **Changelog generation**: Could diff versions and generate release notes
4. **Dependency resolution**: If skills ever reference other skills
