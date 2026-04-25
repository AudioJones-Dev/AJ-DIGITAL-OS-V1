import { searchRetrieval } from "../retrieval/retrieval-search.js";
import type {
  RetrievalEnvironment,
  RetrievalNamespace,
  RetrievalSearchRequest,
  RetrievalSearchResponse,
} from "../retrieval/retrieval-types.js";

export interface RetrievalSearchCommandInput {
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

export interface RetrievalSearchCommandResult {
  ok: boolean;
  response?: RetrievalSearchResponse;
  error?: string;
}

export class RetrievalSearchCommand {
  async run(input: RetrievalSearchCommandInput): Promise<RetrievalSearchCommandResult> {
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
      const response = await searchRetrieval(searchRequest);

      if (input.json) {
        console.log(JSON.stringify({ ok: response.ok, response }, null, 2));
      } else if (!response.ok) {
        console.error(`Search blocked: ${response.error ?? "unknown"}`);
      } else if (response.results.length === 0) {
        console.log("No results.");
      } else {
        console.log(`Results (${response.results.length}):`);
        for (const r of response.results) {
          console.log(`  [${r.score.toFixed(2)}] ${r.title} — ${r.namespace}`);
          console.log(`    chunkId: ${r.chunkId}`);
          const preview = r.text.length > 200 ? `${r.text.slice(0, 200)}…` : r.text;
          console.log(`    text:    ${preview.replace(/\n/g, " ")}`);
        }
        if (response.policyMeta.warnings.length > 0) {
          console.log(`Warnings:`);
          for (const w of response.policyMeta.warnings) console.log(`  - ${w}`);
        }
      }
      return { ok: response.ok, response };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
      else console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
