/**
 * TaskDetail — Simplified task/mission detail for client mode.
 *
 * Shows human-readable summary without raw logs, stack traces,
 * or internal technical data. Operator mode redirects to RunDetail.
 */

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { fetchRunById, fetchDeliverablesByRunId, fetchReplayData } from "../lib/queries";
import type { RunWithMission, Deliverable, ReplayData, ReplayStep } from "../lib/types";
import { PageHeader, BackLink, DetailSection, DetailRow, Spinner, ErrorBanner, StatusBadge } from "./shared";
import { useViewMode } from "../lib/view-mode";

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { isClient } = useViewMode();

  const [run, setRun] = useState<RunWithMission | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchRunById(id),
      fetchDeliverablesByRunId(id),
      fetchReplayData(id).catch(() => null),
    ])
      .then(([r, d, rep]) => {
        setRun(r);
        setDeliverables(d);
        setReplay(rep);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!run) return <ErrorBanner message="Task not found" />;

  const friendlyStatus = run.ok === true ? "Completed successfully"
    : run.ok === false ? "Needs attention"
    : "In progress";

  return (
    <div>
      <BackLink to={isClient ? "/workspace" : "/runs"} label={isClient ? "Back to Board" : "Back to Runs"} />
      <PageHeader
        title={run.missions?.objective ?? "Task Detail"}
        subtitle={isClient ? friendlyStatus : `Run: ${run.run_ref}`}
      />

      {/* Summary section */}
      <DetailSection title="Summary">
        <DetailRow label="Status" value={<StatusBadge value={run.status} />} />
        {!isClient && <DetailRow label="Run Ref" value={run.run_ref} />}
        {run.summary && <DetailRow label="Result" value={run.summary} />}
        {run.duration_ms !== null && (
          <DetailRow label="Duration" value={`${(run.duration_ms / 1000).toFixed(1)} seconds`} />
        )}
        {!isClient && run.requested_by && <DetailRow label="Triggered by" value={run.requested_by} />}
        {!isClient && <DetailRow label="Trigger" value={run.trigger_type} />}
      </DetailSection>

      {/* Steps (human-readable in client mode, full in operator) */}
      {replay && replay.steps.length > 0 && (
        <DetailSection title={isClient ? "Progress" : "Pipeline Steps"}>
          <div style={stepsContainer}>
            {replay.steps.map((step, idx) => (
              <StepItem key={step.id} step={step} index={idx} isClient={isClient} />
            ))}
          </div>
        </DetailSection>
      )}

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <DetailSection title={isClient ? "Outputs" : "Deliverables"}>
          {deliverables.map((d) => (
            <div key={d.id} style={deliverableRow}>
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>{d.filename}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {d.content_type} {d.size_bytes ? `· ${(d.size_bytes / 1024).toFixed(1)}KB` : ""}
              </span>
              <StatusBadge value={d.status} />
            </div>
          ))}
        </DetailSection>
      )}

      {/* Failures — operator only */}
      {!isClient && replay && replay.failures.length > 0 && (
        <DetailSection title="Failures">
          {replay.failures.map((f) => (
            <div key={f.id} style={failureRow}>
              <div style={{ fontSize: 13, color: "#fca5a5" }}>{f.error}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                role: {f.role} | escalated: {String(f.escalated)} | resolved: {String(f.resolved)}
              </div>
              {f.stack_trace && (
                <pre style={stackStyle}>{f.stack_trace}</pre>
              )}
            </div>
          ))}
        </DetailSection>
      )}
    </div>
  );
}

// ── Step Item ──────────────────────────────────────────────────────

function StepItem({ step, index, isClient }: { step: ReplayStep; index: number; isClient: boolean }) {
  const icon = step.ok ? "✔" : "✘";
  const color = step.ok ? "#22c55e" : "#ef4444";

  // In client mode, show human-readable role names
  const roleLabel = isClient ? friendlyRole(step.role) : step.role;

  return (
    <div style={stepRow}>
      <span style={{ color, fontWeight: 700, fontSize: 14, width: 20 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "#e2e8f0" }}>
          Step {index + 1}: {roleLabel}
        </div>
        {!isClient && step.error && (
          <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 2 }}>{step.error}</div>
        )}
        {!isClient && (
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
            {step.duration_ms}ms · retries: {step.retries}
            {step.warnings.length > 0 && ` · ${step.warnings.length} warnings`}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function friendlyRole(role: string): string {
  const map: Record<string, string> = {
    planner: "Planning",
    executor: "Processing",
    validator: "Quality Check",
    monitor: "Health Check",
  };
  return map[role] ?? role;
}

// ── Styles ─────────────────────────────────────────────────────────

const stepsContainer: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const stepRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 12px",
  backgroundColor: "#0f172a",
  borderRadius: 8,
};

const deliverableRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 12px",
  borderBottom: "1px solid #1e293b",
};

const failureRow: CSSProperties = {
  padding: "10px 12px",
  backgroundColor: "#450a0a20",
  borderRadius: 8,
  marginBottom: 8,
  border: "1px solid #7f1d1d40",
};

const stackStyle: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  backgroundColor: "#0f172a",
  padding: 8,
  borderRadius: 6,
  marginTop: 6,
  overflow: "auto",
  maxHeight: 120,
};

export default TaskDetail;
