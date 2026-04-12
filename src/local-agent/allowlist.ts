import path from "node:path";

/**
 * Default approved output directories (relative to project root).
 * The local agent can only write within these paths.
 */
const DEFAULT_ALLOWED_DIRS: readonly string[] = [
  "output",
  "memory",
  "docs",
  "configs",
  "sessions",
];

/**
 * Paths that are always denied, regardless of allowlist.
 */
const ALWAYS_DENIED: readonly string[] = [
  ".git",
  "node_modules",
  ".ssh",
  ".aws",
  ".env",
];

/**
 * Check whether a target path is within one of the allowed paths.
 *
 * @param targetPath  Absolute path to validate
 * @param allowedPaths  Explicit allowlist (absolute paths). If empty, uses defaults relative to cwd.
 * @returns Object with `allowed` boolean and `reason` if denied.
 */
export function isPathAllowed(
  targetPath: string,
  allowedPaths?: string[],
): { allowed: boolean; reason: string | null } {
  const resolved = path.resolve(targetPath);
  const normalized = resolved.toLowerCase().replace(/\\/g, "/");

  // Always-denied check
  for (const denied of ALWAYS_DENIED) {
    const deniedLower = denied.toLowerCase();
    // Block if any path segment matches a denied name
    const segments = normalized.split("/");
    if (segments.includes(deniedLower)) {
      return { allowed: false, reason: `Path contains denied segment: ${denied}` };
    }
    // Block direct file match (e.g. ".env" as a file)
    if (normalized.endsWith(`/${deniedLower}`)) {
      return { allowed: false, reason: `Path targets denied file: ${denied}` };
    }
  }

  // Build effective allowlist
  const effectiveAllowed = allowedPaths && allowedPaths.length > 0
    ? allowedPaths.map((p) => path.resolve(p).toLowerCase().replace(/\\/g, "/"))
    : DEFAULT_ALLOWED_DIRS.map((d) => path.resolve(process.cwd(), d).toLowerCase().replace(/\\/g, "/"));

  for (const allowed of effectiveAllowed) {
    if (normalized === allowed || normalized.startsWith(allowed + "/")) {
      return { allowed: true, reason: null };
    }
  }

  return {
    allowed: false,
    reason: `Path not in allowlist: ${resolved}`,
  };
}

/**
 * Validate all output targets before any writes begin.
 * Returns the first denial if any target is disallowed.
 */
export function validateOutputTargets(
  targets: string[],
  allowedPaths?: string[],
): { ok: boolean; denied: string | null; reason: string | null } {
  for (const target of targets) {
    const check = isPathAllowed(target, allowedPaths);
    if (!check.allowed) {
      return { ok: false, denied: target, reason: check.reason };
    }
  }
  return { ok: true, denied: null, reason: null };
}
