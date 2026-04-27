import {
  getCoreHealth,
  getMetrics,
  getControlRuns,
  getDagRuns,
  getSystemEvents,
  getMapEvaluations,
  getRetrievalDocs,
  getCacheEntries,
} from "@/lib/api";
import type { MetricsSnapshot, CoreHealth, ControlRunRecord, BelDagRunState } from "@/lib/types";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
  color = "text-zinc-100",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function StateChip({ state }: { state: string }) {
  const colors: Record<string, string> = {
    queued: "bg-zinc-700 text-zinc-200",
    planning: "bg-blue-900 text-blue-200",
    running: "bg-green-900 text-green-200",
    waiting_for_approval: "bg-yellow-900 text-yellow-200",
    retrying: "bg-orange-900 text-orange-200",
    escalated: "bg-red-900 text-red-200",
    completed: "bg-emerald-900 text-emerald-200",
    failed: "bg-red-950 text-red-300",
    cancelled: "bg-zinc-800 text-zinc-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[state] ?? "bg-zinc-700 text-zinc-200"}`}>
      {state}
    </span>
  );
}

function ModuleChip({ name, version, ok }: { name: string; version: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
        ok
          ? "bg-emerald-950 border-emerald-900 text-emerald-300"
          : "bg-red-950 border-red-900 text-red-300"
      }`}
    >
      <span className={ok ? "text-emerald-500" : "text-red-500"}>●</span>
      {name} <span className="opacity-60">{version}</span>
    </span>
  );
}

export default async function CommandPage() {
  const [health, metrics, controlRuns, dagRuns, recentEvents, evaluations, docs, cacheEntries] =
    await Promise.allSettled([
      getCoreHealth(),
      getMetrics(),
      getControlRuns(),
      getDagRuns({ limit: 5 }),
      getSystemEvents({ limit: 20 }),
      getMapEvaluations(5),
      getRetrievalDocs({ limit: 5 }),
      getCacheEntries("context-cache"),
    ]);

  const h = health.status === "fulfilled" ? health.value : null;
  const m = metrics.status === "fulfilled" ? metrics.value : null;
  const runs = controlRuns.status === "fulfilled" ? controlRuns.value : [];
  const dags = dagRuns.status === "fulfilled" ? dagRuns.value : [];
  const events = recentEvents.status === "fulfilled" ? recentEvents.value : [];
  const evals = evaluations.status === "fulfilled" ? evaluations.value : [];
  const rdocs = docs.status === "fulfilled" ? docs.value : [];

  const activeRuns = runs.filter((r) => !["completed", "failed", "cancelled"].includes(r.controlState));
  const failedRuns = runs.filter((r) => r.controlState === "failed");
  const pendingApproval = runs.filter((r) => r.controlState === "waiting_for_approval");

  const policyBlock = m?.policy_block_count ?? 0;
  const policyAllow = m?.policy_allow_count ?? 0;
  const policyTotal = policyBlock + policyAllow;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Command Center</h1>
          <p className="text-zinc-500 text-sm mt-0.5">AJ Digital OS — Operator View</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              h?.ok ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"
            }`}
          >
            {h?.ok ? "OS Online" : "OS Offline"}
          </span>
          <span className="text-xs text-zinc-600">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Core Modules */}
      {h?.modules && (
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Core Modules
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(h.modules).map(([name, version]) => (
              <ModuleChip key={name} name={name} version={String(version)} ok={true} />
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          System Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Active Runs"
            value={activeRuns.length}
            color={activeRuns.length > 0 ? "text-green-400" : "text-zinc-100"}
          />
          <StatCard
            label="Pending Approval"
            value={pendingApproval.length}
            color={pendingApproval.length > 0 ? "text-yellow-400" : "text-zinc-100"}
          />
          <StatCard
            label="Failed Runs"
            value={failedRuns.length}
            color={failedRuns.length > 0 ? "text-red-400" : "text-zinc-100"}
          />
          <StatCard
            label="Policy Blocks"
            value={policyBlock}
            sub={policyTotal > 0 ? `${Math.round((policyBlock / policyTotal) * 100)}% of decisions` : undefined}
            color={policyBlock > 0 ? "text-red-400" : "text-zinc-100"}
          />
          <StatCard
            label="Events"
            value={m?.system_event_count ?? "—"}
          />
          <StatCard
            label="Attribution"
            value={m?.attribution_emit_count ?? "—"}
            sub={m?.attribution_failure_count ? `${m.attribution_failure_count} failures` : undefined}
          />
        </div>
      </div>

      {/* Two-column: Active Runs + Recent DAG Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Control Runs */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Recent Control Runs
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {runs.length === 0 ? (
              <p className="text-zinc-600 text-sm p-4">No control runs.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Run</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">State</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 8).map((run: ControlRunRecord) => (
                    <tr key={run.runId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2">
                        <a
                          href={`/runs/${run.runId}`}
                          className="font-mono text-xs text-zinc-300 hover:text-indigo-400"
                        >
                          {run.runId.slice(0, 12)}…
                        </a>
                      </td>
                      <td className="px-4 py-2">
                        <StateChip state={run.controlState} />
                      </td>
                      <td className="px-4 py-2 text-zinc-600 text-xs">
                        {new Date(run.updatedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent DAG Runs */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Recent DAG Runs
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {dags.length === 0 ? (
              <p className="text-zinc-600 text-sm p-4">No DAG runs.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">DAG</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Nodes</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dags.map((dag: BelDagRunState) => (
                    <tr key={dag.runId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2">
                        <a
                          href={`/dag/${dag.runId}`}
                          className="font-mono text-xs text-zinc-300 hover:text-indigo-400"
                        >
                          {dag.runId.slice(0, 12)}…
                        </a>
                      </td>
                      <td className="px-4 py-2 text-zinc-400 text-xs">{dag.nodes.length}</td>
                      <td className="px-4 py-2">
                        <StateChip state={dag.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Two-column: Recent Decisions + Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MAP Evaluations */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Recent MAP Evaluations
          </h2>
          <div className="space-y-2">
            {evals.length === 0 ? (
              <p className="text-zinc-600 text-sm">No evaluations.</p>
            ) : (
              evals.map((ev) => (
                <div
                  key={ev.evaluationId}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-zinc-200 font-medium truncate max-w-[200px]">{ev.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{ev.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-bold text-indigo-400">{ev.mapScore}/9</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        ev.decisionBand === "strong_alignment"
                          ? "bg-emerald-900 text-emerald-300"
                          : ev.decisionBand === "moderate_alignment"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-red-900 text-red-300"
                      }`}
                    >
                      {ev.decision}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Events */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Recent System Events
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {events.length === 0 ? (
              <p className="text-zinc-600 text-sm p-4">No system events.</p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {events.slice(0, 8).map((ev) => (
                  <div key={ev.eventId} className="px-4 py-2 flex items-start gap-3">
                    <span
                      className={`mt-0.5 text-xs px-1.5 py-0.5 rounded shrink-0 ${
                        ev.category === "error"
                          ? "bg-red-900 text-red-300"
                          : ev.category === "policy"
                          ? "bg-yellow-900 text-yellow-300"
                          : ev.category === "state"
                          ? "bg-blue-900 text-blue-300"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {ev.category}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{ev.eventType}</p>
                      <p className="text-xs text-zinc-600">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Retrieval + Cache summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retrieval Docs */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Retrieval Layer
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            {rdocs.length === 0 ? (
              <p className="text-zinc-600 text-sm">No documents ingested.</p>
            ) : (
              <div className="space-y-2">
                {rdocs.slice(0, 4).map((doc) => (
                  <div key={doc.documentId} className="flex items-center justify-between">
                    <p className="text-xs text-zinc-300 truncate max-w-[200px]">{doc.title}</p>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono shrink-0">
                      {doc.namespace}
                    </span>
                  </div>
                ))}
                {rdocs.length > 4 && (
                  <a href="/retrieval" className="text-xs text-indigo-400 hover:underline">
                    +{rdocs.length - 4} more →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/control", label: "Control Plane", desc: `${runs.length} runs` },
              { href: "/dag", label: "DAG Engine", desc: `${dags.length} runs` },
              { href: "/decision", label: "MAP-CERA", desc: `${evals.length} evaluations` },
              { href: "/retrieval", label: "RAG Layer", desc: `${rdocs.length} documents` },
              { href: "/cache", label: "CAG Cache", desc: "5 namespaces" },
              { href: "/events", label: "Event Ledger", desc: `${events.length} events` },
              { href: "/governance", label: "Governance", desc: "Policies & rules" },
              { href: "/apps", label: "Applications", desc: "Offer · Diagnostic · Content" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 hover:border-indigo-800 hover:bg-zinc-800/50 transition-colors"
              >
                <p className="text-sm font-medium text-zinc-200">{link.label}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{link.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
