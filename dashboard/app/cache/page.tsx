import { getCacheEntries, getCacheAuditLog } from "@/lib/api";
import type { CacheNamespace, CacheEntryMeta, CacheAuditEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const NAMESPACES: CacheNamespace[] = [
  "context-cache",
  "plan-cache",
  "score-cache",
  "report-cache",
  "response-cache",
];

const NS_COLORS: Record<CacheNamespace, string> = {
  "context-cache": "bg-aj-surface-3 text-aj-data",
  "plan-cache": "bg-blue-900 text-blue-200",
  "score-cache": "bg-purple-900 text-purple-200",
  "report-cache": "bg-teal-900 text-teal-200",
  "response-cache": "bg-green-900 text-green-200",
};

const DECISION_COLORS: Record<string, string> = {
  hit: "bg-emerald-900 text-emerald-300",
  miss: "bg-aj-surface-2 text-aj-text-secondary",
  stale: "bg-yellow-900 text-yellow-300",
  blocked: "bg-red-900 text-red-300",
  bypass: "bg-orange-900 text-orange-300",
  cache_write: "bg-blue-900 text-blue-300",
  cache_hit: "bg-emerald-900 text-emerald-300",
  cache_miss: "bg-aj-surface-2 text-aj-text-secondary",
  cache_stale: "bg-yellow-900 text-yellow-300",
  cache_invalidated: "bg-red-950 text-red-300",
  cache_blocked_cross_tenant: "bg-red-900 text-red-200",
  cache_blocked_policy_mismatch: "bg-orange-900 text-orange-200",
  cache_bypass_high_risk: "bg-orange-900 text-orange-300",
};

export default async function CachePage() {
  const [entriesByNs, auditLog] = await Promise.all([
    Promise.all(NAMESPACES.map((ns) => getCacheEntries(ns).then((e) => ({ ns, entries: e })))),
    getCacheAuditLog({ limit: 50 }),
  ]);

  const totalEntries = entriesByNs.reduce((sum, { entries }) => sum + entries.length, 0);
  const activeEntries = entriesByNs
    .flatMap(({ entries }) => entries)
    .filter((e) => e.cacheStatus === "active").length;

  const hitCount = auditLog.filter((e) => e.eventType === "cache_hit").length;
  const missCount = auditLog.filter((e) => e.eventType === "cache_miss").length;
  const hitRate = hitCount + missCount > 0
    ? Math.round((hitCount / (hitCount + missCount)) * 100)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Cache Augmentation Layer</h1>
        <p className="text-aj-text-muted text-sm mt-1">5 namespaces · file-backed · policy-governed</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Total Entries</p>
          <p className="text-2xl font-bold text-aj-text mt-1">{totalEntries}</p>
        </div>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeEntries}</p>
        </div>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Hit Rate</p>
          <p className="text-2xl font-bold text-aj-data mt-1">
            {hitRate !== null ? `${hitRate}%` : "—"}
          </p>
          {hitCount + missCount > 0 && (
            <p className="text-xs text-aj-text-muted mt-0.5">{hitCount}H / {missCount}M</p>
          )}
        </div>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Audit Events</p>
          <p className="text-2xl font-bold text-aj-text mt-1">{auditLog.length}</p>
        </div>
      </div>

      {/* Namespace breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-aj-text-secondary mb-4">Namespaces</h2>
        <div className="space-y-4">
          {entriesByNs.map(({ ns, entries }) => {
            const active = entries.filter((e) => e.cacheStatus === "active").length;
            const stale = entries.filter((e) => e.cacheStatus === "stale").length;
            const invalidated = entries.filter((e) => e.cacheStatus === "invalidated").length;

            return (
              <div key={ns} className="bg-aj-surface-1 border border-aj-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-aj-border">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${NS_COLORS[ns]}`}>
                      {ns}
                    </span>
                    <span className="text-xs text-aj-text-muted">{entries.length} entries</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-aj-text-muted">
                    <span className="text-emerald-400">{active} active</span>
                    {stale > 0 && <span className="text-yellow-400">{stale} stale</span>}
                    {invalidated > 0 && <span className="text-red-400">{invalidated} invalidated</span>}
                  </div>
                </div>
                {entries.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-aj-surface-2">
                      <tr>
                        <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Key</th>
                        <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Risk</th>
                        <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Status</th>
                        <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">TTL</th>
                        <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(0, 5).map((entry: CacheEntryMeta) => (
                        <tr key={entry.cacheKey} className="border-t border-aj-border hover:bg-aj-surface-2">
                          <td className="px-4 py-2 font-mono text-xs text-aj-text-secondary max-w-[200px] truncate">
                            {entry.cacheKey}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                entry.riskLevel === "high"
                                  ? "bg-red-900 text-red-300"
                                  : entry.riskLevel === "medium"
                                  ? "bg-yellow-900 text-yellow-300"
                                  : "bg-aj-surface-2 text-aj-text-secondary"
                              }`}
                            >
                              {entry.riskLevel}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                entry.cacheStatus === "active"
                                  ? "bg-emerald-900 text-emerald-300"
                                  : entry.cacheStatus === "stale"
                                  ? "bg-yellow-900 text-yellow-300"
                                  : "bg-red-900 text-red-300"
                              }`}
                            >
                              {entry.cacheStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-aj-text-muted text-xs">{entry.ttlSeconds}s</td>
                          <td className="px-4 py-2 text-aj-text-muted text-xs">
                            {new Date(entry.expiresAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {entries.length > 5 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-aj-text-muted text-xs border-t border-aj-border">
                            +{entries.length - 5} more entries
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-4 py-3 text-aj-text-muted text-xs">Empty namespace.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit log */}
      <div>
        <h2 className="text-sm font-semibold text-aj-text-secondary mb-4">Audit Log</h2>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg overflow-hidden">
          {auditLog.length === 0 ? (
            <p className="text-aj-text-muted text-sm p-4">No audit events.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-aj-border bg-aj-surface-2">
                <tr>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Time</th>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Event</th>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Namespace</th>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Key</th>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Decision</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.slice(0, 20).map((ev: CacheAuditEvent) => (
                  <tr key={ev.eventId} className="border-t border-aj-border hover:bg-aj-surface-2">
                    <td className="px-4 py-2 text-aj-text-muted text-xs">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${DECISION_COLORS[ev.eventType] ?? "bg-aj-surface-2 text-aj-text-secondary"}`}>
                        {ev.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs font-mono">{ev.namespace}</td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs font-mono max-w-[120px] truncate">
                      {ev.cacheKey ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${DECISION_COLORS[ev.decision] ?? "bg-aj-surface-2 text-aj-text-secondary"}`}>
                        {ev.decision}
                      </span>
                    </td>
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
