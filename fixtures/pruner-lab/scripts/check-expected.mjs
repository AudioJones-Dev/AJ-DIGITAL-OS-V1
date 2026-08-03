#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { snapshotTree } from "./snapshot-tree.mjs";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};
const goldenOnly = args.includes("--golden-only");
const findingsPath = resolve(valueAfter("--findings") ?? ".pruner/findings.jsonl");
const beforePath = valueAfter("--before");
const fixtureRoot = resolve(import.meta.dirname, "..");
const expected = JSON.parse(readFileSync(resolve(fixtureRoot, "EXPECTED.json"), "utf8"));

const failures = [];
const passes = [];
const pass = (message) => passes.push(message);
const fail = (message) => failures.push(message);

if (!existsSync(findingsPath)) {
  console.error(`FAIL: findings file not found: ${findingsPath}`);
  process.exit(1);
}

const findings = readFileSync(findingsPath, "utf8")
  .split(/\r?\n/u)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      fail(`T2 line ${index + 1} is not JSON: ${error.message}`);
      return null;
    }
  })
  .filter(Boolean);

const classes = new Set(["actionable", "needs-decision", "probable-false-positive", "intentional", "excluded"]);
const statuses = new Set(["Canonical", "Ready for Sprint", "Experimental", "Needs Refactor", "Blocked", "Deprecated", "Delete Candidate"]);
const pathClasses = new Set(["code", "test", "doc", "prompt", "config", "generated"]);

for (const finding of findings) {
  const problems = [];
  if (typeof finding.id !== "string" || !finding.id) problems.push("id");
  if (!classes.has(finding.classification)) problems.push("classification");
  if (!Array.isArray(finding.locations) || finding.locations.length === 0) problems.push("locations");
  if (typeof finding.verify_cmd !== "string" || !finding.verify_cmd) problems.push("verify_cmd");
  if (finding.recommended_status !== null && !statuses.has(finding.recommended_status)) problems.push("recommended_status");
  for (const location of finding.locations ?? []) {
    if (!pathClasses.has(location.path_class)) problems.push(`path_class:${location.path_class}`);
    if (typeof location.protected !== "boolean") problems.push("protected");
  }
  if (problems.length) fail(`T2 ${finding.id ?? "<missing-id>"}: ${problems.join(", ")}`);
}
if (!failures.some((item) => item.startsWith("T2"))) pass(`T2 schema shape: ${findings.length} records`);

const pathsOf = (finding) => (finding.locations ?? []).map((location) => location.path);
const matchCase = (seed) => findings.find((finding) =>
  finding.kind === seed.kind && pathsOf(finding).some((path) => path.includes(seed.path_contains)));

const matched = new Map();
for (const seed of expected.cases) {
  const finding = matchCase(seed);
  matched.set(seed.id, finding);
  if (!finding) {
    fail(`${seed.id}: no ${seed.kind} finding contains ${seed.path_contains}`);
    continue;
  }
  if (finding.classification !== seed.classification) {
    fail(`${seed.id}: expected ${seed.classification}, got ${finding.classification}`);
    continue;
  }
  if (seed.recommended_status && finding.recommended_status !== seed.recommended_status) {
    fail(`${seed.id}: expected recommended_status ${seed.recommended_status}, got ${finding.recommended_status}`);
    continue;
  }
  if (seed.public_api_touched === true && finding.blast_radius?.public_api_touched !== true) {
    fail(`${seed.id}: public_api_touched must be true`);
    continue;
  }
  if (seed.requires_path_contains && !pathsOf(finding).some((path) => path.includes(seed.requires_path_contains))) {
    fail(`${seed.id}: missing context location ${seed.requires_path_contains}`);
    continue;
  }
  pass(`${seed.id}: ${seed.classification}`);
}

const tuple = expected.critical_order.map((id) => matched.get(id)?.classification ?? "missing");
const expectedTuple = ["excluded", "excluded", "needs-decision"];
if (JSON.stringify(tuple) === JSON.stringify(expectedTuple)) {
  pass(`T3 critical tuple: ${tuple.join(", ")}`);
} else {
  fail(`T3 critical tuple: expected ${expectedTuple.join(", ")}, got ${tuple.join(", ")}`);
}

for (const id of ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]) {
  if (matched.get(id)?.classification === "actionable") fail(`T3 ${id}: protected decoy is actionable`);
}
if (!failures.some((item) => item.startsWith("T3") && item.includes("actionable"))) pass("T3 no protected decoy is actionable");

const actionableDuplication = findings.filter((finding) => finding.kind === "duplication" && finding.classification === "actionable");
if (actionableDuplication.length) fail(`T8 actionable duplication: ${actionableDuplication.map((finding) => finding.id).join(", ")}`);
else pass("T8 duplication is never actionable");

if (goldenOnly) {
  pass("T1 not evaluated in golden-only mode; no live-safety claim permitted");
} else if (!beforePath) {
  fail("T1 requires --before .pruner/before-snapshot.json");
} else if (!existsSync(resolve(beforePath))) {
  fail(`T1 before snapshot not found: ${resolve(beforePath)}`);
} else {
  const before = JSON.parse(readFileSync(resolve(beforePath), "utf8"));
  const after = await snapshotTree(fixtureRoot);
  if (JSON.stringify(before) === JSON.stringify(after)) pass("T1 no writes outside .pruner/");
  else fail("T1 source-tree snapshot changed outside .pruner/");
}

for (const item of passes) console.log(`PASS ${item}`);
for (const item of failures) console.error(`FAIL ${item}`);
console.log(`${passes.length} passed, ${failures.length} failed`);

if (failures.length) process.exit(1);
console.log(goldenOnly
  ? "P0 golden contract is internally consistent. Real-repository execution remains unauthorized."
  : "Fixture assertions passed. Later phase gates still control any non-fixture execution.");
