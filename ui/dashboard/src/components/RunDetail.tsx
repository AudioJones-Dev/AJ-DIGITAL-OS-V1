import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchRunById,
  fetchDeliverablesByRunId,
  fetchReplayData,
  createMissionRun,
} from "../lib/queries";
import type { RunWithMission, Deliverable, ReplayData } from "../lib/types";
import {
  BackLink,
  Spinner,
  ErrorBanner,
  PageHeader,
  DetailSection,
  DetailRow,
  StatusBadge,
  DataTable,
  ActionButton,
} from "./shared";
import {
  CollapsibleSection,
  ReplayTimeline,
  ObservationPanel,
  FailurePanel,
  JsonViewer,
} from "./ReplayComponents";

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<RunWithMission | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchRunById(id);
        const d = await fetchDeliverablesByRunId(id);
        if (!cancelled) {
          setRun(r);
          setDeliverables(d);
        }
        // Fetch replay data from Neon via Hermes API if run_ref exists
        if (!cancelled && r.run_ref) {
          setReplayLoading(true);
          try {
            const rd = await fetchReplayData(r.run_ref);
            if (!cancelled) setReplay(rd);
          } catch {
            // Replay is supplementary — don't block the page
          } finally {
            if (!cancelled) setReplayLoading(false);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleRetry() {
    if (!run) return;
    setRetrying(true);
    try {
      const newRun = await createMissionRun({
        mission_id: run.mission_id,
        requested_by: "operator",
        trigger_type: "manual",
      });
      navigate(`/runs/${newRun.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRetrying(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!run) return <ErrorBanner message="Run not found" />;

  const missionLabel = run.missions?.objective ?? run.mission_id.slice(0, 8);
  const isFailed = run.status === "failed";

  return (
    <div>
      <BackLink to="/runs" label="All Runs" />
      <PageHeader
        title={run.run_ref ?? `Run ${run.id.slice(0, 8)}`}
        subtitle={`${run.missions?.mission_type ?? "unknown"} · ${missionLabel}`}
        right={
          isFailed ? (
            <ActionButton
              label={retrying ? "Retrying…" : "Retry Mission"}
              onClick={handleRetry}
              disabled={retrying}
              variant="danger"
            />
          ) : undefined
        }
      />

      <DetailSection title="Run Info">
        <DetailRow label="ID" value={<code style={{ fontSize: 12, color: "#94a3b8" }}>{run.id}</code>} />
        <DetailRow label="Status" value={<StatusBadge value={run.status} />} />
        <DetailRow label="OK" value={run.ok === true ? "✓ Passed" : run.ok === false ? "✗ Failed" : "—"} />
        <DetailRow label="Trigger" value={<StatusBadge value={run.trigger_type ?? "—"} />} />
        <DetailRow label="Requested By" value={run.requested_by} />
        <DetailRow label="Mission" value={
          <a href={`/missions/${run.mission_id}`} onClick={(e) => { e.preventDefault(); navigate(`/missions/${run.mission_id}`); }} style={{ color: "#38bdf8", textDecoration: "none" }}>
            {missionLabel}
          </a>
        } />
        <DetailRow label="Started" value={run.started_at ? new Date(run.started_at).toLocaleString() : "—"} />
        <DetailRow label="Completed" value={run.completed_at ? new Date(run.completed_at).toLocaleString() : "—"} />
        <DetailRow label="Duration" value={run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"} />
        <DetailRow label="Created" value={run.created_at ? new Date(run.created_at).toLocaleString() : "—"} />
      </DetailSection>

      {run.summary && (
        <DetailSection title="Summary">
          <p style={{ color: "#e2e8f0", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{run.summary}</p>
        </DetailSection>
      )}

      {run.failure_ref && (
        <DetailSection title="Failure Reference">
          <code style={{ color: "#f87171", fontSize: 12 }}>{run.failure_ref}</code>
        </DetailSection>
      )}

      {run.artifacts && run.artifacts.length > 0 && (
        <DetailSection title="Artifacts">
          <ul style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1", fontSize: 13 }}>
            {(run.artifacts as string[]).map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </DetailSection>
      )}

      <DetailSection title={`Deliverables (${deliverables.length})`}>
        {deliverables.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>No deliverables for this run.</p>
        ) : (
          <DataTable<Deliverable>
            rows={deliverables}
            rowKey={(d) => d.id}
            columns={[
              { key: "filename", header: "Filename", render: (d) => d.filename },
              { key: "content_type", header: "Content Type", render: (d) => d.content_type ?? "—" },
              { key: "size", header: "Size", render: (d) => d.size_bytes != null ? `${(d.size_bytes / 1024).toFixed(1)} KB` : "—" },
              { key: "status", header: "Status", width: "100px", render: (d) => <StatusBadge value={d.status} /> },
              { key: "created", header: "Created", width: "160px", render: (d) => d.created_at ? new Date(d.created_at).toLocaleString() : "—" },
            ]}
          />
        )}
      </DetailSection>

      {/* ── Replay Data (from Neon) ─────────────────────────────── */}

      {replayLoading && (
        <div style={{ padding: "16px 0", color: "#64748b", fontSize: 13 }}>
          Loading execution replay…
        </div>
      )}

      {replay && (
        <>
          <div style={{ borderTop: "1px solid #334155", margin: "8px 0 24px", paddingTop: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>
              Execution Replay
            </h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 20px" }}>
              Step-by-step execution data from Neon · {replay.steps.length} steps · {replay.observations.length} observations · {replay.failures.length} failures
            </p>
          </div>

          {replay.run.error && (
            <DetailSection title="Run Error">
              <div style={{ padding: "8px 12px", backgroundColor: "#450a0a", borderRadius: 6, color: "#fca5a5", fontSize: 13 }}>
                {replay.run.error}
              </div>
            </DetailSection>
          )}

          <CollapsibleSection
            title={`Steps (${replay.steps.length})`}
            defaultOpen={true}
            badge={
              replay.steps.some((s) => !s.ok) ? (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                  {replay.steps.filter((s) => !s.ok).length} failed
                </span>
              ) : undefined
            }
          >
            <ReplayTimeline steps={replay.steps} />
          </CollapsibleSection>

          <CollapsibleSection
            title={`Observations (${replay.observations.length})`}
            defaultOpen={replay.observations.some((o) => !o.healthy)}
            badge={
              replay.observations.some((o) => !o.healthy) ? (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                  {replay.observations.filter((o) => !o.healthy).length} unhealthy
                </span>
              ) : undefined
            }
          >
            <ObservationPanel observations={replay.observations} />
          </CollapsibleSection>

          <CollapsibleSection
            title={`Failures (${replay.failures.length})`}
            defaultOpen={replay.failures.length > 0}
            badge={
              replay.failures.length > 0 ? (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                  {replay.failures.length}
                </span>
              ) : undefined
            }
          >
            <FailurePanel failures={replay.failures} />
          </CollapsibleSection>

          <CollapsibleSection title="Neon Run Metadata" defaultOpen={false}>
            <JsonViewer data={replay.run} />
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
