import {
  fetchFullRunData,
  getControlRun,
  getControlRunAudit,
  getAttributionEventsByRun,
} from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import RunDetailEnforcement from "@/components/RunDetailEnforcement";
import MAPAttribution from "@/components/MAPAttribution";
import type {
  AttributionEvent,
  ControlAuditEvent,
  ControlRunRecord,
  RunControlState,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: { runId: string } };

export default async function RunDetailPage({ params }: Props) {
  let data = null;
  let error: string | null = null;

  try {
    data = await fetchFullRunData(params.runId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch run";
  }

  // Best-effort fetches — if Hermes is down we still render the run from Neon.
  let controlRecord: ControlRunRecord | null = null;
  let auditEvents: ControlAuditEvent[] = [];
  let attributionEvents: AttributionEvent[] = [];
  try {
    controlRecord = await getControlRun(params.runId);
  } catch {
    /* tolerate */
  }
  try {
    auditEvents = await getControlRunAudit(params.runId);
  } catch {
    /* tolerate */
  }
  try {
    attributionEvents = await getAttributionEventsByRun(params.runId);
  } catch {
    /* tolerate */
  }

  const initialControlState: RunControlState =
    controlRecord?.controlState ?? "queued";
  const environment = process.env.HERMES_ENVIRONMENT;

  if (error) {
    return (
      <div className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-md p-3">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="text-zinc-500 text-sm">Run not found.</p>;
  }

  const { run, steps, observations, failures } = data;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-semibold">Run Detail</h1>
          <StatusBadge status={run.status} />
          {run.ok === false && (
            <span className="text-xs text-red-400 font-medium">✕ failed</span>
          )}
        </div>
        <p className="text-xs font-mono text-zinc-500">{run.run_ref}</p>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        {[
          { label: "Mission Type", value: run.mission_type },
          { label: "Started At", value: new Date(run.started_at).toLocaleString() },
          {
            label: "Completed At",
            value: run.completed_at ? new Date(run.completed_at).toLocaleString() : "—",
          },
          {
            label: "Duration",
            value: run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—",
          },
          { label: "Escalations", value: String(run.escalation_count) },
          { label: "Roles Used", value: run.roles_used?.join(", ") || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className="font-mono text-xs text-zinc-200 truncate">{value}</p>
          </div>
        ))}
      </div>

      {run.objective && (
        <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
          <p className="text-zinc-500 text-xs mb-1">Objective</p>
          <p className="text-sm text-zinc-200">{run.objective}</p>
        </div>
      )}

      {run.summary && (
        <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
          <p className="text-zinc-500 text-xs mb-1">Summary</p>
          <p className="text-sm text-zinc-200">{run.summary}</p>
        </div>
      )}

      {run.error && (
        <div className="bg-red-950/30 border border-red-900 rounded p-3">
          <p className="text-zinc-500 text-xs mb-1">Error</p>
          <p className="text-sm text-red-300 font-mono">{run.error}</p>
        </div>
      )}

      {/* Steps */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-zinc-300">
          Steps <span className="text-zinc-600 font-normal">({steps.length})</span>
        </h2>
        {steps.length === 0 ? (
          <p className="text-zinc-600 text-sm">No steps recorded.</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="bg-zinc-900 border border-zinc-800 rounded p-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-zinc-500 text-xs font-mono">#{step.step_index}</span>
                    <span className="text-sm font-medium text-zinc-100">{step.role}</span>
                    {step.pipeline_id && (
                      <span className="text-xs text-zinc-600 font-mono truncate max-w-[160px]">
                        {step.pipeline_id}
                      </span>
                    )}
                  </div>
                  {step.error && (
                    <p className="text-xs text-red-400 font-mono mt-1 truncate">{step.error}</p>
                  )}
                  {step.retries > 0 && (
                    <p className="text-xs text-yellow-600 mt-0.5">{step.retries} retr{step.retries === 1 ? "y" : "ies"}</p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      step.ok ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                    }`}
                  >
                    {step.ok ? "ok" : "failed"}
                  </span>
                  {step.duration_ms > 0 && (
                    <span className="text-xs text-zinc-600 font-mono">
                      {(step.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observations */}
      {observations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-zinc-300">
            Observations <span className="text-zinc-600 font-normal">({observations.length})</span>
          </h2>
          <div className="space-y-2">
            {observations.map((obs) => (
              <div
                key={obs.id}
                className="bg-zinc-900 border border-zinc-800 rounded p-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400 mb-1">{obs.summary}</p>
                  <p className="text-xs text-zinc-600 font-mono">{obs.source}</p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                    obs.healthy ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                  }`}
                >
                  {obs.healthy ? "healthy" : "unhealthy"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failures */}
      {failures.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-zinc-300">
            Failures <span className="text-zinc-600 font-normal">({failures.length})</span>
          </h2>
          <div className="space-y-2">
            {failures.map((f) => (
              <div
                key={f.id}
                className="bg-red-950/20 border border-red-900/50 rounded p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-red-400">{f.role}</span>
                  {f.escalated && (
                    <span className="text-xs bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded">
                      escalated
                    </span>
                  )}
                  {f.resolved && (
                    <span className="text-xs bg-green-900 text-green-300 px-1.5 py-0.5 rounded">
                      resolved
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-300 font-mono">{f.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Enforcement: status + controls + audit, all driven by the control plane */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-zinc-300">Enforcement</h2>
        <RunDetailEnforcement
          runId={params.runId}
          initialState={initialControlState}
          initialAudit={auditEvents}
          {...(environment ? { environment } : {})}
        />
      </div>

      {/* MAP Attribution */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-zinc-300">MAP Attribution</h2>
        <MAPAttribution events={attributionEvents} />
      </div>
    </div>
  );
}
