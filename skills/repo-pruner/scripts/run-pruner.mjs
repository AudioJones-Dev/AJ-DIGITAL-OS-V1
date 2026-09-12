#!/usr/bin/env node
import { resolve } from "node:path";
import { assertCleanBaseline } from "./lib/git.mjs";
import { CERTIFICATION_ARCH, CERTIFICATION_NODE, CERTIFICATION_PLATFORM, PACKAGE_PHASE, SPEC_SHA256 } from "./lib/constants.mjs";
import { writePrunerFile } from "./lib/output.mjs";
import { resolvePrunerTarget } from "./lib/fixture.mjs";
import { runClassificationPipeline } from "./lib/pipeline.mjs";
import { compareSnapshots, snapshotSourceTree } from "./lib/snapshot.mjs";
import { serializeFindings } from "./lib/stable.mjs";
import { buildVerifyCmd, LIVE_REPO_PLACEHOLDER, validateFinding } from "./lib/classifier.mjs";
import { SKILL_ROOT } from "./lib/detector-runtime.mjs";
import { renderInventory, renderMeasure } from "./lib/emitters.mjs";
import { git } from "./lib/git.mjs";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};
const allowedFlags = new Set(["--repo", "--scope", "--live-repository"]);
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (!allowedFlags.has(argument)) {
    console.error(`repo-pruner blocked: unknown argument: ${argument}`);
    process.exit(2);
  }
  if (argument !== "--live-repository") index += 1;
}
const repoArgument = valueAfter("--repo");
const scope = valueAfter("--scope");
if (scope !== null && !["portfolio", "component"].includes(scope)) {
  console.error(`repo-pruner blocked: invalid scope: ${scope}`);
  process.exit(2);
}
let target;
try {
  target = await resolvePrunerTarget(resolve(repoArgument ?? process.cwd()), {
    live_repository: args.includes("--live-repository"),
    repo_explicit: repoArgument !== null,
    scope_explicit: scope !== null,
  });
} catch (error) {
  console.error(`repo-pruner blocked: ${error.message}`);
  process.exit(2);
}
const repoRoot = target.root;

const manifest = {
  version: 1,
  spec_sha256: SPEC_SHA256,
  package_phase: PACKAGE_PHASE,
  outcome: "blocked",
  reason: null,
  scope: scope ?? "portfolio",
  target_type: target.target_type,
  detector_execution_started: false,
  actionable_findings_emitted: 0,
  runtime: {
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    certification_eligible: process.versions.node === CERTIFICATION_NODE && process.platform === CERTIFICATION_PLATFORM && process.arch === CERTIFICATION_ARCH,
  },
};

try {
  assertCleanBaseline(repoRoot);
} catch (error) {
  manifest.reason = error.code === "DIRTY_BASELINE" ? "dirty-baseline" : "git-preflight-failed";
  if (error.code === "DIRTY_BASELINE") manifest.dirty_paths = error.paths;
}

if (manifest.reason) {
  await writePrunerFile(repoRoot, ".pruner/findings.jsonl", "");
  await writePrunerFile(repoRoot, ".pruner/run-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  console.error(`repo-pruner blocked: ${manifest.reason}`);
  process.exit(2);
}

const before = await snapshotSourceTree(repoRoot);
try {
  const pipeline = await runClassificationPipeline(repoRoot, { scope, targetType: target.target_type });
  manifest.scope = pipeline.config.scope;
  manifest.detector_execution_started = pipeline.adapter_result !== null;
  manifest.outcome = pipeline.classification_result.outcome;
  manifest.reason = pipeline.classification_result.reason;
  manifest.registry_valid = pipeline.classification_result.registry_valid;
  manifest.config_notices = pipeline.config_notices;
  manifest.dropped_records = (pipeline.adapter_result?.dropped_records ?? 0) + pipeline.classification_result.dropped_records;
  manifest.detectors = pipeline.adapter_result?.metadata.map(({ detector, version }) => ({ detector, version })) ?? [];
  if (pipeline.config.scope === "component") {
    manifest.base_ref = pipeline.config.base_ref;
    manifest.changed_paths = pipeline.changed_paths;
    manifest.changed_surface_command = `git diff --name-only --diff-filter=ACMR ${pipeline.config.base_ref}...HEAD`;
  }

  const invalid = pipeline.classification_result.findings
    .map((finding) => ({ id: finding.id, problems: validateFinding(finding) }))
    .filter((item) => item.problems.length > 0);
  if (invalid.length) throw new Error(`invalid-findings:${JSON.stringify(invalid)}`);

  const afterDetection = await snapshotSourceTree(repoRoot);
  const changedSourcePaths = compareSnapshots(before, afterDetection);
  if (changedSourcePaths.length) {
    manifest.outcome = "invalid";
    manifest.reason = "out-of-boundary-write";
    manifest.changed_source_paths = changedSourcePaths;
    manifest.actionable_findings_emitted = 0;
    await writePrunerFile(repoRoot, ".pruner/findings.jsonl", "");
  } else {
    await writePrunerFile(repoRoot, ".pruner/findings.jsonl", serializeFindings(pipeline.classification_result.findings));
    const commit = git(repoRoot, ["rev-parse", "HEAD"]).trim();
    if (pipeline.config.scope === "portfolio") {
      await writePrunerFile(repoRoot, ".pruner/sprint-minus-1-inventory.md", renderInventory({
        registry: pipeline.registry_result.registry,
        registryPath: pipeline.config.registry,
        findings: pipeline.classification_result.findings,
        commit,
      }));
      manifest.evidence_artifact = ".pruner/sprint-minus-1-inventory.md";
    } else {
      await writePrunerFile(repoRoot, ".pruner/measure.md", renderMeasure({
        commit,
        baseRef: pipeline.config.base_ref,
        changedPaths: pipeline.changed_paths,
        changedSurfaceCommand: manifest.changed_surface_command,
        detectorMetadata: pipeline.adapter_result?.metadata ?? [],
        findings: pipeline.classification_result.findings,
        outcome: pipeline.classification_result.outcome,
        reason: pipeline.classification_result.reason,
      }));
      manifest.evidence_artifact = ".pruner/measure.md";
    }
    manifest.actionable_findings_emitted = pipeline.classification_result.findings.filter((finding) => finding.classification === "actionable").length;
    manifest.finding_count = pipeline.classification_result.findings.length;
    manifest.analysis_scope = pipeline.adapter_result?.analysis_scope ?? null;
    if (target.target_type === "live") {
      // findings.jsonl stays free of absolute paths, so the resolved
      // substitution for the emitted placeholder is recorded here instead.
      // run-manifest.json is outside the byte-parity assertion.
      manifest.reverification = {
        placeholder: LIVE_REPO_PLACEHOLDER,
        working_directory: SKILL_ROOT,
        repository_root: repoRoot,
        command_template: buildVerifyCmd({ findingId: "<finding-id>", targetType: "live", scope: pipeline.config.scope }),
      };
    }
  }
} catch (error) {
  manifest.outcome = "blocked";
  manifest.reason = error.message;
  manifest.actionable_findings_emitted = 0;
  await writePrunerFile(repoRoot, ".pruner/findings.jsonl", "");
}

await writePrunerFile(repoRoot, ".pruner/run-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
if (manifest.outcome !== "complete") {
  console.error(`repo-pruner ${manifest.outcome}: ${manifest.reason}`);
  process.exit(2);
}
console.log(JSON.stringify(manifest));
