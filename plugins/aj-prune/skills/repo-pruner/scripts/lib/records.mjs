import { stableFindingId } from "./stable.mjs";
import { stableCompare } from "./normalize.mjs";

const allowedDetectors = new Set(["jscpd", "knip", "madge", "eslint", "annotation-scanner"]);
const allowedKinds = new Set(["duplication", "dead-code", "unused-dep", "cycle", "complexity", "oversized", "invalid-annotation"]);

const canonicalLocations = (locations) => [...locations]
  .map((location) => ({
    path: String(location.path).replaceAll("\\", "/"),
    line_start: location.line_start ?? null,
    line_end: location.line_end ?? null,
  }))
  .sort((left, right) => stableCompare(
    `${left.path}:${left.line_start ?? 0}:${left.line_end ?? 0}`,
    `${right.path}:${right.line_start ?? 0}:${right.line_end ?? 0}`,
  ));

export function finalizeNormalizedRecords(records) {
  return records.map((record) => {
    const locations = canonicalLocations(record.locations);
    const id = stableFindingId({
      detector: record.detector,
      kind: record.kind,
      locations,
      evidence: record.evidence,
    });
    return {
      id,
      detector: record.detector,
      kind: record.kind,
      primary_path: locations[0].path,
      locations,
      evidence: record.evidence,
      verify_cmd: `node skills/repo-pruner/scripts/reverify.mjs --record-id ${id} --config .pruner.yml`,
    };
  }).sort((left, right) => stableCompare(`${left.id}:${left.detector}`, `${right.id}:${right.detector}`));
}

export function validateNormalizedRecord(record) {
  const problems = [];
  if (!record || typeof record !== "object") return ["record"];
  if (typeof record.id !== "string" || !record.id) problems.push("id");
  if (!allowedDetectors.has(record.detector)) problems.push("detector");
  if (!allowedKinds.has(record.kind)) problems.push("kind");
  if (typeof record.primary_path !== "string" || !record.primary_path || /^[A-Za-z]:|^\//u.test(record.primary_path)) problems.push("primary_path");
  if (!Array.isArray(record.locations) || record.locations.length === 0) problems.push("locations");
  for (const location of record.locations ?? []) {
    if (typeof location.path !== "string" || !location.path || /^[A-Za-z]:|^\//u.test(location.path)) problems.push("location.path");
    if (location.line_start !== null && (!Number.isInteger(location.line_start) || location.line_start < 1)) problems.push("location.line_start");
    if (location.line_end !== null && (!Number.isInteger(location.line_end) || location.line_end < 1)) problems.push("location.line_end");
  }
  if (!record.evidence || typeof record.evidence !== "object" || Array.isArray(record.evidence)) problems.push("evidence");
  if (typeof record.verify_cmd !== "string" || !record.verify_cmd) problems.push("verify_cmd");
  return [...new Set(problems)];
}

const normalizedPath = (value) => String(value).replaceAll("\\", "/").replace(/^\.\//u, "");

export function filterComponentRecords(records, changedPaths) {
  const changed = new Set(changedPaths.map(normalizedPath));
  return records.flatMap((record) => {
    const intersecting = record.locations
      .filter((location) => changed.has(normalizedPath(location.path)))
      .sort((left, right) => stableCompare(left.path, right.path));
    if (intersecting.length === 0) return [];
    return [{ ...record, primary_path: intersecting[0].path }];
  });
}

export function serializeNormalizedRecords(records) {
  return [...records]
    .sort((left, right) => stableCompare(`${left.id}:${left.detector}`, `${right.id}:${right.detector}`))
    .map((record) => JSON.stringify(record))
    .join("\n") + (records.length ? "\n" : "");
}
