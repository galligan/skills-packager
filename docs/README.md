# Skills Packager Documentation

Package your Claude skills into distributable `.zip` files.

## Quick Start

```yaml
- uses: galligan/skills-packager@v1
```

Scans `skills/` for `SKILL.md` files, validates, packages each into a zip with SHA256 checksum.

## Create a Skill

```bash
mkdir -p skills/my-skill
cat > skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What this skill does
version: 1.0.0
---

# My Skill

Instructions for the agent.
EOF
```

The skill is ready. Run the action to package it.

## Documentation

| Document | What it covers |
|----------|----------------|
| [inputs-and-outputs.md](./inputs-and-outputs.md) | All action inputs, outputs, and manifest format |
| [pipeline-patterns.md](./pipeline-patterns.md) | CI/CD workflows, validation on PR, package on merge |
| [monorepo-patterns.md](./monorepo-patterns.md) | Plugin grouping, multi-skill repos, matrix builds |
| [troubleshooting.md](./troubleshooting.md) | Common errors, validation failures, debugging |

## Key Concepts

| Concept | Description |
|---------|-------------|
| **SKILL.md** | Required file with YAML frontmatter defining the skill |
| **Plugin grouping** | Skills under a `plugin.json` are grouped together |
| **Manifest** | JSON file listing all packaged skills with checksums |
| **Zero-config** | Works out of the box with sensible defaults |

## Output

```text
dist/
├── my-skill-v1.0.0.zip
├── another-skill-v2.1.0.zip
└── manifest.json
```
