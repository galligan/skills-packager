# Skills Packager

**Turn your Claude skills into installable zips—automatically, on every push.**

## What Are Skills?

Claude loads skills from `.zip` files. Each skill is a directory with a `SKILL.md` file that defines what Claude can do. This action validates your skill definitions and packages them into distributable zips—ready to drag into Claude.ai, Claude Desktop, or any compatible client.

## Quick Start

```yaml
- uses: galligan/skills-packager@v1
```

That's it. The action scans `skills/`, validates your SKILL.md frontmatter, and outputs zips with SHA256 checksums.

**Important:** The action validates and packages—it doesn't execute skills or define what they do inside Claude. It's infrastructure for distribution, not runtime.

## Your First Skill

Create `skills/my-skill/SKILL.md`:

```yaml
---
name: my-skill
description: What this skill does
version: 1.0.0
---

Your skill content here...
```

Push to GitHub. Get `my-skill-v1.0.0.zip` in your workflow artifacts or releases.

## Benefits

| Feature | What You Get |
|---------|--------------|
| **Instant distribution** | Zips ready to share or upload to Claude |
| **Frontmatter validation** | Catch invalid skill definitions before packaging |
| **SHA256 checksums** | Every zip gets a checksum for integrity verification |
| **Optional releases** | One flag to publish GitHub releases with proper tags |
| **Plugin grouping** | Got a `plugin.json`? Skills underneath get grouped together |

## Common Options

| Input | Default | What it does |
|-------|---------|--------------|
| `skills-dir` | `skills` | Where to look for skills |
| `output-dir` | `dist` | Where to write zips and manifest |
| `validate-only` | `false` | Check skills without packaging |
| `create-release` | `false` | Publish GitHub releases with skill zips |

See [reference.md](./docs/reference.md) for all inputs, outputs, and manifest schema.

## Example Workflow

Validate on PRs, release on merge to main:

```yaml
name: Skills
on:
  pull_request:
    paths: ['**/SKILL.md']
  push:
    branches: [main]
    paths: ['**/SKILL.md']

jobs:
  skills:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: galligan/skills-packager@v1
        with:
          validate-only: ${{ github.event_name == 'pull_request' }}
          create-release: ${{ github.event_name == 'push' }}
```

## Documentation

| Doc | What's inside |
|-----|---------------|
| [Reference](./docs/reference.md) | All inputs, outputs, and manifest fields |
| [Pipeline Patterns](./docs/pipeline-patterns.md) | CI/CD recipes for real workflows |
| [Monorepo Patterns](./docs/monorepo-patterns.md) | Multi-skill repos and plugin grouping |
| [Troubleshooting](./docs/troubleshooting.md) | When things don't work |

## Development

```bash
bun install
bun run lint
bun run typecheck
```

## License

MIT
