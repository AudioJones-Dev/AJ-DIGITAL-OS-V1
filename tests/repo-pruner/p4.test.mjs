#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { buildSyncPlan, applySyncPlan } from "../../scripts/sync-agent-skill.mjs";
import { DMAIC_STATUSES } from "../../skills/repo-pruner/scripts/lib/constants.mjs";
import { compareSnapshots, snapshotSourceTree } from "../../skills/repo-pruner/scripts/lib/snapshot.mjs";
import { APPROVED_MATRIX, certifyParity, commandExecutable, commandInvocation, parseWindowsRelease } from "./parity-harness.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const sourceFixture = resolve(repositoryRoot, "fixtures/pruner-lab");
const temporaryRoot = await mkdtemp(join(tmpdir(), "repo-pruner-p4-test-"));
if (!basename(temporaryRoot).startsWith("repo-pruner-p4-test-")) throw new Error(`unsafe-temporary-root:${temporaryRoot}`);

process.env.npm_config_offline = "true";
process.env.HTTP_PROXY = "http://127.0.0.1:9";
process.env.HTTPS_PROXY = "http://127.0.0.1:9";
process.env.NO_PROXY = "*";

async function copyFixture(target) {
  await cp(sourceFixture, target, { recursive: true, filter: (source) => !source.replaceAll("\\", "/").includes("/.pruner/") });
}

function initializeFixture(target) {
  execFileSync("git", ["init", "--quiet", target], { stdio: "ignore" });
  execFileSync("git", ["-C", target, "config", "user.email", "fixture@example.invalid"]);
  execFileSync("git", ["-C", target, "config", "user.name", "Fixture"]);
  execFileSync("git", ["-C", target, "config", "core.autocrlf", "false"]);
  execFileSync("git", ["-C", target, "add", "."]);
  execFileSync("git", ["-C", target, "commit", "--quiet", "-m", "fixture baseline"]);
}

function runPruner(target, extra = []) {
  return spawnSync(process.execPath, [resolve(repositoryRoot, "skills/repo-pruner/scripts/run-pruner.mjs"), "--repo", target, ...extra], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
}

try {
  assert.equal(commandExecutable("npm", "win32"), "npm.cmd", "T6 must resolve npm through its Windows command shim");
  assert.equal(commandExecutable("claude", "win32"), "claude.cmd", "T6 must resolve Claude through its Windows command shim");
  assert.equal(commandExecutable("codex", "win32"), "codex.cmd", "T6 must resolve Codex through its Windows command shim");
  assert.equal(commandExecutable("git", "win32"), "git", "T6 must not rewrite native Windows executables");
  assert.equal(commandExecutable("npm", "linux"), "npm", "T6 must preserve command names off Windows");
  assert.deepEqual(commandInvocation("npm", ["--version"], "win32", "C:\\Windows\\System32\\cmd.exe"), {
    file: "C:\\Windows\\System32\\cmd.exe",
    args: ["/d", "/s", "/c", "npm.cmd", "--version"],
  }, "T6 must execute Windows command shims through the command processor");
  assert.equal(parseWindowsRelease("Microsoft Windows [Version 10.0.26200.8973]"), "10.0.26200.8973", "T6 must retain the Windows update build number");

  const portfolio = join(temporaryRoot, "portfolio");
  await copyFixture(portfolio);
  initializeFixture(portfolio);
  const registryPath = join(portfolio, ".dmaic/components.yaml");
  const registryBefore = await readFile(registryPath, "utf8");
  const sourceBefore = await snapshotSourceTree(portfolio);
  const portfolioRun = runPruner(portfolio);
  assert.equal(portfolioRun.status, 0, `P4 portfolio run failed: ${portfolioRun.stderr}`);
  const portfolioManifest = JSON.parse(portfolioRun.stdout);
  assert.equal(portfolioManifest.package_phase, "P4");
  assert.equal(portfolioManifest.evidence_artifact, ".pruner/sprint-minus-1-inventory.md");
  assert.ok(portfolioManifest.detectors.some((detector) => detector.detector === "tsc" && detector.version === "5.9.3"), "P4 manifest must record the pinned tsc health adapter");
  assert.equal(await readFile(registryPath, "utf8"), registryBefore, "T4 registry bytes changed");
  assert.deepEqual(compareSnapshots(sourceBefore, await snapshotSourceTree(portfolio)), [], "T1 P4 portfolio changed source bytes");

  const inventory = await readFile(join(portfolio, ".pruner/sprint-minus-1-inventory.md"), "utf8");
  assert.match(inventory, /Inventory gate: INCOMPLETE — review and governance update required\./u);
  assert.doesNotMatch(inventory, /Sprint -1[^\n]*(?:PASS|PASSED)/iu, "T5 inventory must never claim a pass");
  const tableLines = inventory.split(/\r?\n/u).filter((line) => line.startsWith("| "));
  const headers = tableLines[0].split("|").slice(1, -1).map((cell) => cell.trim());
  assert.deepEqual(headers, ["Component", "Current state", "Intended state", "Gap analysis", "Risk level", "Broken dependencies", "Duplicate logic", "Required tests", "Stabilization actions", "Decision", "current_status", "recommended_status"]);
  const rows = tableLines.slice(1).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  assert.equal(rows.length, 3, "T5 inventory must emit one row per registered component");
  for (const row of rows) {
    assert.equal(row.length, 12, "T5 inventory row is incomplete");
    assert.ok(DMAIC_STATUSES.includes(row[10]), `T4 invalid current_status: ${row[10]}`);
    assert.ok(DMAIC_STATUSES.includes(row[11]), `T4 invalid recommended_status: ${row[11]}`);
    assert.ok(row.slice(0, 10).every((cell) => cell.length > 0), "T5 inventory contains an empty required field");
    assert.match(row[1], /\[registry:/u, "T5 current-state provenance missing");
    assert.match(row[2], /\[registry:/u, "T5 intended-state provenance missing");
    assert.ok(row.slice(3, 10).every((cell) => /\[findings:/u.test(cell)), "T5 findings provenance missing");
  }

  const component = join(temporaryRoot, "component");
  await copyFixture(component);
  initializeFixture(component);
  const base = execFileSync("git", ["-C", component, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const configPath = join(component, ".pruner.yml");
  await writeFile(configPath, (await readFile(configPath, "utf8")).replace("base_ref: origin/main", `base_ref: ${base}`), "utf8");
  const cyclePath = join(component, "src/cycle/a.ts");
  await writeFile(cyclePath, `${await readFile(cyclePath, "utf8")}\n// P4 component measure change\n`, "utf8");
  execFileSync("git", ["-C", component, "add", ".pruner.yml", "src/cycle/a.ts"]);
  execFileSync("git", ["-C", component, "commit", "--quiet", "-m", "component measure change"]);
  const componentBefore = await snapshotSourceTree(component);
  const componentRun = runPruner(component, ["--scope", "component"]);
  assert.equal(componentRun.status, 0, `P4 component run failed: ${componentRun.stderr}`);
  const componentManifest = JSON.parse(componentRun.stdout);
  assert.equal(componentManifest.evidence_artifact, ".pruner/measure.md");
  const measure = await readFile(join(component, ".pruner/measure.md"), "utf8");
  for (const expected of ["Repository commit:", "Base ref:", "Changed-surface command:", "## Detector versions", "## Health evidence", "TypeScript baseline:", ".pruner/raw/tsc.txt", "## Findings", "src/cycle/a.ts", "reverify.mjs"]) {
    assert.ok(measure.includes(expected), `P4 measure missing ${expected}`);
  }
  assert.doesNotMatch(measure, /(?:^|\n)(?:Proposed remediation|Effort estimate|Implementation plan):/u);
  assert.deepEqual(compareSnapshots(componentBefore, await snapshotSourceTree(component)), [], "T1 P4 component changed source bytes");

  const liveTarget = join(temporaryRoot, "synthetic-live-target");
  await copyFixture(liveTarget);
  const livePackagePath = join(liveTarget, "package.json");
  const livePackage = JSON.parse(await readFile(livePackagePath, "utf8"));
  livePackage.name = "synthetic-typescript-repository";
  delete livePackage.repoPrunerFixture;
  await writeFile(livePackagePath, `${JSON.stringify(livePackage, null, 2)}\n`, "utf8");
  await rm(join(liveTarget, "EXPECTED.json"));
  initializeFixture(liveTarget);

  const missingLiveFlag = runPruner(liveTarget, ["--scope", "portfolio"]);
  assert.equal(missingLiveFlag.status, 2, "non-fixture run must fail without explicit live flag");
  assert.match(missingLiveFlag.stderr, /live-repository-flag-required/u);
  assert.equal(missingLiveFlag.stdout, "", "blocked live preflight must not emit a success manifest");

  const missingLiveScope = runPruner(liveTarget, ["--live-repository"]);
  assert.equal(missingLiveScope.status, 2, "non-fixture run must fail without explicit scope");
  assert.match(missingLiveScope.stderr, /explicit-scope-required-for-live-run/u);

  const nestedLiveTarget = runPruner(join(liveTarget, "src"), ["--scope", "portfolio", "--live-repository"]);
  assert.equal(nestedLiveTarget.status, 2, "non-fixture target must equal its Git root");
  assert.match(nestedLiveTarget.stderr, /target-must-equal-git-root/u);

  const liveBefore = await snapshotSourceTree(liveTarget);
  const authorizedLiveRun = runPruner(liveTarget, ["--scope", "portfolio", "--live-repository"]);
  assert.equal(authorizedLiveRun.status, 0, `authorized synthetic non-fixture run failed: ${authorizedLiveRun.stderr}`);
  const liveManifest = JSON.parse(authorizedLiveRun.stdout);
  assert.equal(liveManifest.target_type, "live");
  assert.equal(liveManifest.outcome, "complete");
  assert.deepEqual(compareSnapshots(liveBefore, await snapshotSourceTree(liveTarget)), [], "authorized synthetic live run changed source bytes");

  const syncRoot = join(temporaryRoot, "sync-root");
  await mkdir(join(syncRoot, "skills/repo-pruner/node_modules/ignored"), { recursive: true });
  await writeFile(join(syncRoot, "skills/repo-pruner/SKILL.md"), "---\nname: repo-pruner\ndescription: fixture\n---\n", "utf8");
  await writeFile(join(syncRoot, "skills/repo-pruner/node_modules/ignored/package.json"), "{}\n", "utf8");
  const missingPlan = await buildSyncPlan(syncRoot, "repo-pruner");
  assert.ok(missingPlan.destinations.every((destination) => destination.state === "missing"), "sync preflight should report missing destinations");
  await applySyncPlan(missingPlan);
  const installedPlan = await buildSyncPlan(syncRoot, "repo-pruner");
  assert.ok(installedPlan.destinations.every((destination) => destination.state === "identical"), "sync apply did not create identical copies");
  assert.equal(installedPlan.destinations[0].hash, installedPlan.source_hash);
  assert.equal(installedPlan.destinations[1].hash, installedPlan.source_hash);
  await assert.rejects(() => readFile(join(syncRoot, ".agents/skills/repo-pruner/node_modules/ignored/package.json")), /ENOENT/u, "sync copied excluded node_modules");
  await writeFile(join(syncRoot, ".agents/skills/repo-pruner/SKILL.md"), "divergent\n", "utf8");
  const divergentPlan = await buildSyncPlan(syncRoot, "repo-pruner");
  await assert.rejects(() => applySyncPlan(divergentPlan), /refuses-divergent-destination/u, "sync apply must fail closed on divergence");
  assert.equal(await readFile(join(syncRoot, ".agents/skills/repo-pruner/SKILL.md"), "utf8"), "divergent\n", "sync overwrote a divergent destination");

  const parityArtifacts = {};
  for (const host of ["claude", "codex", "cursor"]) {
    const path = join(temporaryRoot, `${host}-findings.jsonl`);
    await writeFile(path, "{\"id\":\"fixture\"}\n", "utf8");
    parityArtifacts[host] = path;
  }
  const parity = await certifyParity({
    artifacts: parityArtifacts,
    environment: { ...APPROVED_MATRIX, os_release: "10.0.26200.9999", cursor: "fixture-version" },
    fixtureCommit: "fixture-commit",
    configBytes: Buffer.from("fixture-config\n"),
    lockfileBytes: Buffer.from("fixture-lock\n"),
  });
  assert.equal(parity.certification, "passed", `T6 harness rejected the approved matrix: ${parity.problems.join(",")}`);
  await writeFile(parityArtifacts.cursor, "{\"id\":\"different\"}\n", "utf8");
  const mismatch = await certifyParity({
    artifacts: parityArtifacts,
    environment: { ...APPROVED_MATRIX, os_release: "10.0.26200.9999", cursor: "fixture-version" },
    fixtureCommit: "fixture-commit",
    configBytes: Buffer.from("fixture-config\n"),
    lockfileBytes: Buffer.from("fixture-lock\n"),
  });
  assert.equal(mismatch.certification, "failed");
  assert.ok(mismatch.problems.includes("findings-byte-parity-mismatch"), "T6 harness did not fail on divergent findings bytes");

  console.log("repo-pruner P4 tests: T1, T4, T5, T6 harness, component Measure, synthetic live-target authorization, and sync fail-closed contract passed");
} finally {
  const resolved = resolve(temporaryRoot);
  if (resolved.startsWith(resolve(tmpdir())) && basename(resolved).startsWith("repo-pruner-p4-test-")) await rm(resolved, { recursive: true, force: true });
}
