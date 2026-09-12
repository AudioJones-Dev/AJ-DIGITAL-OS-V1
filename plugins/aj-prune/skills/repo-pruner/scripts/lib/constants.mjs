export const SPEC_SHA256 = "F8F54810E561B09C3251FEFB77A62D679D93B633090969D18D7100A88D4BF09B";
export const PACKAGE_PHASE = "P4";
export const CERTIFICATION_NODE = "24.18.0";
export const CERTIFICATION_PLATFORM = "win32";
export const CERTIFICATION_ARCH = "x64";

export const DETECTOR_VERSIONS = Object.freeze({
  "@typescript-eslint/parser": "8.65.0",
  eslint: "10.8.0",
  "eslint-plugin-sonarjs": "4.2.0",
  jscpd: "5.0.14",
  knip: "6.31.0",
  madge: "8.0.0",
  typescript: "5.9.3",
});

export const CLASSIFIER_VERSIONS = Object.freeze({
  minimatch: "10.2.6",
  yaml: "2.9.0",
});

export const CONFIDENCE_BY_KIND = Object.freeze({
  duplication: 0.94,
  "dead-code": 0.9,
  "unused-dep": 0.91,
  cycle: 0.97,
  complexity: 0.9,
  oversized: 1,
  "invalid-annotation": 1,
});

export const DMAIC_STATUSES = Object.freeze([
  "Canonical",
  "Ready for Sprint",
  "Experimental",
  "Needs Refactor",
  "Blocked",
  "Deprecated",
  "Delete Candidate",
]);

export const FINDING_KEY_ORDER = Object.freeze([
  "id",
  "detector",
  "kind",
  "locations",
  "evidence",
  "blast_radius",
  "confidence",
  "classification",
  "current_component_status",
  "recommended_status",
  "rules_applied",
  "verify_cmd",
  "analysis_question",
]);

export const ALLOWED_OUTPUTS = Object.freeze([
  ".pruner/findings.jsonl",
  ".pruner/run-manifest.json",
  ".pruner/measure.md",
  ".pruner/sprint-minus-1-inventory.md",
]);
