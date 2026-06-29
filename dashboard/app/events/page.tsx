import { getSystemEvents, getMetrics } from "@/lib/api";
import type { SystemEvent, MetricsSnapshot, SystemEventCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_COLORS: Record<SystemEventCategory | string, string> = {
  run: "bg-blue-900 text-blue-200",
  state: "bg-aj-surface-3 text-aj-data",
  policy: "bg-yellow-900 text-yellow-200",
  approval: "bg-orange-900 text-orange-200",
  dag: "bg-purple-900 text-purple-200",
  cache: "bg-teal-900 text-teal-200",
  retrieval: "bg-green-900 text-green-200",
  decision: "bg-pink-900 text-pink-200",
  attribution: "bg-aj-surface-3 text-aj-data",
  tool: "bg-aj-surface-3 text-aj-text",
  error: "bg-red-900 text-red-200",
  dashboard: "bg-aj-surface-2 text-aj-text-secondary",
};

const CATEGORIES: SystemEventCategory[] = [
  "run", "state", "policy", "approval", "dag",
  "cache", "retrieval", "decision", "attribution", "tool", "error", "dashboard",
];

export default async function EventsPage() {
  const [events, metrics] = await Promise.all([
    getSystemEvents({ limit: 100 }),
    getMetrics(),
  ]);

  const byCategory = events.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.category] = (acc[ev.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">System Event Ledger</h1>
        <p className="text-aj-text-muted text-sm mt-1">
          Canonical JSONL event log · {events.length} events loaded ·{" "}
          {metrics?.system_event_count ?? "?"} total
        </p>
      </div>

      {/* Metrics strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ["Policy: Allow", metrics.policy_allow_count, "text-emerald-400"],
            ["Policy: Block", metrics.policy_block_count, "text-red-400"],
            ["Approval Required", metrics.approval_required_count, "text-yellow-400"],
            ["Attribution Emits", metrics.attribution_emit_count, "text-aj-data"],
          ] as [string, number, string][]).map(([label, value, color]) => (
            <div key={label} className="bg-aj-surface-1 border border-aj-border rounded-lg p-3">
              <p className="text-xs text-aj-text-muted">{label}</p>
              <p className={`text-xl font-bold mt-0.5 ${color}`}>{value ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category distribution */}
      {events.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, count]) => (
              <span
                key={cat}
                className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat] ?? "bg-aj-surface-3 text-aj-text"}`}
              >
                {cat} · {count}
              </span>
            ))}
        </div>
      )}

      {/* Category filter links */}
      <div>
        <h2 className="text-xs font-semibold text-aj-text-muted uppercase tracking-wider mb-3">
          Filter by Category
        </h2>
        <div className="flex flex-wrap gap-2">
          <a
            href="/events"
            className="text-xs px-3 py-1 rounded-full border border-aj-border-strong text-aj-text-secondary hover:border-aj-border-strong hover:text-aj-text transition-colors"
          >
            All
          </a>
          {CATEGORIES.map((cat) => (
            <a
              key={cat}
              href={`/events?category=${cat}`}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                byCategory[cat]
                  ? "border-aj-border-strong text-aj-text-secondary hover:border-aj-border-strong hover:text-aj-text"
                  : "border-aj-border text-aj-text-muted cursor-default"
              }`}
            >
              {cat} {byCategory[cat] ? `(${byCategory[cat]})` : ""}
            </a>
          ))}
        </div>
      </div>

      {/* Event table */}
      <div>
        <div className="overflow-x-auto rounded-md border border-aj-border">
          {events.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-aj-text-muted text-sm">No system events recorded yet.</p>
              <p className="text-aj-text-muted text-xs mt-2">
                Events are written automatically by the OS as commands execute.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-aj-surface-1 border-b border-aj-border">
                <tr>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Time</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Category</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Event Type</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Run</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Actor</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Env</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev: SystemEvent) => (
                  <tr key={ev.eventId} className="border-b border-aj-border hover:bg-aj-surface-2">
                    <td className="px-4 py-2 text-aj-text-muted text-xs">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[ev.category] ?? "bg-aj-surface-3 text-aj-text"}`}>
                        {ev.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs max-w-[200px] truncate">
                      {ev.eventType}
                    </td>
                    <td className="px-4 py-2 font-mono text-aj-text-muted text-xs">
                      {ev.runId ? ev.runId.slice(0, 10) + "…" : "—"}
                    </td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs">
                      {ev.actorId ?? "—"}
                      {ev.actorType && <span className="text-aj-text-muted"> ({ev.actorType})</span>}
                    </td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs">{ev.environment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
