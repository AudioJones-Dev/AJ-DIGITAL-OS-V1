import { getChunksByDocument, getDocument } from "../retrieval/retrieval-store.js";
import type { RetrievalChunk, RetrievalDocument } from "../retrieval/retrieval-types.js";

export interface RetrievalInspectDocCommandInput {
  documentId: string;
  json?: boolean;
}

export interface RetrievalInspectDocCommandResult {
  ok: boolean;
  document?: RetrievalDocument;
  chunks?: RetrievalChunk[];
  error?: string;
}

export class RetrievalInspectDocCommand {
  async run(input: RetrievalInspectDocCommandInput): Promise<RetrievalInspectDocCommandResult> {
    try {
      const document = getDocument(input.documentId);
      if (!document) {
        const error = `Document not found: ${input.documentId}`;
        if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
        else console.error(error);
        return { ok: false, error };
      }
      const chunks = getChunksByDocument(input.documentId);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, document, chunks }, null, 2));
      } else {
        console.log(`Document: ${document.documentId}`);
        console.log(`  title:     ${document.title}`);
        console.log(`  namespace: ${document.namespace}`);
        console.log(`  tenant:    ${document.tenantId ?? "(global)"}`);
        console.log(`  source:    ${document.sourceType} ${document.sourceUri ?? ""}`);
        console.log(`  hash:      ${document.hash}`);
        console.log(`  chunks:    ${chunks.length}`);
        for (const c of chunks) {
          const preview = c.text.length > 120 ? `${c.text.slice(0, 120)}…` : c.text;
          console.log(`    - ${c.chunkId} (~${c.tokenCount} tok) ${preview.replace(/\n/g, " ")}`);
        }
      }
      return { ok: true, document, chunks };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      if (input.json) console.log(JSON.stringify({ ok: false, error }, null, 2));
      else console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
