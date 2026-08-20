import { createHash } from "node:crypto";
import { readFile, readdir, readlink, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { stableCompare } from "./normalize.mjs";

const excludedRoots = new Set([".git", ".pruner"]);
const relPath = (root, path) => relative(root, path).split(sep).join("/");

export async function snapshotSourceTree(repoRoot) {
  const root = resolve(repoRoot);
  const records = [];
  async function visit(path) {
    const rel = relPath(root, path);
    if (rel && excludedRoots.has(rel.split("/")[0])) return;
    const info = await stat(path);
    if (rel) records.push({ path: rel, type: info.isDirectory() ? "directory" : "file", hash: null });
    if (info.isDirectory()) {
      const entries = await readdir(path, { withFileTypes: true });
      entries.sort((a, b) => stableCompare(a.name, b.name));
      for (const entry of entries) {
        const child = resolve(path, entry.name);
        if (entry.isSymbolicLink()) {
          records.push({ path: relPath(root, child), type: "symlink", hash: createHash("sha256").update(await readlink(child)).digest("hex") });
        } else {
          await visit(child);
        }
      }
    } else if (rel) {
      records[records.length - 1].hash = createHash("sha256").update(await readFile(path)).digest("hex");
    }
  }
  await visit(root);
  return records.sort((a, b) => stableCompare(a.path, b.path));
}

export function compareSnapshots(before, after) {
  const left = new Map(before.map((record) => [record.path, record]));
  const right = new Map(after.map((record) => [record.path, record]));
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort(stableCompare);
  return paths.filter((path) => JSON.stringify(left.get(path) ?? null) !== JSON.stringify(right.get(path) ?? null));
}
