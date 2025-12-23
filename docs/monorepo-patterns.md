# Monorepo Patterns

Organizing multiple skills and plugins in a single repository.

## Plugin Grouping

Skills under a `plugin.json` are automatically grouped:

```text
my-plugin/
├── plugin.json           # Plugin manifest
└── skills/
    ├── skill-a/
    │   └── SKILL.md
    └── skill-b/
        └── SKILL.md
```

The action walks up from each skill to find `plugin.json`. Skills sharing a plugin are released together.

## plugin.json Format

```json
{
  "name": "my-plugin",
  "version": "2.0.0",
  "description": "A collection of related skills"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Plugin identifier |
| `version` | No | Used for release tags |

## Flat Structure

Simplest layout—all skills in one directory:

```text
skills/
├── skill-a/
│   └── SKILL.md
├── skill-b/
│   └── SKILL.md
└── skill-c/
    └── SKILL.md
```

```yaml
- uses: galligan/skills-packager@v1
  with:
    skills-dir: 'skills'
```

## Categorized Structure

Organize by category, use matrix builds:

```text
skills/
├── frontend/
│   ├── react-wizard/SKILL.md
│   └── css-expert/SKILL.md
├── backend/
│   ├── api-builder/SKILL.md
│   └── db-optimizer/SKILL.md
└── devops/
    └── ci-helper/SKILL.md
```

```yaml
jobs:
  package:
    strategy:
      matrix:
        category: [frontend, backend, devops]
    steps:
      - uses: galligan/skills-packager@v1
        with:
          skills-dir: 'skills/${{ matrix.category }}'
          output-dir: 'dist/${{ matrix.category }}'
```

## Multi-Plugin Structure

Multiple plugins, each with their own skills:

```text
plugins/
├── plugin-a/
│   ├── plugin.json
│   └── skills/
│       ├── skill-1/SKILL.md
│       └── skill-2/SKILL.md
└── plugin-b/
    ├── plugin.json
    └── skills/
        └── skill-3/SKILL.md
```

```yaml
- uses: galligan/skills-packager@v1
  with:
    skills-dir: 'plugins'
```

## Mixed Standalone and Plugin

Some skills belong to plugins, others are standalone:

```text
skills/
├── standalone-skill/
│   └── SKILL.md              # No plugin.json above → standalone
└── my-plugin/
    ├── plugin.json
    └── skills/
        └── plugin-skill/
            └── SKILL.md      # Has plugin.json above → grouped
```

## Discovery Depth

Skills are discovered up to 3 levels deep:

```text
skills/
├── SKILL.md                      # ✅ Depth 0
├── category/
│   └── SKILL.md                  # ✅ Depth 1
├── category/
│   └── subcategory/
│       └── SKILL.md              # ✅ Depth 2
└── too/
    └── deeply/
        └── nested/
            └── SKILL.md          # ✅ Depth 3
            └── more/
                └── SKILL.md      # ❌ Depth 4 (skipped)
```

## Custom Root Directory

```yaml
- uses: galligan/skills-packager@v1
  with:
    skills-dir: 'src/agent-skills'
    output-dir: 'build/packages'
```
