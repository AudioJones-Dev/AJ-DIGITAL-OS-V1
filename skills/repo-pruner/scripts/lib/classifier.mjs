import { readdir, readFile } from "node:fs/promises";
import { extname, join, posix, relative, resolve, sep } from "node:path";
import { CONFIDENCE_BY_KIND } from "./constants.mjs";
import { hasValidAnnotation, scanPrunerAnnotations } from "./annotations.mjs";
import { classifyPath, normalizeFindingPath, protectionRuleForPath, resolveRegistryMatches } from "./paths.mjs";
import { stableCompare } from "./normalize.mjs";
import { filterComponentRecords } from "./records.mjs";

const TEXT_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts", ".json"]);
const SKIP_DIRECTORIES = new Set([".git", ".pruner", "node_modules", "dist", ".next", "coverage"]);

async function textFiles(repoRoot, current = repoRoot) {
  const files = [];
  for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => stableCompare(a.name, b.name))) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) files.push(...await textFiles(repoRoot, join(current, entry.name)));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(join(current, entry.name));
    }
  }
  return files;
}

async function collectUseSignals(repoRoot) {
  const root = resolve(repoRoot);
  const dynamicDirectories = new Set();
  const configuredReferences = new Set();
  for (const absolute of await textFiles(root)) {
    const sourcePath = relative(root, absolute).split(sep).join("/");
    const contents = await readFile(absolute, "utf8");
    for (const match of contents.matchAll(/\bimport\s*\(\s*`([^`]*\$\{[^`]+)`\s*\)/gu)) {
      const staticPrefix = match[1].split("${", 1)[0];
      if (!staticPrefix) continue;
      const directory = posix.normalize(posix.join(posix.dirname(sourcePath), staticPrefix));
      dynamicDirectories.add(directory.replace(/\/$/u, ""));
    }
    if (["package.json", "knip.json", "tsconfig.json"].includes(sourcePath) || /(?:^|\/)config\//u.test(sourcePath)) {
      configuredReferences.add(contents);
    }
  }
  return {
    hasDynamicSignal(path) {
      return [...dynamicDirectories].some((directory) => path === directory || path.startsWith(`${directory}/`));
    },
    hasConfiguredSignal(path) {
      const withoutExtension = path.replace(/\.[^/.]+$/u, "");
      return [...configuredReferences].some((contents) => contents.includes(path) || contents.includes(withoutExtension));
    },
  };
}

function reverseGraph(graph) {
  const reverse = new Map();
  for (const [source, dependencies] of Object.entries(graph ?? {})) {
    if (!reverse.has(source)) reverse.set(source, new Set());
    for (const dependency of dependencies) {
      const dependents = reverse.get(dependency) ?? new Set();
      dependents.add(source);
      reverse.set(dependency, dependents);
    }
  }
  return reverse;
}

function transitiveDependents(graph, targets) {
  const reverse = reverseGraph(graph);
  const targetSet = new Set(targets);
  const seen = new Set();
  const queue = [...targets];
  while (queue.length) {
    const path = queue.shift();
    for (const dependent of reverse.get(path) ?? []) {
      if (seen.has(dependent) || targetSet.has(dependent)) continue;
      seen.add(dependent);
      queue.push(dependent);
    }
  }
  return seen.size;
}

function neverTouchRule(record) {
  const paths = record.locations.map((location) => location.path);
  if (record.evidence.issue_type === "unused-export" || record.evidence.issue_type === "unused-type") return "never-touch-exported-surface";
  const contracts = [
    [/(?:^|\/)(?:auth|authentication|authorization)(?:\/|[-_.])/u, "never-touch-auth"],
    [/(?:^|\/)(?:billing|payments?|invoices?|finance|financial|pricing|quotes?|estimates?|ledger|revenue|tax|checkout|subscriptions?)(?:\/|[-_.])/u, "never-touch-financial"],
    [/(?:^|\/)(?:env|environment)(?:\/|[-_.])/u, "never-touch-environment-contract"],
    [/(?:^|\/)(?:api|routes?)(?:\/|[-_.])/u, "never-touch-public-api"],
    [/(?:^|\/)(?:hermes|model-router|bel|approvals?|attribution)(?:\/|[-_.])/u, "never-touch-aj-os-core"],
  ];
  for (const [pattern, rule] of contracts) if (paths.some((path) => pattern.test(path))) return rule;
  return null;
}

function confidenceFor(record, { dynamicUse, intentional }) {
  if (dynamicUse) return 0.64;
  if (intentional) return 0.88;
  if (record.kind === "dead-code" && (record.evidence.corroborating_signals ?? []).length > 0) return 0.93;
  return CONFIDENCE_BY_KIND[record.kind] ?? 0;
}

const unique = (items) => [...new Set(items)].sort(stableCompare);

function statusForLocations(locations, registry) {
  if (!registry) return null;
  const ids = unique(locations.map((location) => location.component_id).filter(Boolean));
  if (ids.length !== 1) return null;
  return registry.components.find((component) => component.id === ids[0])?.status ?? null;
}

function recommendation(classification, kind, currentStatus) {
  if (classification === "actionable") return "Delete Candidate";
  if (classification === "needs-decision") return "Needs Refactor";
  if (classification === "intentional" || classification === "probable-false-positive" || classification === "excluded") return currentStatus;
  return kind === "unused-dep" ? "Delete Candidate" : null;
}

function analysisQuestion(classification, kind, neverTouch) {
  if (kind === "invalid-annotation") return "What invariant or constraint justifies this suppression?";
  if (kind === "duplication" && classification === "needs-decision") return "Do these implementations encode separate business invariants?";
  if (neverTouch && classification === "needs-decision") return "Is this protected contract consumed outside the static graph?";
  return null;
}

export async function classifyNormalizedRecords({ repoRoot, records, config, registryResult, dependencyGraph = {}, changedPaths = null }) {
  const governanceValid = registryResult?.valid === true;
  if (!governanceValid && config.scope === "portfolio") {
    return {
      outcome: "blocked",
      reason: registryResult?.reason ?? "registry-invalid",
      findings: [],
      dropped_records: records.length,
      registry_valid: false,
    };
  }

  const annotationScan = await scanPrunerAnnotations(repoRoot);
  const useSignals = await collectUseSignals(repoRoot);
  const invalidAnnotationRecords = changedPaths === null
    ? annotationScan.invalidRecords
    : filterComponentRecords(annotationScan.invalidRecords, changedPaths);
  const allRecords = [...records, ...invalidAnnotationRecords];
  const prepared = [];
  let registryAmbiguous = false;

  for (const record of allRecords) {
    const locationRules = [];
    const locations = record.locations.map((rawLocation) => {
      const path = normalizeFindingPath(repoRoot, rawLocation.path);
      const match = resolveRegistryMatches(path, governanceValid ? registryResult.registry : null);
      if (match.ambiguous) registryAmbiguous = true;
      const defaultRule = protectionRuleForPath(path, config.path_classes.excluded_globs);
      const registryProtected = match.component?.protected === true;
      if (defaultRule) locationRules.push(defaultRule);
      if (registryProtected) locationRules.push("registry-protected-component");
      if (match.ambiguous) locationRules.push("ambiguous-component-mapping");
      return {
        path,
        line_start: rawLocation.line_start ?? null,
        line_end: rawLocation.line_end ?? null,
        path_class: classifyPath(path),
        component_id: match.component?.id ?? null,
        protected: Boolean(defaultRule || registryProtected),
      };
    });
    prepared.push({ record: { ...record, locations }, locationRules: unique(locationRules) });
  }

  if (registryAmbiguous && config.scope === "portfolio") {
    return {
      outcome: "blocked",
      reason: "registry-component-ambiguity",
      findings: [],
      dropped_records: allRecords.length,
      registry_valid: true,
    };
  }

  const findings = [];
  let droppedRecords = 0;
  for (const { record, locationRules } of prepared) {
    const paths = record.locations.map((location) => location.path);
    const excluded = record.locations.some((location) => location.protected || !["code", "test"].includes(location.path_class));
    const mixedProtection = record.locations.some((location) => location.protected) && record.locations.some((location) => !location.protected);
    const ambiguous = locationRules.includes("ambiguous-component-mapping");
    const neverTouch = neverTouchRule(record);
    const intentional = hasValidAnnotation(record, annotationScan);
    const intentionalFinancialDuplication = intentional && record.kind === "duplication" && neverTouch === "never-touch-financial";
    const invalidAnnotationPresent = paths.some((path) => annotationScan.invalidPaths.has(path));
    const dynamicUse = record.kind === "dead-code" && paths.some((path) => useSignals.hasDynamicSignal(path));
    const configuredUse = record.kind === "dead-code" && paths.some((path) => useSignals.hasConfiguredSignal(path));
    const dependents = transitiveDependents(dependencyGraph, paths);
    const confidence = confidenceFor(record, { dynamicUse: dynamicUse || configuredUse, intentional });
    if (confidence < config.thresholds.min_confidence_to_emit) {
      droppedRecords += 1;
      continue;
    }

    let classification;
    const rules = [...locationRules];
    if (excluded) {
      classification = "excluded";
      if (mixedProtection) rules.push("mixed-location-most-conservative");
    } else if (ambiguous) {
      classification = "needs-decision";
      rules.push("ambiguous-component-never-actionable");
    } else if (neverTouch && !intentionalFinancialDuplication) {
      classification = "needs-decision";
      rules.push(neverTouch);
    } else if (record.kind === "invalid-annotation" || invalidAnnotationPresent) {
      classification = "needs-decision";
      rules.push(record.kind === "invalid-annotation" ? "annotation-reason-required" : "invalid-annotation-present");
    } else if (intentional) {
      classification = "intentional";
      if (neverTouch) rules.push(neverTouch);
      rules.push("valid-reasoned-annotation");
    } else if (record.kind === "duplication") {
      classification = "needs-decision";
      rules.push("duplication-never-actionable");
    } else if (dynamicUse || configuredUse) {
      classification = "probable-false-positive";
      rules.push(dynamicUse ? "dynamic-import-downgrade" : "configured-use-downgrade");
    } else if (dependents > config.thresholds.blast_radius_decision_threshold) {
      classification = "needs-decision";
      rules.push("dependents-above-decision-threshold");
    } else if (record.locations.some((location) => location.path_class === "test")) {
      classification = "needs-decision";
      rules.push("test-never-actionable-v1");
    } else if (["dead-code", "unused-dep"].includes(record.kind)) {
      classification = governanceValid ? "actionable" : "needs-decision";
      rules.push(record.kind === "dead-code" ? "dead-code-zero-dependents" : "unused-dependency-zero-uses");
      rules.push(governanceValid ? "governance-valid" : "governance-invalid-actionability-downgrade");
    } else {
      classification = "needs-decision";
      rules.push(`${record.kind}-needs-decision`);
      if (record.kind === "cycle" && record.locations.length > 1) rules.push("full-graph-context-retained");
    }

    const currentStatus = governanceValid ? statusForLocations(record.locations, registryResult.registry) : null;
    const evidence = { ...record.evidence };
    if (record.kind === "dead-code") {
      evidence.dynamic_use_signal = dynamicUse;
      evidence.configured_use_signal = configuredUse;
    }
    const finding = {
      id: record.id,
      detector: record.detector,
      kind: record.kind,
      locations: record.locations,
      evidence,
      blast_radius: {
        files: new Set(paths).size,
        dependents,
        public_api_touched: Boolean(neverTouch),
      },
      confidence,
      classification,
      current_component_status: currentStatus,
      recommended_status: recommendation(classification, record.kind, currentStatus),
      rules_applied: unique(rules),
      verify_cmd: `node skills/repo-pruner/scripts/reverify.mjs --id ${record.id} --config .pruner.yml`,
    };
    const question = analysisQuestion(classification, record.kind, neverTouch);
    if (question) finding.analysis_question = question;
    findings.push(finding);
  }

  findings.sort((left, right) => stableCompare(`${left.id}:${left.detector}`, `${right.id}:${right.detector}`));
  return {
    outcome: governanceValid ? "complete" : "incomplete",
    reason: governanceValid ? "classification-complete" : registryResult?.reason ?? "registry-invalid",
    findings,
    dropped_records: droppedRecords,
    registry_valid: governanceValid,
  };
}

export function validateFinding(finding) {
  const problems = [];
  const classifications = new Set(["actionable", "needs-decision", "probable-false-positive", "intentional", "excluded"]);
  const kinds = new Set(["duplication", "dead-code", "unused-dep", "cycle", "complexity", "oversized", "invalid-annotation"]);
  if (!finding?.id) problems.push("id");
  if (!kinds.has(finding?.kind)) problems.push("kind");
  if (!classifications.has(finding?.classification)) problems.push("classification");
  if (!Array.isArray(finding?.locations) || finding.locations.length === 0) problems.push("locations");
  for (const location of finding?.locations ?? []) {
    if (!location.path || !["code", "test", "doc", "prompt", "config", "generated"].includes(location.path_class)) problems.push("location");
    if (typeof location.protected !== "boolean") problems.push("location.protected");
  }
  if (!finding?.blast_radius || !Number.isInteger(finding.blast_radius.files) || !Number.isInteger(finding.blast_radius.dependents) || typeof finding.blast_radius.public_api_touched !== "boolean") problems.push("blast_radius");
  if (typeof finding?.confidence !== "number" || finding.confidence < 0 || finding.confidence > 1) problems.push("confidence");
  if (!finding?.verify_cmd || !/^node skills\/repo-pruner\/scripts\/reverify\.mjs --id \S+ --config \.pruner\.yml$/u.test(finding.verify_cmd)) problems.push("verify_cmd");
  if (!Array.isArray(finding?.rules_applied) || finding.rules_applied.length === 0) problems.push("rules_applied");
  return unique(problems);
}
