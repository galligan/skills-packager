# Skills Packager

GitHub Action that validates and packages skill directories into distributable `.zip` files for Claude.ai, Claude Desktop, and compatible clients.

## Features

- **Zero-config operation** - Auto-discovers skills in your repo
- **Plugin awareness** - Automatically detects `plugin.json` and groups skills by plugin
- **GitHub releases** - Optionally creates releases with proper tagging
- **SHA256 checksums** - Every zip includes integrity verification
- **Manifest generation** - JSON manifest for downstream workflows

## Quick Start

```yaml
- uses: galligan/skills-packager@v1
```

That's it. The action scans `skills/` for `SKILL.md` files, validates and packages each skill.

## Documentation

| Doc | What it covers |
|-----|----------------|
| [docs/README.md](./docs/README.md) | Quick start and overview |
| [docs/inputs-and-outputs.md](./docs/inputs-and-outputs.md) | All inputs, outputs, manifest format |
| [docs/pipeline-patterns.md](./docs/pipeline-patterns.md) | CI/CD workflows, validation, releases |
| [docs/monorepo-patterns.md](./docs/monorepo-patterns.md) | Plugin grouping, multi-skill repos |
| [docs/troubleshooting.md](./docs/troubleshooting.md) | Common errors and solutions |

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `skill-paths` | | Newline-separated list of skill directories |
| `skills-dir` | `skills` | Root directory to scan for skills |
| `output-dir` | `dist` | Directory for zips and manifest |
| `validate-only` | `false` | Validate only, skip packaging |
| `create-release` | `false` | Create GitHub releases for packaged skills |
| `version` | | Explicit version override |
| `release-prefix` | | Prefix for release tags |
| `draft` | `false` | Create releases as drafts |
| `skip-unchanged` | `false` | Skip skills that haven't changed |

## Outputs

| Name | Description |
| --- | --- |
| `packages` | JSON array of packaged skills with metadata |
| `manifest` | Path to generated manifest.json |
| `valid` | Whether all skills passed validation |
| `groups` | JSON array of skill groups (grouped by plugin) |
| `releases` | JSON array of created releases (when `create-release` is true) |

## Skill Frontmatter

```yaml
---
name: my-skill
description: What this skill does
version: 1.0.0
spec: 1
---
```

- `name` - Required, lowercase with hyphens
- `description` - Required, brief description
- `version` - Recommended, included in zip filename
- `spec` - Optional, skill format version

## Example: Package and Release

```yaml
name: Package Skills
on:
  push:
    branches: [main]
    paths:
      - '**/SKILL.md'

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: galligan/skills-packager@v1
        with:
          create-release: 'true'
```

## Requirements

- `zip` command available on runner (present on `ubuntu-latest`)
- Bun runtime (automatically installed via `oven-sh/setup-bun`)

## Development

```bash
bun install
bun run lint
bun run typecheck
```

## License

MIT
