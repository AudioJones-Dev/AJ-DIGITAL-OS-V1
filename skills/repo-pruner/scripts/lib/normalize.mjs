import { relative, resolve, sep } from "node:path";

export function normalizeRepoPath(repoRoot, candidate) {
  const root = resolve(repoRoot);
  const absolute = resolve(root, candidate);
  const rel = relative(root, absolute);
  if (!rel || rel === ".") return ".";
  if (rel === ".." || rel.startsWith(`..${sep}`) || resolve(absolute) === root) {
    throw new Error(`path-outside-repository:${candidate}`);
  }
  return rel.split(sep).join("/");
}

export function normalizeLineEndings(value) {
  return String(value).replace(/\r\n?/gu, "\n");
}

export function stableCompare(left, right) {
  return String(left).localeCompare(String(right), "en", { sensitivity: "variant", numeric: false });
}
