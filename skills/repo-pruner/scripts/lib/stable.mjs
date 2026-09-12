import { createHash } from "node:crypto";
import { FINDING_KEY_ORDER } from "./constants.mjs";
import { normalizeLineEndings, stableCompare } from "./normalize.mjs";

function canonicalize(value, preferredKeys = null) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (!value || typeof value !== "object") return value;
  const keys = Object.keys(value);
  const ordered = preferredKeys
    ? [...preferredKeys.filter((key) => keys.includes(key)), ...keys.filter((key) => !preferredKeys.includes(key)).sort(stableCompare)]
    : keys.sort(stableCompare);
  return Object.fromEntries(ordered.map((key) => [key, canonicalize(value[key])]));
}

export function canonicalFinding(finding) {
  const normalized = { ...finding };
  if (Array.isArray(normalized.locations)) {
    normalized.locations = [...normalized.locations].sort((a, b) =>
      stableCompare(`${a.path}:${a.line_start ?? 0}:${a.line_end ?? 0}`, `${b.path}:${b.line_start ?? 0}:${b.line_end ?? 0}`));
  }
  if (Array.isArray(normalized.rules_applied)) normalized.rules_applied = [...normalized.rules_applied].sort(stableCompare);
  return canonicalize(normalized, FINDING_KEY_ORDER);
}

export function canonicalJsonLine(finding) {
  return `${normalizeLineEndings(JSON.stringify(canonicalFinding(finding)))}\n`;
}

export function serializeFindings(findings) {
  return [...findings]
    .map(canonicalFinding)
    .sort((a, b) => stableCompare(`${a.id}:${a.detector}`, `${b.id}:${b.detector}`))
    .map((finding) => JSON.stringify(finding))
    .join("\n") + (findings.length ? "\n" : "");
}

export function stableFindingId({ detector, kind, locations, evidence }) {
  const primary = [...locations]
    .map((location) => `${location.path}:${location.line_start ?? 0}:${location.line_end ?? 0}`)
    .sort(stableCompare);
  const fingerprint = JSON.stringify(canonicalize(evidence));
  const digest = createHash("sha256")
    .update(`${detector}\u0000${kind}\u0000${primary.join("\u0000")}\u0000${fingerprint}`, "utf8")
    .digest("hex")
    .slice(0, 12);
  const prefix = ({ duplication: "dup", "dead-code": "dead", "unused-dep": "dep", cycle: "cyc", complexity: "cog", oversized: "size", "invalid-annotation": "ann" })[kind] ?? "finding";
  return `${prefix}-${digest}`;
}
