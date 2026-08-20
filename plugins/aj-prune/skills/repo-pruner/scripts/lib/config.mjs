export const DEFAULT_CONFIG = Object.freeze({
  version: 1,
  scope: "component",
  base_ref: "origin/main",
  registry: ".dmaic/components.yaml",
  output_dir: ".pruner",
  detectors: {
    jscpd: { enabled: true, min_lines: 15, min_tokens: 70 },
    knip: { enabled: true },
    madge: { enabled: true },
    eslint: { enabled: true, complexity: 15, max_lines: 400 },
    tsc: { enabled: true },
    tests: { enabled: false, command: null },
  },
  thresholds: { min_confidence_to_emit: 0.6, blast_radius_decision_threshold: 5 },
  path_classes: { excluded_globs: [] },
});

const clone = (value) => structuredClone(value);
const plainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const positiveInteger = (value) => Number.isInteger(value) && value > 0;

function assertKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`invalid-config-unknown-key:${label}.${unknown.sort().join(",")}`);
}

function detectorConfig(input, name, tuningKeys = []) {
  if (!plainObject(input)) throw new Error(`invalid-detector-config:${name}`);
  assertKeys(input, ["enabled", ...tuningKeys], `detectors.${name}`);
  if (typeof input.enabled !== "boolean") throw new Error(`invalid-detector-config:${name}.enabled`);
  const normalized = { enabled: input.enabled };
  for (const key of tuningKeys) {
    const fallback = DEFAULT_CONFIG.detectors[name][key];
    const value = input[key] ?? fallback;
    if (!positiveInteger(value)) throw new Error(`invalid-detector-config:${name}.${key}`);
    normalized[key] = value;
  }
  return normalized;
}

function testAdapterConfig(input) {
  if (!plainObject(input)) throw new Error("invalid-detector-config:tests");
  assertKeys(input, ["enabled", "command"], "detectors.tests");
  if (typeof input.enabled !== "boolean") throw new Error("invalid-detector-config:tests.enabled");
  if (input.command !== null && !nonEmptyString(input.command)) throw new Error("invalid-detector-config:tests.command");
  if (input.enabled && !nonEmptyString(input.command)) throw new Error("missing-read-only-test-command");
  if (input.enabled) throw new Error("project-test-adapter-not-ratified-v1");
  return { enabled: false, command: null };
}

export function resolveConfigObject(input) {
  if (input === null || input === undefined) return { config: clone(DEFAULT_CONFIG), notices: ["missing-config-using-defaults"] };
  if (!plainObject(input)) throw new Error("invalid-config-root");
  assertKeys(input, ["version", "scope", "base_ref", "registry", "output_dir", "detectors", "thresholds", "path_classes"], "root");
  if (input.version !== 1) throw new Error("invalid-config-version");
  if (!["portfolio", "component"].includes(input.scope)) throw new Error("invalid-config-scope");
  if (input.output_dir !== ".pruner") throw new Error("invalid-output-dir");
  if (!nonEmptyString(input.registry)) throw new Error("invalid-registry-path");
  if (input.scope === "component" && !nonEmptyString(input.base_ref)) throw new Error("missing-base-ref");
  if (input.base_ref !== undefined && !nonEmptyString(input.base_ref)) throw new Error("invalid-base-ref");

  if (!plainObject(input.detectors)) throw new Error("invalid-config-detectors");
  assertKeys(input.detectors, ["jscpd", "knip", "madge", "eslint", "tsc", "tests"], "detectors");
  if (!["jscpd", "knip", "madge", "eslint", "tsc", "tests"].every((name) => Object.hasOwn(input.detectors, name))) throw new Error("missing-detector-config");

  if (!plainObject(input.thresholds)) throw new Error("invalid-config-thresholds");
  assertKeys(input.thresholds, ["min_confidence_to_emit", "blast_radius_decision_threshold"], "thresholds");
  const minConfidence = input.thresholds.min_confidence_to_emit;
  if (!finiteNumber(minConfidence) || minConfidence < 0 || minConfidence > 1) throw new Error("invalid-confidence-threshold");
  const blastThreshold = input.thresholds.blast_radius_decision_threshold;
  if (!Number.isInteger(blastThreshold) || blastThreshold < 0) throw new Error("invalid-blast-radius-threshold");

  if (!plainObject(input.path_classes)) throw new Error("invalid-config-path-classes");
  assertKeys(input.path_classes, ["excluded_globs"], "path_classes");
  const excludedGlobs = input.path_classes.excluded_globs;
  if (!Array.isArray(excludedGlobs) || excludedGlobs.some((glob) => !nonEmptyString(glob)) || new Set(excludedGlobs).size !== excludedGlobs.length) {
    throw new Error("invalid-excluded-globs");
  }

  return {
    config: {
      version: 1,
      scope: input.scope,
      base_ref: input.base_ref?.trim() ?? DEFAULT_CONFIG.base_ref,
      registry: input.registry.trim(),
      output_dir: ".pruner",
      detectors: {
        jscpd: detectorConfig(input.detectors.jscpd, "jscpd", ["min_lines", "min_tokens"]),
        knip: detectorConfig(input.detectors.knip, "knip"),
        madge: detectorConfig(input.detectors.madge, "madge"),
        eslint: detectorConfig(input.detectors.eslint, "eslint", ["complexity", "max_lines"]),
        tsc: detectorConfig(input.detectors.tsc, "tsc"),
        tests: testAdapterConfig(input.detectors.tests),
      },
      thresholds: {
        min_confidence_to_emit: minConfidence,
        blast_radius_decision_threshold: blastThreshold,
      },
      path_classes: { excluded_globs: excludedGlobs.map((glob) => glob.trim()) },
    },
    notices: [],
  };
}

export async function loadConfig(repoRoot, configPath = ".pruner.yml") {
  const absolute = resolve(repoRoot, configPath);
  let contents;
  try {
    contents = await readFile(absolute, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return resolveConfigObject(null);
    throw new Error(`config-unreadable:${configPath}`, { cause: error });
  }
  let parsed;
  try {
    parsed = parse(contents);
  } catch (error) {
    throw new Error(`config-invalid-yaml:${configPath}`, { cause: error });
  }
  return resolveConfigObject(parsed);
}
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
