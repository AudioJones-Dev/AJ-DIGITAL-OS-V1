import { existsSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { git } from "./git.mjs";

async function readManifest(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function isPrunerLab(root) {
  const expectedPath = resolve(root, "EXPECTED.json");
  const packagePath = resolve(root, "package.json");
  if (!existsSync(expectedPath) || !existsSync(packagePath)) return false;
  const manifest = await readManifest(packagePath);
  return manifest?.name === "pruner-lab" && manifest.repoPrunerFixture?.phase === "P0";
}

export async function assertPrunerLab(repoRoot) {
  const root = await realpath(resolve(repoRoot));
  if (!await isPrunerLab(root)) throw new Error("p2-fixture-only:missing-or-invalid-pruner-lab-markers");
  return root;
}

export async function resolvePrunerTarget(repoRoot, authorization = {}) {
  const root = await realpath(resolve(repoRoot));
  const gitRoot = await realpath(git(root, ["rev-parse", "--show-toplevel"]).trim());
  if (root.toLowerCase() !== gitRoot.toLowerCase()) throw new Error("target-must-equal-git-root");
  if (await isPrunerLab(root)) return { root, target_type: "fixture" };

  const packageManifest = await readManifest(new URL("../../package.json", import.meta.url));
  if (packageManifest?.repoPruner?.liveRepositoryRunAuthorized !== true) {
    throw new Error("live-repository-runs-not-authorized-by-package");
  }
  if (authorization.live_repository !== true) throw new Error("live-repository-flag-required");
  if (authorization.repo_explicit !== true) throw new Error("explicit-repo-required-for-live-run");
  if (authorization.scope_explicit !== true) throw new Error("explicit-scope-required-for-live-run");
  return { root, target_type: "live" };
}
