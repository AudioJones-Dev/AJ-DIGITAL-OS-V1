import { getRetrievalDocs, getRetrievalTraces } from "@/lib/api";
import type { RetrievalDocument, RetrievalTrace } from "@/lib/types";

export const dynamic = "force-dynamic";

const NS_COLORS: Record<string, string> = {
  system_docs: "bg-blue-900 text-blue-200",
  client_docs: "bg-indigo-900 text-indigo-200",
  brand_voice: "bg-pink-900 text-pink-200",
  workflow_docs: "bg-purple-900 text-purple-200",
  content_assets: "bg-teal-900 text-teal-200",
  aeo_research: "bg-green-900 text-green-200",
  attribution_memory: "bg-yellow-900 text-yellow-200",
  audit_memory: "bg-orange-900 text-orange-200",
  tool_docs: "bg-zinc-700 text-zinc-200",
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  markdown: "bg-zinc-800 text-zinc-300",
  text: "bg-zinc-800 text-zinc-400",
  json: "bg-blue-900 text-blue-300",
  jsonl: "bg-blue-900 text-blue-300",
};

export default async function RetrievalPage() {
  const [docs, traces] = await Promise.all([
    getRetrievalDocs({ limit: 50 }),
    getRetrievalTraces({ limit: 30 }),
  ]);

  const byNamespace = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.namespace] = (acc[d.namespace] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Operational Retrieval Layer</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {docs.length} documents · {traces.length} search traces · 9 namespaces
        </p>
      </div>

      {/* Namespace distribution */}
      {Object.keys(byNamespace).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byNamespace).map(([ns, count]) => (
            <span key={ns} className={`px-3 py-1 rounded-full text-xs font-medium ${NS_COLORS[ns] ?? "bg-zinc-700 text-zinc-200"}`}>
              {ns} · {count}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Documents</h2>
          {docs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <p className="text-zinc-500 text-sm">No documents ingested.</p>
              <p className="text-zinc-700 text-xs mt-2">
                node dist/cli.js retrieval-ingest --namespace system_docs --title "Doc" --sourceType markdown --content "..."
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.slice(0, 20).map((doc: RetrievalDocument) => (
                <div
                  key={doc.documentId}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 font-medium truncate">{doc.title}</p>
                      <p className="font-mono text-zinc-600 text-xs mt-0.5">{doc.documentId.slice(0, 16)}…</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${NS_COLORS[doc.namespace] ?? "bg-zinc-700 text-zinc-200"}`}>
                        {doc.namespace}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_TYPE_COLORS[doc.sourceType] ?? "bg-zinc-800 text-zinc-400"}`}>
                        {doc.sourceType}
                      </span>
                    </div>
                  </div>
                  {doc.version && (
                    <p className="text-xs text-zinc-600 mt-1">v{doc.version}</p>
                  )}
                </div>
              ))}
              {docs.length > 20 && (
                <p className="text-xs text-zinc-600 px-1">+{docs.length - 20} more documents</p>
              )}
            </div>
          )}
        </div>

        {/* Search Traces */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Search Traces</h2>
          {traces.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <p className="text-zinc-500 text-sm">No search traces yet.</p>
              <p className="text-zinc-700 text-xs mt-2">
                node dist/cli.js retrieval-search --query "..." --namespaces system_docs
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Query</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Results</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Namespaces</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.slice(0, 15).map((trace: RetrievalTrace) => (
                    <tr key={trace.traceId} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="px-4 py-2 text-zinc-300 text-xs max-w-[160px] truncate">
                        {trace.query}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${trace.resultCount > 0 ? "bg-emerald-900 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>
                          {trace.resultCount}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {trace.namespaces.slice(0, 2).map((ns) => (
                            <span key={ns} className="text-xs text-zinc-600 font-mono">{ns}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">
                        {new Date(trace.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
