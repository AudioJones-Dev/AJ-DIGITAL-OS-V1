import type {
  MarkdownFrontmatterValue,
  MarkdownMemoryFrontmatter,
  ParsedMarkdownFrontmatter,
} from "./memory-source-types.js";

export type MarkdownFrontmatterErrorCode =
  | "missing_frontmatter"
  | "unterminated_frontmatter"
  | "invalid_frontmatter_line"
  | "missing_required_field"
  | "invalid_required_field";

export class MarkdownFrontmatterError extends Error {
  constructor(
    public readonly code: MarkdownFrontmatterErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "MarkdownFrontmatterError";
  }
}

const REQUIRED_FIELDS = [
  "type",
  "status",
  "version",
  "scope",
  "source",
  "confidence",
  "created_at",
  "updated_at",
  "tags",
] as const;

export function parseMarkdownFrontmatter(markdown: string): ParsedMarkdownFrontmatter {
  const normalized = markdown.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);

  if (lines[0]?.trim() !== "---") {
    throw new MarkdownFrontmatterError("missing_frontmatter", "Markdown memory record is missing frontmatter.");
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex === -1) {
    throw new MarkdownFrontmatterError("unterminated_frontmatter", "Markdown memory frontmatter is not closed.");
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n").trim();
  const frontmatter: Record<string, MarkdownFrontmatterValue> = {};

  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) {
      throw new MarkdownFrontmatterError(
        "invalid_frontmatter_line",
        `Invalid frontmatter line '${trimmed}'.`,
        { line: trimmed },
      );
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    frontmatter[key] = parseFrontmatterValue(rawValue);
  }

  return { frontmatter, body };
}

export function validateMarkdownMemoryFrontmatter(
  frontmatter: Record<string, MarkdownFrontmatterValue>,
): MarkdownMemoryFrontmatter {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in frontmatter)) {
      throw new MarkdownFrontmatterError(
        "missing_required_field",
        `Markdown memory frontmatter is missing required field '${field}'.`,
        { field },
      );
    }
  }

  const tagsValue = frontmatter["tags"];
  if (!Array.isArray(tagsValue) || tagsValue.some((tag) => typeof tag !== "string")) {
    throw new MarkdownFrontmatterError(
      "invalid_required_field",
      "Markdown memory frontmatter field 'tags' must be a string array.",
      { field: "tags", value: tagsValue },
    );
  }
  const tags = tagsValue as string[];

  const type = requireString(frontmatter, "type");
  const status = requireString(frontmatter, "status");
  const version = requireNumber(frontmatter, "version");
  const scope = requireString(frontmatter, "scope");
  const source = requireString(frontmatter, "source");
  const confidence = requireConfidence(frontmatter);
  const createdAt = requireString(frontmatter, "created_at");
  const updatedAt = requireString(frontmatter, "updated_at");

  return {
    type,
    status,
    version,
    scope,
    tenant_id: optionalString(frontmatter, "tenant_id"),
    project_id: optionalString(frontmatter, "project_id"),
    agent_id: optionalString(frontmatter, "agent_id"),
    source,
    confidence,
    created_at: createdAt,
    updated_at: updatedAt,
    approved_by: optionalString(frontmatter, "approved_by"),
    deprecated_at: optionalString(frontmatter, "deprecated_at"),
    tags,
  };
}

export function parseFrontmatterValue(rawValue: string): MarkdownFrontmatterValue {
  if (rawValue === "" || rawValue.toLowerCase() === "null") {
    return null;
  }

  if (rawValue.toLowerCase() === "true") {
    return true;
  }

  if (rawValue.toLowerCase() === "false") {
    return false;
  }

  if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
    const inner = rawValue.slice(1, -1).trim();
    if (inner.length === 0) {
      return [];
    }

    return inner.split(",").map((entry) => parseScalarValue(entry.trim()));
  }

  return parseScalarValue(rawValue);
}

type MarkdownFrontmatterScalar = string | number | boolean | null;

function parseScalarValue(rawValue: string): MarkdownFrontmatterScalar {
  const unquoted = stripQuotes(rawValue);
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) {
    return Number(unquoted);
  }

  if (unquoted.toLowerCase() === "null") {
    return null;
  }

  if (unquoted.toLowerCase() === "true") {
    return true;
  }

  if (unquoted.toLowerCase() === "false") {
    return false;
  }

  return unquoted;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function requireString(
  frontmatter: Record<string, MarkdownFrontmatterValue>,
  field: keyof MarkdownMemoryFrontmatter,
): string {
  const value = frontmatter[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MarkdownFrontmatterError(
      "invalid_required_field",
      `Markdown memory frontmatter field '${field}' must be a non-empty string.`,
      { field, value },
    );
  }

  return value;
}

function requireNumber(
  frontmatter: Record<string, MarkdownFrontmatterValue>,
  field: keyof MarkdownMemoryFrontmatter,
): number {
  const value = frontmatter[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MarkdownFrontmatterError(
      "invalid_required_field",
      `Markdown memory frontmatter field '${field}' must be a number.`,
      { field, value },
    );
  }

  return value;
}

function requireConfidence(frontmatter: Record<string, MarkdownFrontmatterValue>): string | number {
  const value = frontmatter["confidence"];
  if (typeof value !== "string" && typeof value !== "number") {
    throw new MarkdownFrontmatterError(
      "invalid_required_field",
      "Markdown memory frontmatter field 'confidence' must be a string or number.",
      { field: "confidence", value },
    );
  }

  return value;
}

function optionalString(
  frontmatter: Record<string, MarkdownFrontmatterValue>,
  field: keyof MarkdownMemoryFrontmatter,
): string | null {
  const value = frontmatter[field];
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null;
  }

  throw new MarkdownFrontmatterError(
    "invalid_required_field",
    `Markdown memory frontmatter field '${field}' must be a string or null.`,
    { field, value },
  );
}
