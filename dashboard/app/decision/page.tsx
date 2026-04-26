import { getMapEvaluations, getCeraCycles } from "@/lib/api";
import type { MapEvaluation, CeraCycle } from "@/lib/types";

export const dynamic = "force-dynamic";

const BAND_CONFIG = {
  strong_alignment: { color: "bg-emerald-900 border-emerald-800", badge: "bg-emerald-900 text-emerald-300", label: "Strong" },
  moderate_alignment: { color: "bg-yellow-950 border-yellow-900", badge: "bg-yellow-900 text-yellow-300", label: "Moderate" },
  weak_alignment: { color: "bg-red-950 border-red-900", badge: "bg-red-900 text-red-300", label: "Weak" },
};

const DECISION_COLORS: Record<string, string> = {
  execute: "bg-emerald-900 text-emerald-300",
  improve: "bg-yellow-900 text-yellow-300",
  reconsider: "bg-red-900 text-red-300",
};

const PATH_COLORS: Record<string, string> = {
  scale: "bg-emerald-900 text-emerald-300",
  pivot: "bg-yellow-900 text-yellow-300",
  kill: "bg-red-900 text-red-300",
};

export default async function DecisionPage() {
  const [evaluations, cycles] = await Promise.all([
    getMapEvaluations(20),
    getCeraCycles(20),
  ]);

  const strong = evaluations.filter((e) => e.decisionBand === "strong_alignment").length;
  const moderate = evaluations.filter((e) => e.decisionBand === "moderate_alignment").length;
  const weak = evaluations.filter((e) => e.decisionBand === "weak_alignment").length;

  const avgMap = evaluations.length > 0
    ? Math.round((evaluations.reduce((s, e) => s + e.mapScore, 0) / evaluations.length) * 10) / 10
    : null;

  const avgCompound = cycles.length > 0
    ? Math.round((cycles.reduce((s, c) => s + c.compoundScore, 0) / cycles.length) * 10) / 10
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">MAP-CERA Decision Engine</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Meaningful · Actionable · Profitable → Capture · Extract · Refine · Amplify
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Evaluations</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{evaluations.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Avg MAP Score</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{avgMap !== null ? `${avgMap}/9` : "—"}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">CERA Cycles</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{cycles.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Avg Compound</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{avgCompound !== null ? `${avgCompound}/90` : "—"}</p>
        </div>
      </div>

      {/* Band distribution */}
      {evaluations.length > 0 && (
        <div className="flex gap-3">
          <div className="bg-emerald-900/40 border border-emerald-900 rounded-lg px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-emerald-400">{strong}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Strong (8–9)</p>
          </div>
          <div className="bg-yellow-900/40 border border-yellow-900 rounded-lg px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-yellow-400">{moderate}</p>
            <p className="text-xs text-yellow-600 mt-0.5">Moderate (5–7)</p>
          </div>
          <div className="bg-red-900/40 border border-red-900 rounded-lg px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-red-400">{weak}</p>
            <p className="text-xs text-red-600 mt-0.5">Weak (0–4)</p>
          </div>
        </div>
      )}

      {/* MAP Evaluations */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">MAP Evaluations</h2>
        {evaluations.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-500 text-sm">No evaluations yet.</p>
            <p className="text-zinc-700 text-xs mt-2">
              node dist/cli.js map-evaluate --title "..." --category campaign --meaningful 3 --actionable 3 --profitable 2
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((ev: MapEvaluation) => {
              const cfg = BAND_CONFIG[ev.decisionBand] ?? BAND_CONFIG.weak_alignment;
              return (
                <div key={ev.evaluationId} className={`rounded-lg border px-5 py-4 ${cfg.color}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-zinc-100 truncate">{ev.title}</p>
                        <span className="text-xs text-zinc-500 shrink-0">{ev.category}</span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2">{ev.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-mono text-lg font-bold text-zinc-100">{ev.mapScore}/9</span>
                      <div className="flex gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${cfg.badge}`}>{cfg.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${DECISION_COLORS[ev.decision] ?? "bg-zinc-800 text-zinc-300"}`}>
                          {ev.decision}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                    <span>M: <span className="text-zinc-300 font-medium">{ev.meaningfulScore}</span></span>
                    <span>A: <span className="text-zinc-300 font-medium">{ev.actionableScore}</span></span>
                    <span>P: <span className="text-zinc-300 font-medium">{ev.profitableScore}</span></span>
                    <span className="ml-auto">{new Date(ev.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CERA Cycles */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">CERA Cycles</h2>
        {cycles.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-500 text-sm">No CERA cycles yet.</p>
            <p className="text-zinc-700 text-xs mt-2">
              node dist/cli.js cera-cycle --evaluationId &lt;id&gt; --capture "signal1,signal2"
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Cycle</th>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">CERA Score</th>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Compound</th>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Path</th>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Signals</th>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Created</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle: CeraCycle) => (
                  <tr key={cycle.cycleId} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                      {cycle.cycleId.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm font-bold text-indigo-400">
                        {cycle.ceraEfficiencyScore}/10
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-sm font-bold text-zinc-100">
                        {cycle.compoundScore}/90
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PATH_COLORS[cycle.decisionPath] ?? "bg-zinc-800 text-zinc-300"}`}>
                        {cycle.decisionPath}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {cycle.captureSignals.length} signals
                    </td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {new Date(cycle.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
