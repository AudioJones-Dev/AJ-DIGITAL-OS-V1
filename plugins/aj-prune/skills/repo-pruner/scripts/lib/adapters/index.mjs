import { runEslintAdapter } from "./eslint.mjs";
import { runJscpdAdapter } from "./jscpd.mjs";
import { runKnipAdapter } from "./knip.mjs";
import { runMadgeAdapter } from "./madge.mjs";
import { filterComponentRecords, finalizeNormalizedRecords } from "../records.mjs";
import { stableCompare } from "../normalize.mjs";
import { runTscHealthAdapter } from "./tsc.mjs";
import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";

const KNIP_STABILITY_MATCHES = 2;
const KNIP_MAX_ATTEMPTS = 16;

const knipSignature = (result) => JSON.stringify(finalizeNormalizedRecords(result.records));

function findKnipGraphContradictions(knip, madge) {
  const importedPaths = new Set(Object.values(madge?.dependency_graph ?? {}).flat());
  return knip.records
    .filter((record) => record.kind === "dead-code"
      && record.evidence.issue_type === "unused-file"
      && importedPaths.has(record.locations[0].path))
    .map((record) => record.locations[0].path)
    .sort(stableCompare);
}

async function stabilizeKnip(repoRoot, initialKnip, madge) {
  let candidate = initialKnip;
  let previousSignature = null;
  let matchingRuns = 0;
  let lastContradictions = [];
  const attempts = [];

  for (let attempt = 1; attempt <= KNIP_MAX_ATTEMPTS; attempt += 1) {
    lastContradictions = findKnipGraphContradictions(candidate, madge);
    if (lastContradictions.length === 0) {
      const signature = knipSignature(candidate);
      attempts.push(createHash("sha256").update(signature).digest("hex").slice(0, 12));
      matchingRuns = signature === previousSignature ? matchingRuns + 1 : 1;
      previousSignature = signature;
      if (matchingRuns === KNIP_STABILITY_MATCHES) {
        return {
          ...candidate,
          metadata: {
            ...candidate.metadata,
            stability_policy: "two-matching-noncontradictory-runs",
          },
        };
      }
    } else {
      attempts.push(`contradiction:${lastContradictions.join(",")}`);
      previousSignature = null;
      matchingRuns = 0;
    }
    if (attempt < KNIP_MAX_ATTEMPTS) candidate = await runKnipAdapter(repoRoot);
  }

  const detail = lastContradictions.length > 0 ? lastContradictions.join("|") : `nonmatching-output:${attempts.join("|")}`;
  throw new Error(`knip-unstable-or-graph-contradiction:${detail}`);
}

const addCorroboratingSignal = (record, signal) => ({
  ...record,
  evidence: {
    ...record.evidence,
    corroborating_signals: [...new Set([...(record.evidence.corroborating_signals ?? []), signal])].sort(stableCompare),
  },
});

export async function runDetectorAdapters(repoRoot, config, { changedPaths = null } = {}) {
  const analysisRoot = await realpath(repoRoot);
  const initialKnip = config.detectors.knip.enabled ? await runKnipAdapter(analysisRoot) : null;
  const executions = await Promise.all([
    config.detectors.jscpd.enabled ? runJscpdAdapter(analysisRoot, config.detectors.jscpd) : null,
    initialKnip,
    config.detectors.madge.enabled ? runMadgeAdapter(analysisRoot, config.detectors.madge) : null,
    config.detectors.eslint.enabled ? runEslintAdapter(analysisRoot, config.detectors.eslint) : null,
    config.detectors.tsc.enabled ? runTscHealthAdapter(analysisRoot) : null,
  ]);
  const active = executions.filter(Boolean);
  const knipIndex = active.findIndex((result) => result.metadata.detector === "knip");
  const madge = active.find((result) => result.metadata.detector === "madge");
  if (knipIndex !== -1 && madge) active[knipIndex] = await stabilizeKnip(analysisRoot, active[knipIndex], madge);
  const knip = knipIndex === -1 ? null : active[knipIndex];
  const orphanCandidates = new Set(madge?.orphan_candidates ?? []);
  let corroboratedOrphans = 0;

  const reconciled = active.flatMap((result) => result.records).map((record) => {
    if (record.detector !== "knip" || record.kind !== "dead-code") return record;
    if (!orphanCandidates.has(record.locations[0].path)) return record;
    corroboratedOrphans += 1;
    orphanCandidates.delete(record.locations[0].path);
    return addCorroboratingSignal(record, "madge-orphan");
  });
  const droppedRecords = active.reduce((total, result) => total + result.dropped_records, 0) + orphanCandidates.size;
  const records = finalizeNormalizedRecords(reconciled);
  const emitted = changedPaths === null ? records : filterComponentRecords(records, changedPaths);

  return {
    records: emitted,
    all_records: records,
    dropped_records: droppedRecords,
    metadata: active.map((result) => result.metadata),
    dependency_graph: madge?.dependency_graph ?? {},
    analysis_scope: "full-repository-graph",
    emission_scope: changedPaths === null ? "all-records" : "changed-primary-paths",
    analyzed_record_count: records.length,
    emitted_record_count: emitted.length,
    corroborated_orphans: corroboratedOrphans,
  };
}
