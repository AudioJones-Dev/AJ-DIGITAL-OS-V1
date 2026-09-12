#!/usr/bin/env node
import { resolve } from "node:path";
import { DEFAULT_CONFIG } from "./lib/config.mjs";
import { runDetectorAdapters } from "./lib/adapters/index.mjs";
import { assertPrunerLab } from "./lib/fixture.mjs";
import { writePrunerFile } from "./lib/output.mjs";
import { serializeNormalizedRecords, validateNormalizedRecord } from "./lib/records.mjs";
import { compareSnapshots, snapshotSourceTree } from "./lib/snapshot.mjs";
import { CERTIFICATION_ARCH, CERTIFICATION_NODE, CERTIFICATION_PLATFORM, PACKAGE_PHASE } from "./lib/constants.mjs";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};
const valuesAfter = (flag) => args.flatMap((value, index) =>
  value === flag && args[index + 1] ? [args[index + 1]] : []);

const repoRoot = await assertPrunerLab(resolve(valueAfter("--repo") ?? process.cwd()));
const changedPaths = valuesAfter("--changed-path");
const before = await snapshotSourceTree(repoRoot);
let result;

try {
  result = await runDetectorAdapters(repoRoot, DEFAULT_CONFIG, {
    changedPaths: changedPaths.length ? changedPaths : null,
  });
  const invalid = result.records
    .map((record) => ({ id: record.id, problems: validateNormalizedRecord(record) }))
    .filter((record) => record.problems.length > 0);
  if (invalid.length) throw new Error(`invalid-normalized-records:${JSON.stringify(invalid)}`);
  await writePrunerFile(
    repoRoot,
    ".pruner/raw/normalized-records.jsonl",
    serializeNormalizedRecords(result.records),
  );
} catch (error) {
  await writePrunerFile(repoRoot, ".pruner/raw/adapter-run.json", `${JSON.stringify({
    package_phase: PACKAGE_PHASE,
    outcome: "blocked",
    reason: error.message,
    detector_execution_started: true,
    actionable_findings_emitted: 0,
  }, null, 2)}\n`);
  throw error;
}

const after = await snapshotSourceTree(repoRoot);
const changedSourcePaths = compareSnapshots(before, after);
if (changedSourcePaths.length) {
  await writePrunerFile(repoRoot, ".pruner/raw/adapter-run.json", `${JSON.stringify({
    package_phase: PACKAGE_PHASE,
    outcome: "invalid",
    reason: "out-of-boundary-write",
    changed_source_paths: changedSourcePaths,
    detector_execution_started: true,
    actionable_findings_emitted: 0,
  }, null, 2)}\n`);
  throw new Error(`out-of-boundary-write:${changedSourcePaths.join("|")}`);
}

const summary = {
  package_phase: PACKAGE_PHASE,
  outcome: "complete",
  reason: "p2-fixture-adapters-complete-p3-classification-not-run",
  detector_execution_started: true,
  actionable_findings_emitted: 0,
  analysis_scope: result.analysis_scope,
  emission_scope: result.emission_scope,
  analyzed_record_count: result.analyzed_record_count,
  emitted_record_count: result.emitted_record_count,
  dropped_records: result.dropped_records,
  adapters: result.metadata,
  runtime: {
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    certification_eligible:
      process.versions.node === CERTIFICATION_NODE
      && process.platform === CERTIFICATION_PLATFORM
      && process.arch === CERTIFICATION_ARCH,
  },
};
await writePrunerFile(repoRoot, ".pruner/raw/adapter-run.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
