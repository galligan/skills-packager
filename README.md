# Skills Packager

**Claude.ai requires zips to upload [skills](https://agentskills.io).** This action builds them for you.

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

## Common Options

| Input | Default | What it does |
|-------|---------|--------------|
| `skills-dir` | `skills` | Where to look for skills |
| `validate-only` | `false` | Check skills without packaging |
| `create-release` | `false` | Publish GitHub releases |

See [Reference](./docs/reference.md) for the complete list.

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

## Documentation

| Doc | What's inside |
|-----|---------------|
| [Setup Guide](./docs/setup.md) | Step-by-step setup for any repo |
| [Reference](./docs/reference.md) | All inputs, outputs, and manifest fields |
| [Patterns](./docs/patterns.md) | CI/CD workflows and monorepo setups |
| [Troubleshooting](./docs/troubleshooting.md) | When things don't work |

## Development

```bash
bun install
bun run lint
bun run typecheck
```

## License

MIT
