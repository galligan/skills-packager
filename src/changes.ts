/**
 * Git-based change detection for incremental skill packaging.
 *
 * Detects which skill directories have changed since a baseline ref
 * to avoid repackaging unchanged skills.
 */

/**
 * Auto-detect the baseline ref based on GitHub context:
 * - PR: origin/$GITHUB_BASE_REF
 * - Push/other with tags: most recent tag
 * - No tags: null (triggers full build)
 */
export async function detectBaseline(): Promise<string | null> {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const baseRef = process.env.GITHUB_BASE_REF;

  // PR context: use base branch
  if (eventName === "pull_request" && baseRef) {
    const prBase = `origin/${baseRef}`;
    console.log(`Detected PR context, using base: ${prBase}`);
    return prBase;
  }

  // Try to find most recent tag
  const proc = Bun.spawn(["git", "describe", "--tags", "--abbrev=0"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    const output = await new Response(proc.stdout).text();
    const tag = output.trim();
    console.log(`Detected most recent tag: ${tag}`);
    return tag;
  }

  // No tags found
  console.log("No previous release tag found");
  return null;
}

/**
 * Ensure a git ref is available locally (handles shallow clones).
 * Fetches the ref if it's not already available.
 */
export async function ensureRefAvailable(ref: string): Promise<void> {
  // Check if ref exists locally
  const verifyProc = Bun.spawn(["git", "rev-parse", "--verify", ref], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await verifyProc.exited;

  if (exitCode === 0) {
    // Ref already exists
    return;
  }

  // Try to fetch the ref
  console.log(`Fetching ref: ${ref}`);
  const fetchProc = Bun.spawn(
    ["git", "fetch", "--depth=1", "origin", ref],
    {
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  const fetchExitCode = await fetchProc.exited;

  if (fetchExitCode !== 0) {
    throw new Error(`Failed to fetch ref: ${ref}`);
  }
}

/**
 * Get list of changed files between two refs.
 *
 * @param since - The baseline ref to compare from
 * @param until - The target ref to compare to (default: HEAD)
 * @returns Array of changed file paths relative to repo root
 */
export async function getChangedFiles(
  since: string,
  until: string = "HEAD",
): Promise<string[]> {
  const proc = Bun.spawn(
    ["git", "diff", "--name-only", `${since}...${until}`],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to get changed files: ${stderr}`);
  }

  const output = await new Response(proc.stdout).text();
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Filter skill directories to only those with changes.
 *
 * A skill is considered "changed" if ANY file within its directory
 * (or subdirectories) has changed.
 *
 * @param allSkillDirs - All discovered skill directory paths
 * @param changedFiles - List of changed file paths from git diff
 * @returns Filtered list of skill directories that have changes
 */
export function filterChangedSkills(
  allSkillDirs: string[],
  changedFiles: string[],
): string[] {
  return allSkillDirs.filter((skillDir) => {
    // Normalize path separators and ensure consistent format
    const normalizedSkillDir = skillDir.replace(/\\/g, "/");

    // Check if any changed file is within this skill directory
    return changedFiles.some((file) => {
      const normalizedFile = file.replace(/\\/g, "/");
      return normalizedFile.startsWith(`${normalizedSkillDir}/`);
    });
  });
}
