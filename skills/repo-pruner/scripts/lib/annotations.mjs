import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { finalizeNormalizedRecords } from "./records.mjs";
import { stableCompare } from "./normalize.mjs";
import { parse } from "@typescript-eslint/parser";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);
const SKIP_DIRECTORIES = new Set([".git", ".pruner", "node_modules", "dist", ".next", "coverage"]);
const PLACEHOLDER_REASON = /^(?:todo|tbd|none|n\/?a|placeholder|reason|fixme|unknown)[.!]?$/iu;

async function sourceFiles(repoRoot, current = repoRoot) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => stableCompare(a.name, b.name))) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) files.push(...await sourceFiles(repoRoot, join(current, entry.name)));
      continue;
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(join(current, entry.name));
  }
  return files;
}

const stripComment = (line) => line.replace(/^\s*\/\/\s?/u, "").trim();

function annotationFromLines(lines, index) {
  const first = stripComment(lines[index]);
  const match = first.match(/@pruner-ignore:\s*([a-z-]+)/iu);
  if (!match) return null;
  const block = [first];
  let cursor = index + 1;
  while (cursor < lines.length && /^\s*\/\//u.test(lines[cursor])) {
    block.push(stripComment(lines[cursor]));
    cursor += 1;
  }
  const joined = block.join(" ");
  const reasonMatch = joined.match(/\breason:\s*(.+)$/iu);
  const reason = reasonMatch?.[1]?.trim() ?? "";
  const reasonValid = reason.length >= 12 && !PLACEHOLDER_REASON.test(reason);
  return {
    kind: match[1].toLowerCase(),
    line_start: index + 1,
    line_end: cursor,
    reason,
    reason_valid: reasonValid,
  };
}

function bindTargets(contents, path, annotations) {
  let program;
  try {
    program = parse(contents, {
      comment: false,
      ecmaVersion: 2024,
      jsx: /\.[jt]sx$/u.test(path),
      loc: true,
      range: true,
      sourceType: "module",
    });
  } catch (error) {
    throw new Error(`annotation-parse-error:${path}`, { cause: error });
  }
  const candidates = [];
  const seen = new WeakSet();
  const visit = (value) => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (typeof value.type === "string" && value.loc && /(?:Declaration|Statement|Definition)$/u.test(value.type)) candidates.push(value);
    for (const [key, child] of Object.entries(value)) {
      if (["loc", "range", "tokens", "comments"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  };
  visit(program);
  candidates.sort((left, right) =>
    left.loc.start.line - right.loc.start.line
    || right.loc.end.line - left.loc.end.line
    || stableCompare(left.type, right.type));
  return annotations.map((annotation) => {
    const target = candidates.find((node) => node.loc.start.line > annotation.line_end);
    const supported = annotation.kind === "duplication";
    return {
      ...annotation,
      target_start: target?.loc?.start.line ?? null,
      target_end: target?.loc?.end.line ?? null,
      valid: annotation.reason_valid && supported && Boolean(target?.loc),
    };
  });
}

export async function scanPrunerAnnotations(repoRoot) {
  const root = resolve(repoRoot);
  const annotations = [];
  for (const absolute of await sourceFiles(root)) {
    const path = relative(root, absolute).split(sep).join("/");
    const contents = await readFile(absolute, "utf8");
    const lines = contents.split(/\r?\n/u);
    const fileAnnotations = [];
    for (let index = 0; index < lines.length; index += 1) {
      const annotation = annotationFromLines(lines, index);
      if (annotation) fileAnnotations.push({ ...annotation, path });
    }
    annotations.push(...bindTargets(contents, path, fileAnnotations));
  }
  annotations.sort((left, right) => stableCompare(`${left.path}:${left.line_start}`, `${right.path}:${right.line_start}`));
  const invalidRecords = finalizeNormalizedRecords(annotations.filter((item) => !item.valid).map((item) => ({
    detector: "annotation-scanner",
    kind: "invalid-annotation",
    locations: [{ path: item.path, line_start: item.line_start, line_end: item.line_end }],
    evidence: {
      annotation: `@pruner-ignore: ${item.kind}`,
      reason_present: item.reason.length > 0,
      target_present: item.target_start !== null,
      supported_kind: item.kind === "duplication",
    },
  })));
  const validByPath = new Map();
  for (const item of annotations.filter((candidate) => candidate.valid)) {
    const items = validByPath.get(item.path) ?? [];
    items.push(item);
    validByPath.set(item.path, items);
  }
  return {
    annotations,
    invalidRecords,
    invalidPaths: new Set(annotations.filter((item) => !item.valid).map((item) => item.path)),
    validByPath,
  };
}

export function hasValidAnnotation(record, scan) {
  if (record.kind !== "duplication") return false;
  return record.locations.every((location) => {
    if (!Number.isInteger(location.line_start) || !Number.isInteger(location.line_end)) return false;
    return (scan.validByPath.get(location.path) ?? []).some((annotation) =>
      annotation.kind === "duplication"
      && annotation.target_start <= location.line_end
      && annotation.target_end >= location.line_start);
  });
}
