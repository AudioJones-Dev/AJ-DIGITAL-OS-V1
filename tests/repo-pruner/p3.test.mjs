#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { loadConfig, resolveConfigObject } from "../../skills/repo-pruner/scripts/lib/config.mjs";
import { runDetectorAdapters } from "../../skills/repo-pruner/scripts/lib/adapters/index.mjs";
import { classifyNormalizedRecords, validateFinding } from "../../skills/repo-pruner/scripts/lib/classifier.mjs";
import { loadRegistry } from "../../skills/repo-pruner/scripts/lib/registry.mjs";
import { hasValidAnnotation, scanPrunerAnnotations } from "../../skills/repo-pruner/scripts/lib/annotations.mjs";
import { compareSnapshots, snapshotSourceTree } from "../../skills/repo-pruner/scripts/lib/snapshot.mjs";
import { serializeFindings } from "../../skills/repo-pruner/scripts/lib/stable.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const sourceFixture = resolve(repositoryRoot, "fixtures/pruner-lab");
const temporaryRoot = await mkdtemp(join(tmpdir(), "repo-pruner-p3-test-"));
if (!basename(temporaryRoot).startsWith("repo-pruner-p3-test-")) throw new Error(`unsafe-temporary-root:${temporaryRoot}`);

const fixture = join(temporaryRoot, "classification-fixture");
const runnerFixture = join(temporaryRoot, "runner-fixture");
const componentFixture = join(temporaryRoot, "component-fixture");
const pathSet = (finding) => new Set(finding.locations.map((location) => location.path));
const matchCase = (findings, expected) => findings.find((finding) =>
  finding.kind === expected.kind
  && [...pathSet(finding)].some((path) => path.includes(expected.path_contains))
  && (!expected.requires_path_contains || [...pathSet(finding)].some((path) => path.includes(expected.requires_path_contains))));

process.env.npm_config_offline = "true";
process.env.HTTP_PROXY = "http://127.0.0.1:9";
process.env.HTTPS_PROXY = "http://127.0.0.1:9";
process.env.NO_PROXY = "*";

async function copyFixture(target) {
  await cp(sourceFixture, target, {
    recursive: true,
    filter: (source) => !source.replaceAll("\\", "/").includes("/.pruner/"),
  });
}

try {
  await copyFixture(fixture);
  const expected = JSON.parse(await readFile(join(fixture, "EXPECTED.json"), "utf8"));
  const before = await snapshotSourceTree(fixture);
  const { config } = await loadConfig(fixture);
  const registryResult = await loadRegistry(fixture, config.registry);
  assert.equal(registryResult.valid, true, `fixture registry failed: ${registryResult.reason}`);
  const adapterResult = await runDetectorAdapters(fixture, config);

  const invalidThreshold = structuredClone(config);
  invalidThreshold.thresholds.min_confidence_to_emit = "high";
  assert.throws(() => resolveConfigObject(invalidThreshold), /invalid-confidence-threshold/u, "P3 typed config must reject string thresholds");
  const invalidGlob = structuredClone(config);
  invalidGlob.path_classes.excluded_globs = [42];
  assert.throws(() => resolveConfigObject(invalidGlob), /invalid-excluded-globs/u, "P3 typed config must reject non-string globs");
  const unknownConfigKey = { ...structuredClone(config), surprise: true };
  assert.throws(() => resolveConfigObject(unknownConfigKey), /invalid-config-unknown-key/u, "P3 typed config must reject unknown root keys");
  const invalidTsc = structuredClone(config);
  invalidTsc.detectors.tsc.enabled = "yes";
  assert.throws(() => resolveConfigObject(invalidTsc), /invalid-detector-config:tsc\.enabled/u, "typed config must reject non-boolean tsc settings");
  const unratifiedTests = structuredClone(config);
  unratifiedTests.detectors.tests = { enabled: true, command: "npm test" };
  assert.throws(() => resolveConfigObject(unratifiedTests), /project-test-adapter-not-ratified-v1/u, "configured project tests must fail closed until a read-only adapter is ratified");

  const escapedRegistry = await loadRegistry(fixture, "../outside-components.yaml");
  assert.equal(escapedRegistry.valid, false, "P3 registry escape must fail closed");
  assert.equal(escapedRegistry.reason, "registry-outside-repository");

  const annotationScan = await scanPrunerAnnotations(fixture);
  const annotatedDuplicate = adapterResult.records.find((record) =>
    record.kind === "duplication"
    && pathSet(record).has("src/lib/finance-round.ts")
    && pathSet(record).has("src/lib/quote-round.ts"));
  assert.ok(annotatedDuplicate, "fixture must expose the valid annotated duplicate");
  assert.equal(hasValidAnnotation(annotatedDuplicate, annotationScan), true, "overlapping valid annotations must be honored");
  assert.equal(hasValidAnnotation({
    kind: "duplication",
    locations: [
      { path: "src/lib/finance-round.ts", line_start: 500, line_end: 520 },
      { path: "src/lib/quote-round.ts", line_start: 500, line_end: 520 },
    ],
  }, annotationScan), false, "distant annotations must not suppress unrelated duplicate ranges");

  const financeProbe = await classifyNormalizedRecords({
    repoRoot: fixture,
    records: [{
      id: "dead-finance-probe",
      detector: "knip",
      kind: "dead-code",
      primary_path: "src/lib/finance-calculator.ts",
      locations: [{ path: "src/lib/finance-calculator.ts", line_start: 1, line_end: 1 }],
      evidence: { issue_type: "unused-file", static_dependents: 0 },
      verify_cmd: "probe",
    }],
    config,
    registryResult,
    dependencyGraph: {},
  });
  const financeFinding = financeProbe.findings.find((finding) => finding.id === "dead-finance-probe");
  assert.equal(financeFinding?.classification, "needs-decision", "financial dead code must never be actionable");
  assert.equal(financeFinding?.blast_radius.public_api_touched, true, "financial dead code must mark the protected surface");

  const nonCodeExclusionProbe = await classifyNormalizedRecords({
    repoRoot: fixture,
    records: [{
      id: "dup-non-code-exclusion-probe",
      detector: "jscpd",
      kind: "duplication",
      primary_path: "package-lock.json",
      locations: [
        { path: "package-lock.json", line_start: 9, line_end: 31 },
        { path: "package.json", line_start: 11, line_end: 33 },
      ],
      evidence: { duplicated_lines: 23, duplicated_tokens: 80, format: "json" },
      verify_cmd: "probe",
    }],
    config,
    registryResult,
    dependencyGraph: {},
  });
  const nonCodeExclusionFinding = nonCodeExclusionProbe.findings.find((finding) => finding.id === "dup-non-code-exclusion-probe");
  assert.equal(nonCodeExclusionFinding?.classification, "excluded", "a non-code location must exclude the whole finding");
  assert.deepEqual(nonCodeExclusionFinding?.locations.map(({ path, path_class, protected: isProtected }) => ({
    path,
    path_class,
    protected: isProtected,
  })), [
    { path: "package-lock.json", path_class: "config", protected: false },
    { path: "package.json", path_class: "code", protected: false },
  ], "the regression probe must retain the original mixed config/code path classification");
  assert.deepEqual(nonCodeExclusionFinding?.rules_applied, ["non-code-location-exclusion"], "a non-code exclusion must name its deterministic rule");
  assert.deepEqual(validateFinding(nonCodeExclusionFinding), [], "a non-code exclusion must satisfy the finding invariant");

  const classified = await classifyNormalizedRecords({
    repoRoot: fixture,
    records: adapterResult.records,
    config,
    registryResult,
    dependencyGraph: adapterResult.dependency_graph,
  });
  const after = await snapshotSourceTree(fixture);

  assert.equal(classified.outcome, "complete");
  assert.deepEqual(compareSnapshots(before, after), [], "T1 P3 may write only under .pruner/");
  for (const finding of classified.findings) {
    assert.deepEqual(validateFinding(finding), [], `T2 invalid finding: ${finding.id}`);
  }

  const actualByCase = new Map();
  for (const item of expected.cases) {
    const finding = matchCase(classified.findings, item);
    assert.ok(finding, `missing expected P3 case ${item.id}: ${item.path_contains}`);
    actualByCase.set(item.id, finding);
    assert.equal(finding.classification, item.classification, `${item.id} classification mismatch`);
    if (item.recommended_status) assert.equal(finding.recommended_status, item.recommended_status, `${item.id} status mismatch`);
    if (item.public_api_touched !== undefined) assert.equal(finding.blast_radius.public_api_touched, item.public_api_touched, `${item.id} public surface mismatch`);
  }

  const liveT3 = expected.critical_order.map((id) => actualByCase.get(id).classification);
  assert.deepEqual(liveT3, ["excluded", "excluded", "needs-decision"], "T3 hard admission tuple must be exact");
  for (const id of ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]) {
    assert.notEqual(actualByCase.get(id).classification, "actionable", `T3 protected decoy ${id} became actionable`);
  }
  assert.equal(actualByCase.get("D3").blast_radius.public_api_touched, true, "T3 auth decoy must touch public API");
  assert.ok(actualByCase.get("D8").rules_applied.includes("mixed-location-most-conservative"), "T3 mixed finding must use conservative precedence");

  assert.ok(classified.findings.filter((finding) => finding.kind === "duplication").every((finding) => finding.classification !== "actionable"), "T8 duplication must never be actionable");
  assert.equal(actualByCase.get("C2").classification, "intentional", "valid reasoned annotation must be honored");
  assert.equal(actualByCase.get("C8").detector, "annotation-scanner", "T9 invalid annotation must be independently emitted");
  assert.ok(actualByCase.get("C8").rules_applied.includes("annotation-reason-required"), "T9 reason requirement rule missing");

  const componentConfig = { ...config, scope: "component" };
  const invalidRegistry = { valid: false, registry: null, reason: "registry-missing" };
  const componentFailClosed = await classifyNormalizedRecords({
    repoRoot: fixture,
    records: adapterResult.records,
    config: componentConfig,
    registryResult: invalidRegistry,
    dependencyGraph: adapterResult.dependency_graph,
  });
  assert.equal(componentFailClosed.outcome, "incomplete", "T10 component registry failure must be incomplete");
  assert.ok(componentFailClosed.findings.every((finding) => finding.classification !== "actionable"), "T10 component registry failure must emit no actionable findings");
  assert.ok(componentFailClosed.findings.every((finding) => finding.current_component_status === null), "T10 component statuses must be null without governance");

  const portfolioFailClosed = await classifyNormalizedRecords({
    repoRoot: fixture,
    records: adapterResult.records,
    config,
    registryResult: invalidRegistry,
    dependencyGraph: adapterResult.dependency_graph,
  });
  assert.equal(portfolioFailClosed.outcome, "blocked", "T10 portfolio registry failure must block");
  assert.deepEqual(portfolioFailClosed.findings, [], "T10 blocked portfolio must emit no findings");

  await writeFile(join(fixture, ".dmaic/invalid-components.yaml"), [
    "version: 1",
    "components:",
    "  - id: bad",
    "    paths: [\"src/**\"]",
    "    status: Canonical",
    "    owner: fixture@local.invalid",
    "    protected: \"true\"",
    "",
  ].join("\n"), "utf8");
  const invalidLoaded = await loadRegistry(fixture, ".dmaic/invalid-components.yaml");
  assert.equal(invalidLoaded.valid, false, "T10 truthy protected strings must invalidate registry");

  assert.equal(
    serializeFindings(classified.findings),
    serializeFindings([...classified.findings].reverse()),
    "T13 shuffled classifier input must serialize identically",
  );

  await copyFixture(runnerFixture);
  execFileSync("git", ["init", "--quiet", runnerFixture], { stdio: "ignore" });
  execFileSync("git", ["-C", runnerFixture, "config", "user.email", "fixture@example.invalid"]);
  execFileSync("git", ["-C", runnerFixture, "config", "user.name", "Fixture"]);
  execFileSync("git", ["-C", runnerFixture, "config", "core.autocrlf", "false"]);
  execFileSync("git", ["-C", runnerFixture, "add", "."]);
  execFileSync("git", ["-C", runnerFixture, "commit", "--quiet", "-m", "fixture baseline"]);
  const runnerBefore = await snapshotSourceTree(runnerFixture);
  const cli = spawnSync(process.execPath, [
    resolve(repositoryRoot, "skills/repo-pruner/scripts/run-pruner.mjs"),
    "--repo",
    runnerFixture,
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(cli.status, 0, `P3 fixture runner failed: ${cli.stderr}`);
  const manifest = JSON.parse(cli.stdout);
  assert.equal(manifest.package_phase, "P4");
  assert.equal(manifest.outcome, "complete");
  const runnerAfter = await snapshotSourceTree(runnerFixture);
  assert.deepEqual(compareSnapshots(runnerBefore, runnerAfter), [], "T1 fixture runner changed source bytes");
  const emitted = (await readFile(join(runnerFixture, ".pruner/findings.jsonl"), "utf8"))
    .trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
  const emittedT3 = expected.critical_order.map((id) => matchCase(emitted, expected.cases.find((item) => item.id === id)).classification);
  assert.deepEqual(emittedT3, ["excluded", "excluded", "needs-decision"], "live runner T3 tuple mismatch");
  const fixtureContract = spawnSync(process.execPath, [
    join(runnerFixture, "scripts/check-expected.mjs"),
    "--golden-only",
    "--findings", join(runnerFixture, ".pruner/findings.jsonl"),
  ], {
    cwd: runnerFixture,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(fixtureContract.status, 0, `fixture expected-output contract failed: ${fixtureContract.stderr}`);

  const authFinding = matchCase(emitted, expected.cases.find((item) => item.id === "D3"));
  const reverify = spawnSync(process.execPath, [
    resolve(repositoryRoot, "skills/repo-pruner/scripts/reverify.mjs"),
    "--id", authFinding.id,
    "--config", ".pruner.yml",
    "--repo", runnerFixture,
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(reverify.status, 0, `P3 finding reverification failed: ${reverify.stderr}`);
  assert.equal(JSON.parse(reverify.stdout).id, authFinding.id, "P3 reverification returned a different finding");

  await writeFile(join(runnerFixture, "src/index.ts"), "// dirty baseline seed\n", "utf8");
  const dirtyRun = spawnSync(process.execPath, [
    resolve(repositoryRoot, "skills/repo-pruner/scripts/run-pruner.mjs"),
    "--repo", runnerFixture,
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(dirtyRun.status, 2, "T14 dirty fixture baseline must stop");
  const dirtyManifest = JSON.parse(await readFile(join(runnerFixture, ".pruner/run-manifest.json"), "utf8"));
  assert.equal(dirtyManifest.reason, "dirty-baseline");
  assert.equal(dirtyManifest.detector_execution_started, false);
  assert.equal(await readFile(join(runnerFixture, ".pruner/findings.jsonl"), "utf8"), "", "T14 dirty baseline must clear stale findings");

  await copyFixture(componentFixture);
  execFileSync("git", ["init", "--quiet", componentFixture], { stdio: "ignore" });
  execFileSync("git", ["-C", componentFixture, "config", "user.email", "fixture@example.invalid"]);
  execFileSync("git", ["-C", componentFixture, "config", "user.name", "Fixture"]);
  execFileSync("git", ["-C", componentFixture, "config", "core.autocrlf", "false"]);
  execFileSync("git", ["-C", componentFixture, "add", "."]);
  execFileSync("git", ["-C", componentFixture, "commit", "--quiet", "-m", "component baseline"]);
  const componentBase = execFileSync("git", ["-C", componentFixture, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const componentConfigPath = join(componentFixture, ".pruner.yml");
  const componentConfigText = (await readFile(componentConfigPath, "utf8")).replace("base_ref: origin/main", `base_ref: ${componentBase}`);
  await writeFile(componentConfigPath, componentConfigText, "utf8");
  const changedCyclePath = join(componentFixture, "src/cycle/a.ts");
  await writeFile(changedCyclePath, `${await readFile(changedCyclePath, "utf8")}\n// component-scope changed side\n`, "utf8");
  execFileSync("git", ["-C", componentFixture, "add", ".pruner.yml", "src/cycle/a.ts"]);
  execFileSync("git", ["-C", componentFixture, "commit", "--quiet", "-m", "change one side of cycle"]);
  const componentBefore = await snapshotSourceTree(componentFixture);
  const componentRun = spawnSync(process.execPath, [
    resolve(repositoryRoot, "skills/repo-pruner/scripts/run-pruner.mjs"),
    "--repo", componentFixture,
    "--scope", "component",
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(componentRun.status, 0, `component fixture runner failed: ${componentRun.stderr}`);
  const componentManifest = JSON.parse(componentRun.stdout);
  assert.deepEqual(componentManifest.changed_paths, [".pruner.yml", "src/cycle/a.ts"], "component scope must derive the committed Git diff");
  assert.equal(componentManifest.analysis_scope, "full-repository-graph");
  const componentFindings = (await readFile(join(componentFixture, ".pruner/findings.jsonl"), "utf8"))
    .trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
  assert.equal(componentFindings.length, 1, "component scope must emit only findings whose primary location intersects the diff");
  assert.equal(componentFindings[0].kind, "cycle");
  assert.ok(pathSet(componentFindings[0]).has("src/cycle/a.ts"), "component finding must retain the changed side");
  assert.ok(pathSet(componentFindings[0]).has("src/cycle/b.ts"), "component finding must retain unchanged full-graph context");
  const componentAfter = await snapshotSourceTree(componentFixture);
  assert.deepEqual(compareSnapshots(componentBefore, componentAfter), [], "component runner must not modify source bytes");

  console.log(`repo-pruner P3 tests: ${classified.findings.length} findings; T3 tuple ${liveT3.join(", ")}; all 8 decoys, review regressions, T8, T9, T10, T11 passed`);
} finally {
  const resolved = resolve(temporaryRoot);
  if (resolved.startsWith(resolve(tmpdir())) && basename(resolved).startsWith("repo-pruner-p3-test-")) {
    await rm(resolved, { recursive: true, force: true });
  }
}
