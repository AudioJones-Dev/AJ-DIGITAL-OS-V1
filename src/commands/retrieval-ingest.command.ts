import { readFileSync } from "node:fs";

import { ingestDocument } from "../retrieval/retrieval-ingestor.js";
import type {
  RetrievalEnvironment,
  RetrievalIngestRequest,
  RetrievalIngestResult,
  RetrievalNamespace,
  RetrievalSourceType,
} from "../retrieval/retrieval-types.js";

export interface RetrievalIngestCommandInput {
  namespace: RetrievalNamespace;
  title: string;
  sourceType: RetrievalSourceType;
  filePath?: string;
  content?: string;
  tenantId?: string;
  sourceUri?: string;
  version?: string;
  actor?: string;
  environment?: RetrievalEnvironment;
  json?: boolean;
}

export interface RetrievalIngestCommandResult {
  ok: boolean;
  result?: RetrievalIngestResult;
  error?: string;
}

export class RetrievalIngestCommand {
  async run(input: RetrievalIngestCommandInput): Promise<RetrievalIngestCommandResult> {
    try {
      let content = input.content;
      if (!content && input.filePath) {
        content = readFileSync(input.filePath, "utf-8");
      }
      if (!content) {
        const error = "either --content or --file is required";
        if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
        else console.error(`Error: ${error}`);
        return { ok: false, error };
      }

      const ingestRequest: RetrievalIngestRequest = {
        namespace: input.namespace,
        title: input.title,
        content,
        sourceType: input.sourceType,
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        ...(input.sourceUri !== undefined ? { sourceUri: input.sourceUri } : {}),
        ...(input.version !== undefined ? { version: input.version } : {}),
        ...(input.actor !== undefined ? { actor: input.actor } : {}),
        ...(input.environment !== undefined ? { environment: input.environment } : {}),
      };
      const result = await ingestDocument(ingestRequest);

      if (input.json) {
        console.log(JSON.stringify({ ok: result.ok, result }, null, 2));
      } else if (result.ok) {
        console.log(`Ingested document: ${result.documentId}`);
        console.log(`  chunks: ${result.chunkCount}`);
        console.log(`  hash:   ${result.hash}`);
        if (result.policyMeta && result.policyMeta.warnings.length > 0) {
          console.log(`  warnings:`);
          for (const w of result.policyMeta.warnings) console.log(`    - ${w}`);
        }
      } else {
        console.error(`Ingest failed: ${result.error}`);
      }
      return { ok: result.ok, result };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
      else console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
