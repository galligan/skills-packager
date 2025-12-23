import { createLinter } from "actionlint";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function listWorkflowFiles(rootDir) {
  const workflowsDir = join(rootDir, ".github", "workflows");

  try {
    const entries = await readdir(workflowsDir);
    return entries
      .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
      .map((file) => join(workflowsDir, file));
  } catch {
    return [];
  }
}

async function main() {
  const files = await listWorkflowFiles(process.cwd());

  if (files.length === 0) {
    return;
  }

  const lint = await createLinter();
  let hasErrors = false;

  for (const file of files) {
    const input = await readFile(file, "utf8");
    const results = lint(input, file);

    for (const result of results) {
      const location = `${result.file}:${result.line}:${result.column}`;
      console.error(`${location} ${result.message} [${result.kind}]`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("ERROR", error);
  process.exit(1);
});
