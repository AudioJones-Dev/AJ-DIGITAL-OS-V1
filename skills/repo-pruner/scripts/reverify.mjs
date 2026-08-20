#!/usr/bin/env node
import { resolve } from "node:path";
import { loadConfig } from "./lib/config.mjs";
import { runDetectorAdapters } from "./lib/adapters/index.mjs";
import { assertPrunerLab } from "./lib/fixture.mjs";
import { runClassificationPipeline } from "./lib/pipeline.mjs";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};
const recordId = valueAfter("--record-id");
const findingId = valueAfter("--id");
const configPath = valueAfter("--config");
if ((!recordId && !findingId) || (recordId && findingId) || configPath !== ".pruner.yml") {
  console.error("Usage: reverify.mjs (--record-id <id> | --id <id>) --config .pruner.yml [--repo <pruner-lab>]");
  process.exit(2);
}

const repoRoot = await assertPrunerLab(resolve(valueAfter("--repo") ?? process.cwd()));
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

const pipeline = await runClassificationPipeline(repoRoot, { configPath });
const finding = pipeline.classification_result.findings.find((candidate) => candidate.id === findingId);
if (!finding) {
  console.error(`repo-pruner P3 finding not reproduced: ${findingId}`);
  process.exit(1);
}
console.log(JSON.stringify(finding));
