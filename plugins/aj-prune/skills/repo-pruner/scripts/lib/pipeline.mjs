import { loadConfig } from "./config.mjs";
import { runDetectorAdapters } from "./adapters/index.mjs";
import { classifyNormalizedRecords } from "./classifier.mjs";
import { loadRegistry } from "./registry.mjs";
import { changedPathsSince } from "./git.mjs";

export async function runClassificationPipeline(repoRoot, {
  configPath = ".pruner.yml",
  scope = null,
  changedPaths = null,
  targetType = "fixture",
} = {}) {
  const loaded = await loadConfig(repoRoot, configPath);
  const config = scope ? { ...loaded.config, scope } : loaded.config;
  const effectiveChangedPaths = config.scope === "component"
    ? (changedPaths ?? changedPathsSince(repoRoot, config.base_ref))
    : null;
  const registryResult = await loadRegistry(repoRoot, config.registry);
  if (!registryResult.valid && config.scope === "portfolio") {
    return {
      config,
      config_notices: loaded.notices,
      registry_result: registryResult,
      adapter_result: null,
      changed_paths: effectiveChangedPaths,
      classification_result: {
        outcome: "blocked",
        reason: registryResult.reason,
        findings: [],
        dropped_records: 0,
        registry_valid: false,
      },
    };
  }
  const adapterResult = await runDetectorAdapters(repoRoot, config, { changedPaths: effectiveChangedPaths });
  const classificationResult = await classifyNormalizedRecords({
    repoRoot,
    records: adapterResult.records,
    config,
    registryResult,
    dependencyGraph: adapterResult.dependency_graph,
    changedPaths: effectiveChangedPaths,
    targetType,
  });
  return {
    config,
    config_notices: loaded.notices,
    registry_result: registryResult,
    adapter_result: adapterResult,
    changed_paths: effectiveChangedPaths,
    classification_result: classificationResult,
  };
}
