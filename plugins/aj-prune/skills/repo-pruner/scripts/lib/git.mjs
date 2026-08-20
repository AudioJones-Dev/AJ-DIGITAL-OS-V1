import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { stableCompare } from "./normalize.mjs";

export function git(repoRoot, args) {
  return execFileSync("git", ["-C", resolve(repoRoot), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export function dirtyPaths(repoRoot) {
  const output = git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  return output.split(/\r?\n/u).filter(Boolean).filter((line) => {
    const path = line.slice(3).replaceAll("\\", "/").replace(/^"|"$/gu, "");
    return path !== ".pruner" && !path.startsWith(".pruner/");
  });
}

export function assertCleanBaseline(repoRoot) {
  git(repoRoot, ["rev-parse", "--show-toplevel"]);
  const dirty = dirtyPaths(repoRoot);
  if (dirty.length) {
    const error = new Error(`dirty-baseline:${dirty.join("|")}`);
    error.code = "DIRTY_BASELINE";
    error.paths = dirty;
    throw error;
  }
}

export function changedPathsSince(repoRoot, baseRef) {
  if (typeof baseRef !== "string" || baseRef.trim().length === 0) throw new Error("missing-base-ref");
  const normalizedBase = baseRef.trim();
  try {
    git(repoRoot, ["rev-parse", "--verify", `${normalizedBase}^{commit}`]);
  } catch (cause) {
    const error = new Error(`unresolved-base-ref:${normalizedBase}`, { cause });
    error.code = "UNRESOLVED_BASE_REF";
    throw error;
  }
  const output = git(repoRoot, ["diff", "--name-only", "--diff-filter=ACMR", "-z", `${normalizedBase}...HEAD`]);
  return [...new Set(output.split("\0")
    .filter(Boolean)
    .map((path) => path.replaceAll("\\", "/").replace(/^\.\//u, "")))]
    .sort(stableCompare);
}
