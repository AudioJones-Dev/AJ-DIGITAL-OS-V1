#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, readlink, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const excludedRoots = new Set([".git", ".pruner"]);
const normalized = (root, path) => relative(root, path).split(sep).join("/");

export async function snapshotTree(rootPath) {
  const root = resolve(rootPath);
  const records = [];
  async function visit(path) {
    const rel = normalized(root, path);
    const first = rel.split("/")[0];
    if (rel && excludedRoots.has(first)) return;
    const info = await stat(path, { bigint: false });
    if (rel) records.push({ path: rel, type: info.isDirectory() ? "directory" : "file", hash: null });
    if (info.isDirectory()) {
      const entries = await readdir(path, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const child = resolve(path, entry.name);
        if (entry.isSymbolicLink()) {
          const childRel = normalized(root, child);
          records.push({ path: childRel, type: "symlink", hash: createHash("sha256").update(await readlink(child)).digest("hex") });
        } else {
          await visit(child);
        }
      }
    } else if (rel) {
      records[records.length - 1].hash = createHash("sha256").update(await readFile(path)).digest("hex");
    }
  }
  await visit(root);
  return records.sort((a, b) => a.path.localeCompare(b.path));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const index = process.argv.indexOf("--write");
  const output = index === -1 ? null : process.argv[index + 1];
  if (!output) {
    console.error("Usage: node scripts/snapshot-tree.mjs --write .pruner/before-snapshot.json");
    process.exit(2);
  }
  const target = resolve(output);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(await snapshotTree(resolve(import.meta.dirname, "..")), null, 2)}\n`, "utf8");
  console.log(target);
}
