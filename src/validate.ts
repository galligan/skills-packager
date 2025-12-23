import { join } from "path";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SkillMeta {
  name: string;
  description?: string;
  version?: string;
  spec?: number;
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

export function parseFrontmatter(content: string): SkillMeta | null {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return null;

  const yaml = match[1];
  const meta: SkillMeta = { name: "" };

  for (const line of yaml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    const value = stripQuotes(rawValue);

    if (key === "name") meta.name = value;
    if (key === "description") meta.description = value;
    if (key === "version") meta.version = value;
    if (key === "spec") {
      const spec = Number.parseInt(value, 10);
      if (!Number.isNaN(spec)) meta.spec = spec;
    }
  }

  return meta.name ? meta : null;
}

export async function validateSkill(skillPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const skillMdPath = join(skillPath, "SKILL.md");
  const skillMd = Bun.file(skillMdPath);

  if (!await skillMd.exists()) {
    errors.push(`SKILL.md not found in ${skillPath}`);
    return { valid: false, errors, warnings };
  }

  const content = await skillMd.text();
  const meta = parseFrontmatter(content);

  if (!meta) {
    errors.push(`Invalid or missing YAML frontmatter in ${skillMdPath}`);
    return { valid: false, errors, warnings };
  }

  if (!meta.name) {
    errors.push("Missing required 'name' field in frontmatter");
  }

  if (!meta.description) {
    errors.push("Missing required 'description' field in frontmatter");
  }

  if (!meta.version) {
    warnings.push("No 'version' field - zip will not include version in filename");
  }

  if (meta.name && !/^[a-z0-9-]+$/.test(meta.name)) {
    errors.push(`Skill name '${meta.name}' should be lowercase with hyphens only`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
