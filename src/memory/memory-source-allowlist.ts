import path from "node:path";

import type { LoadMarkdownMemoryRecordsOptions, MemorySourceName } from "./memory-source-types.js";

export type MemorySourceAllowlistErrorCode =
  | "unsupported_source"
  | "path_like_source"
  | "unsafe_source_directory";

export class MemorySourceAllowlistError extends Error {
  constructor(
    public readonly code: MemorySourceAllowlistErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "MemorySourceAllowlistError";
  }
}

export const APPROVED_MARKDOWN_EXPORT_SOURCE: MemorySourceName = "approved_markdown_exports";

export function resolveMemorySourceDirectory(
  source: string,
  options: LoadMarkdownMemoryRecordsOptions = {},
): { source: MemorySourceName; sourceDirectory: string } {
  assertAllowedMemorySource(source);

  const sourceDirectory = options.trustedSourceDirectory
    ? path.resolve(options.trustedSourceDirectory)
    : path.resolve(process.cwd(), "memory", "exports", "approved-markdown");

  assertSafeSourceDirectory(sourceDirectory);

  return {
    source: APPROVED_MARKDOWN_EXPORT_SOURCE,
    sourceDirectory,
  };
}

export function assertAllowedMemorySource(source: string): asserts source is MemorySourceName {
  if (looksLikePath(source)) {
    throw new MemorySourceAllowlistError(
      "path_like_source",
      "Memory source must be a logical allowlist name, not a filesystem path.",
      { source },
    );
  }

  if (source !== APPROVED_MARKDOWN_EXPORT_SOURCE) {
    throw new MemorySourceAllowlistError(
      "unsupported_source",
      `Unsupported memory source '${source}'.`,
      { source, allowedSources: [APPROVED_MARKDOWN_EXPORT_SOURCE] },
    );
  }
}

function assertSafeSourceDirectory(sourceDirectory: string): void {
  if (!path.isAbsolute(sourceDirectory)) {
    throw new MemorySourceAllowlistError(
      "unsafe_source_directory",
      "Resolved memory source directory must be absolute.",
      { sourceDirectory },
    );
  }
}

function looksLikePath(source: string): boolean {
  return (
    path.isAbsolute(source) ||
    source.includes("..") ||
    source.includes("/") ||
    source.includes("\\") ||
    /^[a-zA-Z]:/.test(source)
  );
}
