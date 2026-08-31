#!/usr/bin/env node
import { resolve } from "node:path";
import { loadConfig } from "./lib/config.mjs";
import { runDetectorAdapters } from "./lib/adapters/index.mjs";
import { assertPrunerLab, resolvePrunerTarget } from "./lib/fixture.mjs";
import { runClassificationPipeline } from "./lib/pipeline.mjs";

const USAGE = "Usage: reverify.mjs (--record-id <id> | --id <id>) --config .pruner.yml [--repo <repository-root>] [--scope <portfolio|component>] [--live-repository]";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};
const recordId = valueAfter("--record-id");
const findingId = valueAfter("--id");
const configPath = valueAfter("--config");
const repoArgument = valueAfter("--repo");
const scope = valueAfter("--scope");
if ((!recordId && !findingId) || (recordId && findingId) || configPath !== ".pruner.yml") {
  console.error(USAGE);
  process.exit(2);
}
if (scope !== null && !["portfolio", "component"].includes(scope)) {
  console.error(`repo-pruner blocked: invalid scope: ${scope}`);
  process.exit(2);
}

// A fixture target still reverifies with no authorization flags. A live
// repository must clear the same explicit --repo/--scope/--live-repository
// gate that run-pruner.mjs enforces before any detector executes.
let target;
const candidate = resolve(repoArgument ?? process.cwd());
try {
  // A pruner-lab fixture reverifies without a Git root, exactly as before.
  target = { root: await assertPrunerLab(candidate), target_type: "fixture" };
} catch {
  try {
    target = await resolvePrunerTarget(candidate, {
      live_repository: args.includes("--live-repository"),
      repo_explicit: repoArgument !== null,
      scope_explicit: scope !== null,
    });
  } catch (error) {
    console.error(`repo-pruner blocked: ${error.message}`);
    process.exit(2);
  }
}
const repoRoot = target.root;

if (recordId) {
  const { config } = await loadConfig(repoRoot, configPath);
  const result = await runDetectorAdapters(repoRoot, config);
  const record = result.records.find((candidate) => candidate.id === recordId);
  if (!record) {
    console.error(`repo-pruner P2 record not reproduced: ${recordId}`);
    process.exit(1);
  }
  console.log(JSON.stringify(record));
  process.exit(0);
}

const pipeline = await runClassificationPipeline(repoRoot, { configPath, scope, targetType: target.target_type });
const finding = pipeline.classification_result.findings.find((candidate) => candidate.id === findingId);
if (!finding) {
  console.error(`repo-pruner P3 finding not reproduced: ${findingId}`);
  process.exit(1);
}
console.log(JSON.stringify(finding));
