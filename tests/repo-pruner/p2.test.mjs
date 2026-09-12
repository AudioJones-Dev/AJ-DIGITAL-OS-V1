#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "../../skills/repo-pruner/scripts/lib/config.mjs";
import { runDetectorAdapters } from "../../skills/repo-pruner/scripts/lib/adapters/index.mjs";
import { measureEslint } from "../../skills/repo-pruner/scripts/lib/adapters/eslint.mjs";
import { assertPinnedPackage, createDetectorEnvironment, runPackageCli } from "../../skills/repo-pruner/scripts/lib/detector-runtime.mjs";
import { filterComponentRecords, serializeNormalizedRecords, validateNormalizedRecord } from "../../skills/repo-pruner/scripts/lib/records.mjs";
import { compareSnapshots, snapshotSourceTree } from "../../skills/repo-pruner/scripts/lib/snapshot.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const sourceFixture = resolve(repositoryRoot, "fixtures/pruner-lab");
const temporaryRoot = await mkdtemp(join(tmpdir(), "repo-pruner-p2-test-"));
if (!basename(temporaryRoot).startsWith("repo-pruner-p2-test-")) {
  throw new Error(`unsafe-temporary-root:${temporaryRoot}`);
}
const fixture = join(temporaryRoot, "pruner-lab");

const pathSet = (record) => new Set(record.locations.map((location) => location.path));
const findRecord = (records, kind, path) =>
  records.find((record) => record.kind === kind && pathSet(record).has(path));

process.env.npm_config_offline = "true";
process.env.HTTP_PROXY = "http://127.0.0.1:9";
process.env.HTTPS_PROXY = "http://127.0.0.1:9";
process.env.NO_PROXY = "*";

try {
  const detectorEnvironment = createDetectorEnvironment({
    PATH: "fixture-path",
    TEMP: "fixture-temp",
    HTTP_PROXY: "http://127.0.0.1:9",
    CLAUDECODE: "1",
    CODEX_SANDBOX: "workspace-write",
    CURSOR_TRACE_ID: "fixture-trace",
    NODE_OPTIONS: "--require host-hook.cjs",
    CI: "false",
  });
  assert.equal(detectorEnvironment.PATH, "fixture-path");
  assert.equal(detectorEnvironment.HTTP_PROXY, "http://127.0.0.1:9");
  assert.equal(detectorEnvironment.CI, "1");
  for (const hostVariable of ["CLAUDECODE", "CODEX_SANDBOX", "CURSOR_TRACE_ID", "NODE_OPTIONS"]) {
    assert.equal(detectorEnvironment[hostVariable], undefined, `T6 detector environment leaked ${hostVariable}`);
  }

  await cp(sourceFixture, fixture, {
    recursive: true,
    filter: (source) => !source.replaceAll("\\", "/").includes("/.pruner/"),
  });
  const knipConfig = JSON.parse(await readFile(join(fixture, "knip.json"), "utf8"));
  assert.deepEqual(knipConfig.entry, ["src/index.ts!"], "T2 Knip entry must be an explicit traversal root that skips entry-export analysis");
  const entryReachableFixtureFiles = [
    "src/components/MegaDashboard.tsx",
    "src/lib/finance-round.ts",
    "src/lib/quote-round.ts",
  ];
  for (const path of entryReachableFixtureFiles) {
    assert.ok(!knipConfig.ignore?.includes(path), `T2 Knip must not remove entry-reachable file ${path} from its graph`);
    assert.deepEqual(knipConfig.ignoreIssues?.[path], ["exports"], `T2 Knip must suppress only intentional export noise for ${path}`);
  }
  const before = await snapshotSourceTree(fixture);
  const result = await runDetectorAdapters(fixture, DEFAULT_CONFIG);
  const after = await snapshotSourceTree(fixture);

  assert.deepEqual(compareSnapshots(before, after), [], "T1 detectors must write only under .pruner/");
  assert.equal(result.analysis_scope, "full-repository-graph");
  assert.ok(result.dropped_records > 0, "T2 dropped raw records must be counted");
  for (const record of result.records) {
    assert.deepEqual(validateNormalizedRecord(record), [], `T2 invalid normalized record: ${record.id}`);
    assert.match(record.verify_cmd, /^node skills\/repo-pruner\/scripts\/reverify\.mjs --record-id \S+ --config \.pruner\.yml$/u);
  }
  const expectedIds = result.records.map((record) => record.id);
  const expectedBytes = serializeNormalizedRecords(result.records);
  for (let run = 2; run <= 5; run += 1) {
    const rerun = await runDetectorAdapters(fixture, DEFAULT_CONFIG);
    assert.deepEqual(
      rerun.records.map((record) => record.id),
      expectedIds,
      `T2 normalized record ids changed on consecutive run ${run}`,
    );
    assert.equal(
      serializeNormalizedRecords(rerun.records),
      expectedBytes,
      `T2 normalized JSONL bytes changed on consecutive run ${run}`,
    );
  }
  const knipMetadata = result.metadata.find((item) => item.detector === "knip");
  assert.equal(knipMetadata.stability_policy, "two-matching-noncontradictory-runs", "T2 Knip must fail closed unless two measurements agree with the dependency graph");
  assert.ok(knipMetadata.command.includes("--no-gitignore"), "T2 Knip must not inherit host or parent Git-ignore state");
  assert.ok(knipMetadata.command.includes("--tsConfig"), "T2 Knip must resolve the TypeScript graph through an explicit tsconfig");

  const bareTree = await runPackageCli({
    packageName: "madge",
    args: ["--json", "src"],
    cwd: fixture,
  });
  const bareCycles = await runPackageCli({
    packageName: "madge",
    args: ["--circular", "--json", "src"],
    cwd: fixture,
  });
  assert.deepEqual(JSON.parse(bareTree.stdout), {}, "A2.1 missing TypeScript flags must measure an empty graph");
  assert.deepEqual(JSON.parse(bareCycles.stdout), [], "A2.1 missing TypeScript flags must miss the seeded cycle");
  const madgeMetadata = result.metadata.find((item) => item.detector === "madge");
  assert.ok(madgeMetadata.graph_nodes > 0, "A2.1 typed dependency tree must be non-empty");
  for (const invocation of madgeMetadata.commands) {
    assert.ok(invocation.command.includes("--ts-config"), "A2.1 Madge command must include --ts-config");
    assert.ok(invocation.command.includes("--extensions"), "A2.1 Madge command must include --extensions");
  }
  const cycle = findRecord(result.records, "cycle", "src/cycle/a.ts");
  assert.ok(cycle && pathSet(cycle).has("src/cycle/b.ts"), "A2.1 seeded TypeScript cycle must be retained");

  const defaultParser = await measureEslint(fixture, DEFAULT_CONFIG.detectors.eslint, {
    useTypeScriptParser: false,
  });
  const defaultMessages = defaultParser.results.flatMap((item) => item.messages);
  assert.ok(defaultMessages.some((message) => message.ruleId === null), "A2.2 default parser must surface a parse error");
  const eslintMetadata = result.metadata.find((item) => item.detector === "eslint");
  assert.equal(eslintMetadata.parse_errors, 0, "A2.2 adapter must fail closed instead of accepting parse errors");
  assert.equal(eslintMetadata.parser.name, "@typescript-eslint/parser");
  const oversized = findRecord(result.records, "oversized", "src/components/MegaDashboard.tsx");
  assert.equal(oversized?.evidence.lines, 900, "A2.2 max-lines signal must record 900 lines");
  const complexity = findRecord(result.records, "complexity", "src/components/MegaDashboard.tsx");
  assert.equal(complexity?.evidence.cyclomatic_complexity, 17, "A2.2 cyclomatic complexity must be recorded");
  assert.equal(complexity?.evidence.cognitive_complexity, 40, "A2.2 cognitive complexity must be recorded separately");

  const jscpdMetadata = result.metadata.find((item) => item.detector === "jscpd");
  assert.ok(!jscpdMetadata.command.includes("--format"), "A2.3 jscpd must not require an explicit Markdown format");
  const markdownDuplicates = result.records.filter((record) =>
    record.detector === "jscpd" && record.evidence.format === "markdown");
  assert.ok(
    markdownDuplicates.some((record) => pathSet(record).has("docs/architecture.md")),
    "A2.3 documentation duplication must appear in raw normalized output",
  );
  assert.ok(
    markdownDuplicates.some((record) => pathSet(record).has("prompts/reviewer.prompt.md")),
    "A2.3 prompt duplication must appear in raw normalized output",
  );

  const protectedRawPaths = [
    "skills/obsolete-exporter.mjs",
    ".dmaic/dead-hook.mjs",
    "graphify-out/cache-a.ts",
    ".augment/code-like.ts",
    "config/mixed-copy.ts",
  ];
  for (const path of protectedRawPaths) {
    assert.ok(
      result.records.some((record) => pathSet(record).has(path)),
      `P2 must retain protected raw evidence for P3 classification: ${path}`,
    );
  }
  assert.ok(
    result.records.some((record) =>
      record.kind === "duplication"
      && pathSet(record).has("graphify-out/cache-a.ts")
      && pathSet(record).has("graphify-out/cache-b.ts")),
    "P2 must retain the graphify-out protected duplication for P3",
  );
  assert.ok(
    result.records.some((record) =>
      record.kind === "duplication"
      && pathSet(record).has("config/mixed-copy.ts")
      && pathSet(record).has("src/lib/mixed-copy.ts")),
    "P2 must retain both halves of the mixed code/protected duplication for P3",
  );
  assert.ok(
    result.records.some((record) =>
      record.kind === "duplication"
      && pathSet(record).has("src/lib/finance-round.ts")
      && pathSet(record).has("src/lib/quote-round.ts")),
    "P2 must retain the reason-annotated intentional duplication for P3",
  );

  const filtered = filterComponentRecords(result.records, ["src/cycle/a.ts"]);
  assert.equal(filtered.length, 1, "T11 component emission must exclude records outside the changed surface");
  assert.equal(filtered[0].kind, "cycle");
  assert.equal(filtered[0].primary_path, "src/cycle/a.ts");
  assert.ok(pathSet(filtered[0]).has("src/cycle/b.ts"), "T11 unchanged graph context must be retained");

  const emptyNodeModules = join(temporaryRoot, "empty-node-modules");
  await mkdir(emptyNodeModules);
  await assert.rejects(
    assertPinnedPackage("jscpd", { nodeModulesRoot: emptyNodeModules }),
    /missing-pinned-detector/u,
    "T7 missing local detector must fail closed",
  );

  const cli = spawnSync(process.execPath, [
    resolve(repositoryRoot, "skills/repo-pruner/scripts/run-adapters.mjs"),
    "--repo",
    fixture,
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(cli.status, 0, `P2 fixture CLI failed: ${cli.stderr}`);
  assert.equal(JSON.parse(cli.stdout).outcome, "complete");
  const emittedRecords = (await readFile(join(fixture, ".pruner/raw/normalized-records.jsonl"), "utf8"))
    .trim()
    .split(/\r?\n/u)
    .map((line) => JSON.parse(line));
  const cycleRecord = emittedRecords.find((record) => record.kind === "cycle");
  const reverify = spawnSync(process.execPath, [
    resolve(repositoryRoot, "skills/repo-pruner/scripts/reverify.mjs"),
    "--record-id",
    cycleRecord.id,
    "--config",
    ".pruner.yml",
    "--repo",
    fixture,
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(reverify.status, 0, `T2 reverification failed: ${reverify.stderr}`);
  assert.equal(JSON.parse(reverify.stdout).id, cycleRecord.id);

  console.log(`repo-pruner P2 tests: ${result.records.length} normalized records; T1, T2, T7, T11, A2.1-A2.3 passed`);
} finally {
  const resolved = resolve(temporaryRoot);
  if (resolved.startsWith(resolve(tmpdir())) && basename(resolved).startsWith("repo-pruner-p2-test-")) {
    await rm(resolved, { recursive: true, force: true });
  }
}
