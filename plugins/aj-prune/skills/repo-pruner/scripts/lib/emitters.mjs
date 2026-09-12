import { stableCompare } from "./normalize.mjs";

const UNRESOLVED = "Unresolved — DMAIC Analyze input required";
const STATUS_PRIORITY = Object.freeze([
  "Blocked",
  "Needs Refactor",
  "Deprecated",
  "Delete Candidate",
  "Experimental",
  "Ready for Sprint",
  "Canonical",
]);

const sorted = (items) => [...items].sort(stableCompare);
const provenance = (ids) => ids.length ? `[findings:${sorted(ids).join(",")}]` : "[findings:none]";
const tableCell = (value) => String(value).replaceAll("|", "\\|").replaceAll(/\r?\n/gu, " ");

function findingsForComponent(findings, componentId) {
  return findings.filter((finding) => finding.locations.some((location) => location.component_id === componentId));
}

function recommendedStatus(component, findings) {
  const statuses = new Set([component.status, ...findings.map((finding) => finding.recommended_status).filter(Boolean)]);
  return STATUS_PRIORITY.find((status) => statuses.has(status)) ?? component.status;
}

function summarizeKinds(findings, kinds) {
  const matches = findings.filter((finding) => kinds.includes(finding.kind));
  if (!matches.length) return `None observed ${provenance([])}`;
  return `${matches.map((finding) => `${finding.kind}:${finding.id}`).sort(stableCompare).join(", ")} ${provenance(matches.map((finding) => finding.id))}`;
}

function riskLevel(findings) {
  const ids = findings.map((finding) => finding.id);
  if (findings.some((finding) => finding.blast_radius.public_api_touched || finding.classification === "needs-decision")) {
    return `High ${provenance(ids)}`;
  }
  if (findings.some((finding) => finding.classification === "actionable")) return `Medium ${provenance(ids)}`;
  return `${UNRESOLVED} ${provenance(ids)}`;
}

export function renderInventory({ registry, registryPath, findings, commit }) {
  if (!registry?.components) throw new Error("inventory-registry-required");
  const header = [
    "# Sprint -1 inventory evidence",
    "",
    "Inventory gate: INCOMPLETE — review and governance update required.",
    "",
    `Repository commit: \`${commit}\``,
    `Registry: \`${registryPath}\` (read only)`,
    "",
    "| Component | Current state | Intended state | Gap analysis | Risk level | Broken dependencies | Duplicate logic | Required tests | Stabilization actions | Decision | current_status | recommended_status |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  const rows = [...registry.components]
    .sort((left, right) => stableCompare(left.id, right.id))
    .map((component) => {
      const componentFindings = findingsForComponent(findings, component.id);
      const ids = componentFindings.map((finding) => finding.id);
      const source = provenance(ids);
      const cells = [
        `${component.id} [registry:${registryPath}]`,
        `Registered as ${component.status} [registry:${registryPath}#${component.id}]`,
        `${UNRESOLVED} [registry:${registryPath}#${component.id}]`,
        componentFindings.length
          ? `${componentFindings.length} emitted finding(s): ${sorted(ids).join(", ")} ${source}`
          : `No detector gap observed ${source}`,
        riskLevel(componentFindings),
        summarizeKinds(componentFindings, ["cycle", "unused-dep"]),
        summarizeKinds(componentFindings, ["duplication"]),
        `${UNRESOLVED} ${source}`,
        `${UNRESOLVED} ${source}`,
        `${UNRESOLVED} ${source}`,
        component.status,
        recommendedStatus(component, componentFindings),
      ];
      return `| ${cells.map(tableCell).join(" | ")} |`;
    });
  return [...header, ...rows, "", "This artifact is evidence only. It does not update the registry, open a charter, or authorize remediation.", ""].join("\n");
}

export function renderMeasure({ commit, baseRef, changedPaths, changedSurfaceCommand, detectorMetadata, findings, outcome, reason }) {
  const detectors = [...detectorMetadata]
    .sort((left, right) => stableCompare(left.detector, right.detector))
    .map((item) => `- ${item.detector}: ${item.version}`);
  const findingRows = [...findings]
    .sort((left, right) => stableCompare(left.id, right.id))
    .map((finding) => `| ${tableCell(finding.id)} | ${finding.kind} | ${finding.classification} | \`${tableCell(finding.verify_cmd)}\` |`);
  const tsc = detectorMetadata.find((item) => item.detector === "tsc");
  return [
    "# Component Measure evidence",
    "",
    "This artifact supplies DMAIC Measure evidence only. Analyze and Improve remain unstarted.",
    "",
    `Repository commit: \`${commit}\``,
    `Base ref: \`${baseRef}\``,
    `Changed-surface command: \`${changedSurfaceCommand}\``,
    "",
    "## Changed surface",
    "",
    ...(changedPaths.length ? changedPaths.map((path) => `- \`${path}\``) : ["- None"]),
    "",
    "## Detector versions",
    "",
    ...(detectors.length ? detectors : ["- None executed"]),
    "",
    "## Health evidence",
    "",
    tsc ? `- TypeScript baseline: ${tsc.health}; exit code ${tsc.exit_code}; artifact \`${tsc.raw_artifact}\`.` : "- TypeScript baseline: Not measured — tsc adapter disabled.",
    "- Test baseline: Not measured — no explicitly configured read-only project test command.",
    "- Detector execution: Completed against the full repository graph before changed-surface filtering.",
    "",
    "## Findings",
    "",
    "| Finding ID | Kind | Classification | Re-run command |",
    "|---|---|---|---|",
    ...(findingRows.length ? findingRows : ["| None | — | — | — |"]),
    "",
    "## Incomplete or blocked conditions",
    "",
    outcome === "complete" ? "- None." : `- ${reason ?? outcome}`,
    "",
    "No remediation, effort estimate, canonical nomination, or implementation plan is authorized by this artifact.",
    "",
  ].join("\n");
}
