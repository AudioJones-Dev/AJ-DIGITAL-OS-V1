import { fetchHermesStatus, fetchBelCapabilities } from "@/lib/api";
import MissionCard from "@/components/MissionCard";

export const dynamic = "force-dynamic";

export default async function HermesPage() {
  let status = null;
  let capabilities = null;
  let error: string | null = null;

  try {
    [status, capabilities] = await Promise.all([
      fetchHermesStatus(),
      fetchBelCapabilities(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to reach Hermes API";
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Hermes Status</h1>

      {error ? (
        <div className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-md p-3">
          {error}
        </div>
      ) : status ? (
        <>
          {/* Health banner */}
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                status.health === "ok"
                  ? "bg-green-900 text-green-300"
                  : "bg-red-900 text-red-300"
              }`}
            >
              {status.health}
            </span>
            {status.version != null && (
              <span className="text-xs text-aj-text-muted font-mono">v{String(status.version)}</span>
            )}
            {status.uptime != null && (
              <span className="text-xs text-aj-text-muted">
                up {Math.floor(Number(status.uptime) / 60)}m
              </span>
            )}
          </div>

          {/* Missions */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-aj-text-secondary">
              Missions{" "}
              <span className="text-aj-text-muted font-normal">({status.missions?.length ?? 0})</span>
            </h2>
            {!status.missions?.length ? (
              <p className="text-aj-text-muted text-sm">No active missions.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {status.missions.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} />
                ))}
              </div>
            )}
          </div>

          {/* BEL Capabilities */}
          {capabilities && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-aj-text-secondary">BEL Capabilities</h2>
              <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
                {capabilities.tools?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {capabilities.tools.map((tool) => (
                      <span
                        key={tool}
                        className="text-xs bg-aj-surface-2 text-aj-text-secondary px-2 py-1 rounded font-mono"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-aj-text-muted text-sm">No tools reported.</p>
                )}
                {capabilities.version != null && (
                  <p className="mt-3 text-xs text-aj-text-muted font-mono">
                    BEL v{String(capabilities.version)}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
