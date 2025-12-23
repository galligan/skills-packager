# Pipeline Patterns

Common CI/CD workflows for skill packaging.

## Validate on PR, Package on Merge

```yaml
name: Skills CI

on:
  pull_request:
    paths: ['**/SKILL.md']
  push:
    branches: [main]
    paths: ['**/SKILL.md']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: galligan/skills-packager@v1
        with:
          validate-only: 'true'

  package:
    if: github.event_name == 'push'
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: galligan/skills-packager@v1
      - uses: actions/upload-artifact@v4
        with:
          name: skills
          path: dist/*.zip
```

## Package Changed Skills Only

```yaml
name: Package Changed

on:
  push:
    paths: ['**/SKILL.md']

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

      - uses: galligan/skills-packager@v1
        if: steps.changes.outputs.skills == 'true'
        with:
          skill-paths: ${{ steps.changes.outputs.skills_files }}

      - uses: actions/upload-artifact@v4
        if: steps.changes.outputs.skills == 'true'
        with:
          name: skills
          path: dist/*.zip
```

## Package and Release

```yaml
name: Release Skills

on:
  push:
    branches: [main]
    paths: ['**/SKILL.md']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: galligan/skills-packager@v1
        with:
          create-release: 'true'
```

## Draft Releases for Review

```yaml
- uses: galligan/skills-packager@v1
  with:
    create-release: 'true'
    draft: 'true'
```

## Custom Release Prefix

```yaml
- uses: galligan/skills-packager@v1
  with:
    create-release: 'true'
    release-prefix: 'skills-'  # Tags: skills-my-skill-v1.0.0
```

## Scheduled Packaging

```yaml
name: Nightly Package

on:
  schedule:
    - cron: '0 0 * * *'  # Midnight UTC

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: galligan/skills-packager@v1
      - uses: actions/upload-artifact@v4
        with:
          name: skills-${{ github.run_id }}
          path: dist/*.zip
          retention-days: 30
```

## Conditional Steps with Outputs

```yaml
- uses: galligan/skills-packager@v1
  id: package

- name: Notify on success
  if: steps.package.outputs.valid == 'true'
  run: echo "All skills valid!"

- name: Fail on validation errors
  if: steps.package.outputs.valid != 'true'
  run: exit 1
```
