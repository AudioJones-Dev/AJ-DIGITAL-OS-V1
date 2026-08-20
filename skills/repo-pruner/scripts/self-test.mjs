#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { assertCleanBaseline } from "./lib/git.mjs";
import { DEFAULT_CONFIG, resolveConfigObject } from "./lib/config.mjs";
import { assertPrunerOutput, writePrunerFile } from "./lib/output.mjs";
import { normalizeRegistryObject } from "./lib/registry.mjs";
import { compareSnapshots, snapshotSourceTree } from "./lib/snapshot.mjs";
import { serializeFindings, stableFindingId } from "./lib/stable.mjs";

const root = await mkdtemp(join(tmpdir(), "repo-pruner-p1-"));
if (!basename(root).startsWith("repo-pruner-p1-")) throw new Error(`unsafe-temp-root:${root}`);

try {
  const missingConfig = resolveConfigObject(null);
  assert.deepEqual(missingConfig.config, DEFAULT_CONFIG, "missing config must use documented defaults");
  assert.deepEqual(missingConfig.notices, ["missing-config-using-defaults"]);
  assert.throws(() => resolveConfigObject({ version: 1, scope: "component", output_dir: ".dmaic" }), /invalid-output-dir/u);

  const legacy = { version: 1, components: [{ id: "core", paths: ["src/**"], status: "Canonical", owner: "owner@example.invalid" }] };
  const explicitFalse = { version: 1, components: [{ id: "core", paths: ["src/**"], test_paths: [], status: "Canonical", owner: "owner@example.invalid", protected: false }] };
  assert.deepEqual(normalizeRegistryObject(legacy), normalizeRegistryObject(explicitFalse), "T12 legacy registry must normalize identically");
  assert.equal(normalizeRegistryObject({ version: 1, components: [{ ...legacy.components[0], protected: true, protection_reason: "source of truth" }] }).components[0].protected, true);
  assert.throws(() => normalizeRegistryObject({ version: 1, components: [{ ...legacy.components[0], protected: "true" }] }), /invalid-component-protected/u);
  assert.throws(() => normalizeRegistryObject({ version: 1, components: [{ ...legacy.components[0], protected: true }] }), /missing-protection-reason/u);

  const baseFinding = {
    detector: "jscpd",
    kind: "duplication",
    locations: [
      { path: "src/b.ts", line_start: 2, line_end: 4, path_class: "code", component_id: null, protected: false },
      { path: "src/a.ts", line_start: 1, line_end: 3, path_class: "code", component_id: null, protected: false },
    ],
    evidence: { token_similarity: 0.9, duplicated_lines: 3 },
  };
  const id = stableFindingId(baseFinding);
  const findingA = { ...baseFinding, id, classification: "needs-decision", confidence: 0.8, blast_radius: { public_api_touched: false, dependents: 0, files: 2 }, current_component_status: null, recommended_status: "Needs Refactor", rules_applied: ["z", "a"], verify_cmd: "node reverify.mjs" };
  const findingB = { verify_cmd: "node reverify.mjs", rules_applied: ["a", "z"], recommended_status: "Needs Refactor", current_component_status: null, blast_radius: { files: 2, dependents: 0, public_api_touched: false }, confidence: 0.8, classification: "needs-decision", id, evidence: { duplicated_lines: 3, token_similarity: 0.9 }, locations: [...baseFinding.locations].reverse(), kind: "duplication", detector: "jscpd" };
  assert.equal(serializeFindings([findingA]), serializeFindings([findingB]), "T13 object and array order must not change bytes");
  assert.equal(serializeFindings([findingA, { ...findingA, id: "dup-zzzz" }]), serializeFindings([{ ...findingB, id: "dup-zzzz" }, findingB]), "T13 shuffled records must not change bytes");

  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");
  const before = await snapshotSourceTree(root);
  await writePrunerFile(root, ".pruner/run-manifest.json", "{}\n");
  const afterAllowed = await snapshotSourceTree(root);
  assert.deepEqual(compareSnapshots(before, afterAllowed), [], "T1 .pruner writes must not alter the source snapshot");
  await writeFile(join(root, "src", "index.ts"), "export const value = 2;\n", "utf8");
  const afterSourceWrite = await snapshotSourceTree(root);
  assert.deepEqual(compareSnapshots(before, afterSourceWrite), ["src/index.ts"], "T1 source mutation must be detected");
  assert.throws(() => assertPrunerOutput(root, ".dmaic/inventory.md"), /output-outside-pruner/u);
  assert.throws(() => assertPrunerOutput(root, ".pruner/unapproved.txt"), /output-not-allowlisted/u);

  const gitRoot = join(root, "git-fixture");
  await mkdir(gitRoot);
  execFileSync("git", ["init", "--quiet", gitRoot], { stdio: "ignore" });
  execFileSync("git", ["-C", gitRoot, "config", "user.email", "fixture@example.invalid"]);
  execFileSync("git", ["-C", gitRoot, "config", "user.name", "Fixture"]);
  await writeFile(join(gitRoot, "tracked.txt"), "clean\n", "utf8");
  execFileSync("git", ["-C", gitRoot, "add", "tracked.txt"]);
  execFileSync("git", ["-C", gitRoot, "commit", "--quiet", "-m", "fixture baseline"]);
  assert.doesNotThrow(() => assertCleanBaseline(gitRoot), "T14 clean baseline must pass");
  await writeFile(join(gitRoot, "tracked.txt"), "dirty\n", "utf8");
  assert.throws(() => assertCleanBaseline(gitRoot), /dirty-baseline/u, "T14 dirty baseline must stop");

  console.log("repo-pruner P1 self-test: T1, T12, T13, T14 passed");
} finally {
  const resolved = resolve(root);
  if (resolved.startsWith(resolve(tmpdir())) && basename(resolved).startsWith("repo-pruner-p1-")) {
    await rm(resolved, { recursive: true, force: true });
  }
}
