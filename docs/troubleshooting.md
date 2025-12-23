# Troubleshooting

Common issues and solutions.

## Validation Errors

### Missing Frontmatter

```text
ERROR Missing frontmatter in skills/my-skill/SKILL.md
```

Add YAML frontmatter at the top of SKILL.md:

```yaml
---
name: my-skill
description: What this skill does
---
```

### Invalid Name

```text
ERROR Invalid name format
```

| Invalid | Valid |
|---------|-------|
| `My Skill` | `my-skill` |
| `mySkill` | `my-skill` |
| `my_skill` | `my-skill` |

Names must be lowercase with hyphens only.

### Missing Required Fields

```text
ERROR Missing required field: description
```

Both `name` and `description` are required in frontmatter.

## Packaging Errors

### Zip Command Not Found

```text
ERROR Failed to create zip
```

Ensure `zip` is installed. On `ubuntu-latest` it's pre-installed.

For local testing:

```bash
# macOS
brew install zip

# Ubuntu/Debian
sudo apt-get install zip
```

### No Skills Found

```text
No skills found to process
```

| Cause | Solution |
|-------|----------|
| Wrong directory | Check `skills-dir` input |
| No SKILL.md files | Create at least one skill |
| Too deeply nested | Skills must be ≤3 levels deep |

## Release Errors

### gh CLI Not Authenticated

```text
ERROR Failed to create release: gh: Not logged in
```

Ensure GitHub token is available:

```yaml
permissions:
  contents: write
```

### Tag Already Exists

```text
ERROR Failed to create release: tag already exists
```

The version hasn't changed since last release. Either:
- Bump the version in SKILL.md or plugin.json
- Use `skip-unchanged: true` to skip unchanged skills
- Delete the existing release/tag first

## Plugin Discovery

### Plugin Not Detected

Skills show as standalone when plugin.json exists:

| Cause | Solution |
|-------|----------|
| plugin.json too far up | Must be within 5 parent directories |
| Invalid JSON | Check plugin.json syntax |
| Missing name field | Add `"name": "..."` to plugin.json |

### Wrong Plugin Grouping

Skills grouped under wrong plugin:

```text
plugins/
├── plugin-a/
│   ├── plugin.json        # ← Skills find this first
│   └── plugin-b/
│       ├── plugin.json    # ← This is ignored
│       └── skills/
```

Plugin discovery stops at the first `plugin.json` found walking up.

## Manifest Issues

### Manifest Not Generated

Check the action completed successfully:

```yaml
- uses: galligan/skills-packager@v1
  id: package

- run: cat ${{ steps.package.outputs.manifest }}
```

### Empty Manifest

All skills failed validation. Check earlier error output.

## Local Testing

Run the packager locally:

```bash
# Package all skills
INPUT_SKILLS_DIR=skills INPUT_OUTPUT_DIR=dist bun run src/package.ts

# Validate only
INPUT_SKILLS_DIR=skills INPUT_VALIDATE_ONLY=true bun run src/package.ts
```

## Debug Mode

Enable verbose output by checking the action logs. Each skill shows:
- Validation warnings/errors
- Package path and size
- Plugin grouping info
