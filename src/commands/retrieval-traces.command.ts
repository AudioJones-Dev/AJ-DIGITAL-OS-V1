import { listRetrievalTraces } from "../retrieval/retrieval-store.js";
import type { RetrievalTrace } from "../retrieval/retrieval-types.js";

export interface RetrievalTracesCommandInput {
  tenantId?: string;
  runId?: string;
  limit?: number;
  json?: boolean;
}

export interface RetrievalTracesCommandResult {
  ok: boolean;
  traces?: RetrievalTrace[];
  error?: string;
}

export class RetrievalTracesCommand {
  async run(input: RetrievalTracesCommandInput): Promise<RetrievalTracesCommandResult> {
    try {
      const filter: Parameters<typeof listRetrievalTraces>[0] = {};
      if (input.tenantId !== undefined) filter.tenantId = input.tenantId;
      if (input.runId !== undefined) filter.runId = input.runId;
      if (input.limit !== undefined) filter.limit = input.limit;
      const traces = listRetrievalTraces(filter);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, traces }, null, 2));
      } else if (traces.length === 0) {
        console.log("No retrieval traces found.");
      } else {
        console.log(`Traces (${traces.length}):`);
        for (const t of traces) {
          console.log(
            `  [${t.createdAt}] ${t.traceId} — query="${t.query}" results=${t.resultCount} ns=${t.namespaces.join(",")}`,
          );
        }
      }
      return { ok: true, traces };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
      else console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
