import { createContextPack } from "../retrieval/retrieval-context.js";
import type {
  RetrievalContextPack,
  RetrievalEnvironment,
  RetrievalNamespace,
  RetrievalSearchRequest,
} from "../retrieval/retrieval-types.js";

export interface RetrievalContextCommandInput {
  query: string;
  namespaces: RetrievalNamespace[];
  environment: RetrievalEnvironment;
  maxResults: number;
  minScore?: number;
  tenantId?: string;
  runId?: string;
  actor?: string;
  json?: boolean;
}

export interface RetrievalContextCommandResult {
  ok: boolean;
  pack?: RetrievalContextPack;
  error?: string;
}

export class RetrievalContextCommand {
  async run(input: RetrievalContextCommandInput): Promise<RetrievalContextCommandResult> {
    try {
      const searchRequest: RetrievalSearchRequest = {
        query: input.query,
        namespaces: input.namespaces,
        environment: input.environment,
        maxResults: input.maxResults,
        ...(input.minScore !== undefined ? { minScore: input.minScore } : {}),
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        ...(input.runId !== undefined ? { runId: input.runId } : {}),
        ...(input.actor !== undefined ? { actor: input.actor } : {}),
      };
      const pack = await createContextPack(searchRequest);

      if (input.json) {
        console.log(JSON.stringify({ ok: pack.policyMeta.approved, pack }, null, 2));
      } else if (!pack.policyMeta.approved) {
        console.error(`Context pack blocked: ${pack.policyMeta.reason ?? "unknown"}`);
      } else {
        console.log(`Context pack: ${pack.results.length} chunks, ${pack.sourceMeta.length} docs`);
        console.log(`  traceId: ${pack.retrievalTraceId}`);
        console.log(`  citations:`);
        for (const c of pack.citations) {
          console.log(`    - ${c.title} (${c.documentId})`);
        }
      }
      return { ok: pack.policyMeta.approved, pack };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
      else console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
