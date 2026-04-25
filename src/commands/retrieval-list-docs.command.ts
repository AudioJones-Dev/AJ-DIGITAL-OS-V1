import { listDocuments } from "../retrieval/retrieval-store.js";
import type { RetrievalDocument, RetrievalNamespace } from "../retrieval/retrieval-types.js";

export interface RetrievalListDocsCommandInput {
  namespace?: RetrievalNamespace;
  tenantId?: string;
  limit?: number;
  json?: boolean;
}

export interface RetrievalListDocsCommandResult {
  ok: boolean;
  documents?: RetrievalDocument[];
  error?: string;
}

export class RetrievalListDocsCommand {
  async run(input: RetrievalListDocsCommandInput): Promise<RetrievalListDocsCommandResult> {
    try {
      const filter: Parameters<typeof listDocuments>[0] = {};
      if (input.namespace !== undefined) filter.namespace = input.namespace;
      if (input.tenantId !== undefined) filter.tenantId = input.tenantId;
      if (input.limit !== undefined) filter.limit = input.limit;
      const documents = listDocuments(filter);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, documents }, null, 2));
      } else if (documents.length === 0) {
        console.log("No retrieval documents found.");
      } else {
        console.log(`Documents (${documents.length}):`);
        for (const d of documents) {
          const tenant = d.tenantId ? ` tenant=${d.tenantId}` : " (global)";
          console.log(`  [${d.namespace}]${tenant} ${d.title} — ${d.documentId}`);
          console.log(`    updated=${d.updatedAt} hash=${d.hash.slice(0, 12)}…`);
        }
      }
      return { ok: true, documents };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
      else console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
