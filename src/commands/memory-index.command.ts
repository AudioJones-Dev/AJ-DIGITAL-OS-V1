import { readFile } from "node:fs/promises";

import { SemanticMemoryIndexer } from "../memory/semantic-memory-indexer.js";
import type { SemanticMemoryIngestionResult } from "../memory/semantic-memory-types.js";

export interface MemoryIndexCommandInput {
  rebuild?: boolean;
  text?: string;
  filePath?: string;
  url?: string;
  kind?: string;
  label?: string;
  brandId?: string;
  clientId?: string;
  json?: boolean;
}

export interface MemoryIndexCommandResult {
  ok: boolean;
  command: "memory-index";
  rendered: boolean;
  mode: "rebuild" | "ingest";
  indexedCount: number;
  chunkIds: string[];
  warnings: string[];
  errors: string[];
}

export class MemoryIndexCommand {
  constructor(private readonly indexer = new SemanticMemoryIndexer()) {}

  async run(input: MemoryIndexCommandInput = {}): Promise<MemoryIndexCommandResult> {
    try {
      const ingestPayload = await this.resolveIngestPayload(input);
      const result = ingestPayload
        ? await this.indexer.ingestKnowledge(ingestPayload)
        : await this.indexer.rebuildFromLocalState();

      return this.render({
        ok: true,
        command: "memory-index",
        rendered: true,
        mode: ingestPayload ? "ingest" : "rebuild",
        indexedCount: result.indexedCount,
        chunkIds: result.chunkIds,
        warnings: result.warnings,
        errors: [],
      }, input.json);
    } catch (error) {
      return this.render({
        ok: false,
        command: "memory-index",
        rendered: true,
        mode: "ingest",
        indexedCount: 0,
        chunkIds: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : "Unknown memory indexing error."],
      }, input.json);
    }
  }

  private async resolveIngestPayload(input: MemoryIndexCommandInput): Promise<{
    text: string;
    label?: string;
    sourceType?: "ingested_text" | "ingested_transcript" | "ingested_url";
    sourceUri?: string;
    brandId?: string;
    clientId?: string;
    metadata?: Record<string, unknown>;
  } | undefined> {
    if (input.rebuild && !input.text && !input.filePath && !input.url) {
      return undefined;
    }

    if (input.text?.trim()) {
      return {
        text: input.text.trim(),
        ...(input.label?.trim() ? { label: input.label.trim() } : {}),
        sourceType: normalizeIngestionKind(input.kind),
        ...(input.brandId ? { brandId: input.brandId } : {}),
        ...(input.clientId ? { clientId: input.clientId } : {}),
      };
    }

    if (input.filePath?.trim()) {
      const filePath = input.filePath.trim();
      const fileText = await readFile(filePath, "utf-8");
      return {
        text: fileText,
        label: input.label?.trim() || filePath,
        sourceType: normalizeIngestionKind(input.kind),
        sourceUri: filePath,
        ...(input.brandId ? { brandId: input.brandId } : {}),
        ...(input.clientId ? { clientId: input.clientId } : {}),
      };
    }

    if (input.url?.trim()) {
      const url = input.url.trim();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch "${url}" for memory ingestion: ${response.status} ${response.statusText}.`);
      }
      const html = await response.text();
      return {
        text: stripHtml(html),
        label: input.label?.trim() || url,
        sourceType: "ingested_url",
        sourceUri: url,
        ...(input.brandId ? { brandId: input.brandId } : {}),
        ...(input.clientId ? { clientId: input.clientId } : {}),
      };
    }

    return undefined;
  }

  private render(result: MemoryIndexCommandResult, json?: boolean): MemoryIndexCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS MEMORY INDEX");
    console.log("==========================");
    console.log(`Mode: ${result.mode}`);
    console.log(`Indexed Chunks: ${result.indexedCount}`);
    for (const warning of result.warnings) {
      console.log(`Warning: ${warning}`);
    }
    for (const error of result.errors) {
      console.log(`Error: ${error}`);
    }
    return result;
  }
}

const normalizeIngestionKind = (value: string | undefined): "ingested_text" | "ingested_transcript" | "ingested_url" => {
  switch (value?.trim().toLowerCase()) {
    case "transcript":
    case "ingested_transcript":
      return "ingested_transcript";
    case "url":
    case "ingested_url":
      return "ingested_url";
    default:
      return "ingested_text";
  }
};

const stripHtml = (value: string): string => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();
