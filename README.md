# Skill Packager

GitHub Action that validates skill folders, packages each skill into a zip, and emits a manifest for downstream workflows.

## Goals

- Package skills into zips with SHA256 checksums
- Emit a manifest JSON for releases or artifact uploads
- Keep dependencies minimal and execution fast

## How It Works

1. Determine skill directories (explicit paths or directory scan)
2. Validate SKILL.md frontmatter
3. Zip each skill directory
4. Generate a manifest.json with metadata
5. Emit outputs for GitHub Actions

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `skill-paths` | no | | Newline-separated list of skill directories or SKILL.md paths |
| `skills-dir` | no | `skills` | Root directory to scan for skills |
| `output-dir` | no | `dist` | Directory for zips and manifest |
| `validate-only` | no | `false` | Validate only, skip packaging |

## Outputs

| Name | Description |
| --- | --- |
| `packages` | JSON array of packaged skills with metadata |
| `manifest` | Path to generated manifest.json |
| `valid` | Whether all skills passed validation |

## Usage

### Package Only Changed Skills

```yaml
name: Package Changed Skills
on:
  push:
    paths:
      - '**/SKILL.md'

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

      - uses: your-org/skills-packager@v1
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

### Validate on PR, Package on Merge

```yaml
name: Skills CI
on:
  pull_request:
    paths:
      - '**/SKILL.md'
  push:
    branches: [main]
    paths:
      - '**/SKILL.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/skills-packager@v1
        with:
          validate-only: 'true'

  package:
    if: github.event_name == 'push'
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/skills-packager@v1
        id: package
      - uses: actions/upload-artifact@v4
        with:
          name: skills
          path: dist/*.zip
```

### Package Everything

```yaml
- uses: your-org/skills-packager@v1
  with:
    skills-dir: 'skills'
```

## Skill Frontmatter

Required fields:

```yaml
---
name: frontend-design
description: Create web interfaces quickly
version: 1.2.0
spec: 1
---
```

Notes:

- `name` must be lowercase with hyphens
- `version` is optional but recommended
- Frontmatter parsing expects simple `key: value` lines

## Development

```bash
bun install
bun run lint
```

## Requirements

- `zip` available on the runner (present on ubuntu-latest)
- Bun runtime via `oven-sh/setup-bun`
