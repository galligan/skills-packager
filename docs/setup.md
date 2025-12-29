# Agent Setup Guide

Step-by-step instructions for AI agents to set up skills-packager in any repository.

## Prerequisites

- Git repository with GitHub Actions enabled
- Skills written as markdown files with SKILL.md frontmatter
- `contents: write` permission for releases (if using `create-release`)

## Step 1: Create the Workflow

Create `.github/workflows/skills.yml`:

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

This workflow:

- Validates skills on PR (catches errors before merge)
- Packages and releases on merge to main
- Requires `contents: write` for creating releases

## Step 2: Create Your First Skill

Create `skills/my-skill/SKILL.md`:

```yaml
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
---

# My Skill

Your skill documentation and implementation here...
```

### Required Frontmatter

| Field | Required | Format |
|-------|----------|--------|
| `name` | Yes | Lowercase with hyphens only (e.g., `my-skill`) |
| `description` | Yes | Brief description (one line preferred) |

### Optional Frontmatter

| Field | Default | Purpose |
|-------|---------|---------|
| `version` | None | Semver version (e.g., `1.0.0`); included in zip filename |
| `spec` | `1` | Skill format version |

### Directory Structure

```text
skills/
├── my-skill/
│   ├── SKILL.md          # Required: frontmatter + content
│   ├── helpers.ts        # Optional: additional files
│   └── examples/         # Optional: subdirectories
└── another-skill/
    └── SKILL.md
```

All files in the skill directory are included in the zip.

## Step 3: Verify Setup

1. Commit and push your workflow and skill:

```bash
git add .github/workflows/skills.yml skills/my-skill/SKILL.md
git commit -m "feat: add skills packaging workflow"
git push
```

2. Check the Actions tab in your GitHub repo:
   - Should see "Skills" workflow running
   - First run packages and creates release (if on main branch)

3. Verify the release:
   - Navigate to Releases in your repo
   - Should see `my-skill-v1.0.0` (or `my-skill` if no version)
   - Release contains `my-skill-v1.0.0.zip` and `my-skill-v1.0.0.zip.sha256`

## Common Customizations

### Different Skills Directory

Change `skills-dir` input if your skills are elsewhere:

```yaml
- uses: galligan/skills-packager@v1
  with:
    skills-dir: my-skills  # Default: skills
```

### Draft Releases

Create releases as drafts for manual review before publishing:

```yaml
- uses: galligan/skills-packager@v1
  with:
    create-release: true
    draft: true  # Creates draft releases
```

### Change Detection

By default, the action automatically detects which skills have changed and only packages those:

- **In PRs**: Compares against the PR's base branch
- **On push with tags**: Compares against the most recent tag
- **First run (no tags)**: Packages everything

No configuration needed—it just works.

#### Force Full Build

To package all skills regardless of changes:

```yaml
- uses: galligan/skills-packager@v1
  with:
    force-all: true  # Package everything
```

#### Custom Baseline

To compare against a specific ref:

```yaml
- uses: galligan/skills-packager@v1
  with:
    since: v1.0.0  # Compare against this tag/branch/SHA
```

#### Explicit Paths (Power Users)

For fine-grained control, you can still specify exact paths:

```yaml
- uses: galligan/skills-packager@v1
  with:
    skill-paths: |
      skills/changed-skill-1
      skills/changed-skill-2
```

### Validation Only

Run validation without packaging (useful for pre-commit checks):

```yaml
- uses: galligan/skills-packager@v1
  with:
    validate-only: true
```

## Troubleshooting

### Validation Failures

If validation fails, check:

- SKILL.md has valid YAML frontmatter (opening/closing `---`)
- `name` field uses lowercase with hyphens only
- `description` field is present and non-empty
- SKILL.md file exists in each skill directory

### Missing Releases

If releases don't appear:

- Verify `permissions.contents: write` in workflow
- Check Actions logs for errors
- Ensure `create-release: true` is set
- Confirm push is to main branch (or branch specified in workflow)

### Wrong Files in Zip

The action includes all files in the skill directory:

- Move unrelated files outside the skill directory
- Each skill should be self-contained in its directory

## Plugin Grouping (Advanced)

To group multiple skills under a plugin, add `plugin.json` in the parent directory:

```text
skills/
├── my-plugin/
│   ├── plugin.json       # Plugin metadata
│   ├── skill-one/
│   │   └── SKILL.md
│   └── skill-two/
│       └── SKILL.md
```

```json
{
  "name": "my-plugin",
  "version": "2.0.0",
  "description": "My Claude plugin"
}
```

Skills under `my-plugin/` will be grouped together in the manifest and released as `my-plugin-v2.0.0`.

See [Patterns](./patterns.md) for more details.
