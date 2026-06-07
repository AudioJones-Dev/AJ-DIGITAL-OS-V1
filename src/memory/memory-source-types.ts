import type { MemoryRecord } from "./memory-types.js";

export type MemorySourceName = "approved_markdown_exports";

export interface LoadMarkdownMemoryRecordsInput {
  source: MemorySourceName | string;
}

export interface LoadMarkdownMemoryRecordsOptions {
  trustedSourceDirectory?: string;
}

export interface LoadMarkdownMemoryRecordsResult {
  source: MemorySourceName;
  sourceDirectory: string;
  records: MemoryRecord[];
  skipped: MarkdownMemorySkippedRecord[];
}

export interface MarkdownMemorySkippedRecord {
  fileName: string;
  reason: "not_markdown" | "not_approved" | "deprecated";
}

export interface ParsedMarkdownFrontmatter {
  frontmatter: Record<string, MarkdownFrontmatterValue>;
  body: string;
}

export type MarkdownFrontmatterValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

export interface MarkdownMemoryFrontmatter {
  type: string;
  status: string;
  version: number;
  scope: string;
  tenant_id: string | null;
  project_id: string | null;
  agent_id: string | null;
  source: string;
  confidence: string | number;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  deprecated_at: string | null;
  tags: string[];
}
