import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { ALLOWED_OUTPUTS } from "./constants.mjs";

export function assertPrunerOutput(repoRoot, candidate) {
  const root = resolve(repoRoot);
  const outputRoot = resolve(root, ".pruner");
  const target = resolve(root, candidate);
  const rel = relative(outputRoot, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || target === outputRoot) throw new Error(`output-outside-pruner:${candidate}`);
  const repoRelative = relative(root, target).split(sep).join("/");
  if (!ALLOWED_OUTPUTS.includes(repoRelative) && !repoRelative.startsWith(".pruner/raw/")) {
    throw new Error(`output-not-allowlisted:${candidate}`);
  }
  return target;
}

export async function writePrunerFile(repoRoot, candidate, contents) {
  const target = assertPrunerOutput(repoRoot, candidate);
  await mkdir(dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  await writeFile(temp, contents, "utf8");
  await rename(temp, target);
  return target;
}
