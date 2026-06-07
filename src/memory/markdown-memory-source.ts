import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  parseMarkdownFrontmatter,
  validateMarkdownMemoryFrontmatter,
} from "./markdown-frontmatter.js";
import { resolveMemorySourceDirectory } from "./memory-source-allowlist.js";
import type {
  LoadMarkdownMemoryRecordsInput,
  LoadMarkdownMemoryRecordsOptions,
  LoadMarkdownMemoryRecordsResult,
  MarkdownMemoryFrontmatter,
  MarkdownMemorySkippedRecord,
} from "./memory-source-types.js";
import type {
  MemoryApprovalStatus,
  MemoryConfidence,
  MemoryRecord,
  MemoryScope,
  MemorySourceKind,
  MemoryType,
} from "./memory-types.js";

export type MarkdownMemorySourceErrorCode =
  | "invalid_memory_type"
  | "invalid_scope"
  | "unsafe_markdown_file";

export class MarkdownMemorySourceError extends Error {
  constructor(
    public readonly code: MarkdownMemorySourceErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "MarkdownMemorySourceError";
  }
}

const MEMORY_TYPES: readonly MemoryType[] = [
  "working_context",
  "run_log",
  "decision",
  "sop",
  "client_profile",
  "project",
  "mistake",
  "research",
  "agent_profile",
  "brand_memory",
  "retrieval_policy",
  "write_policy",
];

const MEMORY_SCOPES: readonly MemoryScope[] = ["system", "tenant", "project", "agent", "run"];

const SOURCE_KINDS: readonly MemorySourceKind[] = [
  "operator_supplied",
  "operator_decision",
  "agent_generated",
  "run_observation",
  "validated_workflow",
  "research_source",
  "obsidian_export",
  "system_event",
];

export async function loadMarkdownMemoryRecords(
  input: LoadMarkdownMemoryRecordsInput,
  options: LoadMarkdownMemoryRecordsOptions = {},
): Promise<LoadMarkdownMemoryRecordsResult> {
  const { source, sourceDirectory } = resolveMemorySourceDirectory(input.source, options);
  const directoryEntries = await readdir(sourceDirectory, { withFileTypes: true });
  const records: MemoryRecord[] = [];
  const skipped: MarkdownMemorySkippedRecord[] = [];

  for (const entry of directoryEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      skipped.push({ fileName: entry.name, reason: "not_markdown" });
      continue;
    }

    assertSafeMarkdownFileName(entry.name);

    const markdownPath = path.join(sourceDirectory, entry.name);
    const markdown = await readFile(markdownPath, "utf-8");
    const parsed = parseMarkdownFrontmatter(markdown);
    const frontmatter = validateMarkdownMemoryFrontmatter(parsed.frontmatter);
    const approvalStatus = normalizeApprovalStatus(frontmatter.status);

    if (approvalStatus === "deprecated" || frontmatter.deprecated_at !== null) {
      skipped.push({ fileName: entry.name, reason: "deprecated" });
      continue;
    }

    if (approvalStatus !== "approved") {
      skipped.push({ fileName: entry.name, reason: "not_approved" });
      continue;
    }

    records.push(mapMarkdownToMemoryRecord(entry.name, frontmatter, parsed.body));
  }

  return {
    source,
    sourceDirectory,
    records,
    skipped,
  };
}

export async function loadApprovedMarkdownRecordsForRouter(
  options: LoadMarkdownMemoryRecordsOptions = {},
): Promise<MemoryRecord[]> {
  const result = await loadMarkdownMemoryRecords({ source: "approved_markdown_exports" }, options);
  return result.records;
}

export function mapMarkdownToMemoryRecord(
  fileName: string,
  frontmatter: MarkdownMemoryFrontmatter,
  body: string,
): MemoryRecord {
  const contentHash = hashText(body);
  const sourceUrl = `memory/exports/approved-markdown/${fileName}`;
  const id = `markdown_${hashText(`${sourceUrl}:${contentHash}`).slice(0, 32)}`;
  const memoryType = normalizeMemoryType(frontmatter.type);
  const scope = normalizeMemoryScope(frontmatter.scope);
  const confidence = normalizeConfidence(frontmatter.confidence);
  const sourceKind = normalizeSourceKind(frontmatter.source);

  return {
    id,
    type: memoryType,
    status: "approved",
    version: frontmatter.version,
    scope,
    title: extractMarkdownTitle(body) ?? fileName.replace(/\.md$/i, ""),
    body,
    content: body,
    ...(frontmatter.tenant_id ? { tenantId: frontmatter.tenant_id } : {}),
    ...(frontmatter.project_id ? { projectId: frontmatter.project_id } : {}),
    ...(frontmatter.agent_id ? { agentId: frontmatter.agent_id } : {}),
    source: {
      kind: sourceKind,
      uri: sourceUrl,
      title: sourceUrl,
      capturedAt: frontmatter.updated_at,
      ...(frontmatter.approved_by ? { capturedBy: frontmatter.approved_by } : {}),
      hash: contentHash,
    },
    confidence,
    tags: frontmatter.tags,
    metadata: {
      sourceName: "approved_markdown_exports",
      frontmatterSource: frontmatter.source,
    },
    createdAt: frontmatter.created_at,
    updatedAt: frontmatter.updated_at,
    contentHash,
    validFrom: frontmatter.created_at,
    ...(frontmatter.deprecated_at ? { validTo: frontmatter.deprecated_at } : {}),
    ...(frontmatter.approved_by ? { approvedBy: frontmatter.approved_by } : {}),
    approvedAt: frontmatter.updated_at,
    ...(frontmatter.deprecated_at ? { deprecatedAt: frontmatter.deprecated_at } : {}),
    requiresApproval: false,
    sourceUrl,
  };
}

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

function normalizeMemoryType(value: string): MemoryType {
  if (MEMORY_TYPES.includes(value as MemoryType)) {
    return value as MemoryType;
  }

  throw new MarkdownMemorySourceError(
    "invalid_memory_type",
    `Unsupported Markdown memory type '${value}'.`,
    { type: value, allowedTypes: MEMORY_TYPES },
  );
}

function normalizeMemoryScope(value: string): MemoryScope {
  const normalized = value === "global" ? "system" : value;
  if (MEMORY_SCOPES.includes(normalized as MemoryScope)) {
    return normalized as MemoryScope;
  }

  throw new MarkdownMemorySourceError(
    "invalid_scope",
    `Unsupported Markdown memory scope '${value}'.`,
    { scope: value, allowedScopes: [...MEMORY_SCOPES, "global"] },
  );
}

function normalizeApprovalStatus(value: string): MemoryApprovalStatus | "review" {
  if (value === "approved" || value === "draft" || value === "deprecated" || value === "rejected") {
    return value;
  }

  if (value === "pending_review" || value === "review") {
    return "review";
  }

  return "rejected";
}

function normalizeConfidence(value: string | number): MemoryConfidence {
  if (typeof value === "string") {
    if (value === "low" || value === "medium" || value === "high") {
      return value;
    }

    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return normalizeConfidence(numeric);
    }

    return "medium";
  }

  if (value >= 0.75) {
    return "high";
  }

  if (value >= 0.4) {
    return "medium";
  }

  return "low";
}

function normalizeSourceKind(value: string): MemorySourceKind {
  if (SOURCE_KINDS.includes(value as MemorySourceKind)) {
    return value as MemorySourceKind;
  }

  return "operator_supplied";
}

function extractMarkdownTitle(body: string): string | undefined {
  const titleLine = body.split(/\r?\n/).find((line) => line.startsWith("# "));
  return titleLine?.replace(/^#\s+/, "").trim();
}

function assertSafeMarkdownFileName(fileName: string): void {
  if (
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    path.isAbsolute(fileName)
  ) {
    throw new MarkdownMemorySourceError(
      "unsafe_markdown_file",
      "Approved Markdown export file names must be local file names.",
      { fileName },
    );
  }
}
