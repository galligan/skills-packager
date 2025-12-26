# Inputs and Outputs

Complete reference for action inputs, outputs, and manifest format.

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `skill-paths` | | Newline-separated list of skill directories |
| `skills-dir` | `skills` | Root directory to scan for skills |
| `output-dir` | `dist` | Directory for zips and manifest |
| `validate-only` | `false` | Validate only, skip packaging |
| `create-release` | `false` | Create GitHub releases |
| `version` | | Explicit version override |
| `release-prefix` | | Prefix for release tags |
| `draft` | `false` | Create releases as drafts |
| `skip-unchanged` | `false` | Skip unchanged skills |

## Outputs

| Output | Description |
|--------|-------------|
| `packages` | JSON array of packaged skills |
| `manifest` | Path to `manifest.json` |
| `valid` | `true` if all skills passed validation |
| `groups` | JSON array of skill groups (by plugin) |
| `releases` | JSON array of created releases |

## Skill Frontmatter

```yaml
---
name: my-skill
description: What this skill does
version: 1.0.0
spec: 1
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase with hyphens only |
| `description` | Yes | Brief description |
| `version` | No | Semver, included in zip filename |
| `spec` | No | Skill format version |

## Manifest Format

```json
{
  "generated": "2025-01-15T12:00:00.000Z",
  "skills": [
    {
      "name": "my-skill",
      "version": "1.0.0",
      "spec": 1,
      "path": "/path/to/dist/my-skill-v1.0.0.zip",
      "size": 1234,
      "sha256": "abc123..."
    }
  ],
  "groups": [
    {
      "plugin": {
        "name": "my-plugin",
        "version": "2.0.0",
        "path": "/path/to/plugin"
      },
      "skills": [...]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `generated` | ISO timestamp |
| `skills` | Flat array of all skills (backward compatible) |
| `groups` | Skills grouped by parent plugin |
| `groups[].plugin` | Plugin metadata (undefined for standalone) |

## Using Outputs

```yaml
- uses: galligan/skills-packager@v1
  id: package

- run: echo "Packaged ${{ fromJson(steps.package.outputs.packages)[0].name }}"

- run: |
    # Process all packages
    echo '${{ steps.package.outputs.packages }}' | jq -r '.[].name'
```

## Release Tags

When `create-release: true`:

| Scenario | Tag format |
|----------|------------|
| Plugin skill | `{prefix}{plugin-name}-v{plugin-version}` |
| Standalone skill | `{prefix}{skill-name}-v{skill-version}` |

Example: `my-plugin-v2.0.0` or `my-skill-v1.0.0`
