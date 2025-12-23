# Skills Packager

**Claude.ai requires zips to load skills.** This action builds them for you.

```yaml
- uses: galligan/skills-packager@v1
```

Write your skills in markdown. Push to GitHub. Get installable zips—validated, checksummed, and ready to drag into Claude.

## What You Get

- **Zero config** — Drop it in, it works. Scans `skills/` automatically.
- **Plugin-aware** — Got a `plugin.json`? Skills underneath get grouped together.
- **Releases built-in** — One flag to create GitHub releases with proper tags.
- **Integrity baked in** — SHA256 checksums for every zip.

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

Push. Done.

## Going Further

| Doc | What's inside |
|-----|---------------|
| [Quick Start](./docs/README.md) | Get running in 2 minutes |
| [Inputs & Outputs](./docs/inputs-and-outputs.md) | Every option, output, and manifest field |
| [Pipeline Patterns](./docs/pipeline-patterns.md) | CI/CD recipes for real workflows |
| [Monorepo Patterns](./docs/monorepo-patterns.md) | Multi-skill repos and plugin grouping |
| [Troubleshooting](./docs/troubleshooting.md) | When things don't work |

## Common Options

| Input | Default | What it does |
|-------|---------|--------------|
| `skills-dir` | `skills` | Where to look for skills |
| `validate-only` | `false` | Check skills without packaging |
| `create-release` | `false` | Publish GitHub releases |

See [all inputs](./docs/inputs-and-outputs.md) for the complete list.

## Example: Validate PRs, Release on Merge

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

## Development

```bash
bun install
bun run lint
bun run typecheck
```

## License

MIT
