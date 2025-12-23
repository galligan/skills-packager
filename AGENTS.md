# AGENTS.md

Guidelines for AI agents working with code in this repository.

## What This Is

A GitHub Action that packages skill directories into distributable `.zip` files for Claude.ai, Claude Desktop, and compatible clients. It validates SKILL.md frontmatter, creates zips with SHA256 checksums, and emits a manifest.json for downstream workflows.

## Architecture

```text
action.yml              # Composite action definition (entry point)
├── src/package.ts      # Main orchestrator: discovery, validation, zipping
├── src/validate.ts     # Frontmatter parsing and validation
├── src/manifest.ts     # Manifest.json generation
└── scripts/actionlint.mjs  # Helper tooling
```

**Flow**: Discover skills → Validate frontmatter → Create zips via system `zip` → Compute SHA256 → Write manifest → Emit GitHub Actions outputs

Default runtime paths: `skills/` (input scan), `dist/` (output zips + `manifest.json`).

## Commands

```bash
bun install           # Install dependencies
bun run lint          # Run actionlint + markdownlint + typecheck
bun run typecheck     # TypeScript type checking only
bun run lint:actions  # Lint GitHub Actions workflows only
bun run lint:md       # Lint markdown files
bun run lint:md:fix   # Lint and auto-fix markdown files
```

Pre-commit hooks (via lefthook) run actionlint, markdownlint, and typecheck automatically.

### Local Execution

```bash
INPUT_SKILLS_DIR=skills INPUT_OUTPUT_DIR=dist bun run src/package.ts
INPUT_VALIDATE_ONLY=true bun run src/package.ts
```

## Skill Frontmatter Format

Required fields in SKILL.md:

```yaml
---
name: skill-name        # Required: lowercase with hyphens only
description: ...        # Required: what the skill does
version: 1.0.0          # Recommended: included in zip filename
spec: 1                 # Optional: skill format version
---
```

Zip filename convention: `{name}-v{version}.zip` or `{name}.zip` (if no version).

## Coding Style

- TypeScript strict mode (`tsconfig.json`); explicit types, no `any`
- ES modules, 2-space indentation
- Bun native APIs (`Bun.file`, `Bun.CryptoHasher`, `Bun.spawn`, `Bun.Glob`)
- System `zip` command for packaging (must be available on runner)
- Skills discovered up to 3 directories deep
- Validation is lightweight: checks structure, not skill logic

## Testing

No dedicated unit-test runner yet. Quality checks:

- `bun run typecheck`
- `bun run lint` (includes actionlint)

If adding tests, document the command in `package.json` and use `tests/` or `src/__tests__/`.

## Commits & PRs

- Conventional Commits (`feat:`, `chore:`, `docs:`)
- Use Graphite (`gt`); keep branches short-lived
- Branch names: `feat/area/slug` or `fix/area/slug`
- PRs: short rationale, concise change list, update README when behavior changes

## Configuration

- Action inputs via `INPUT_*` environment variables (see `action.yml`)
- Generated artifacts in `dist/`; treat as build outputs, not source
