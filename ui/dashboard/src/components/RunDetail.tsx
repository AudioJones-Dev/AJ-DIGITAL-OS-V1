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
  const [replayError, setReplayError] = useState<string | null>(null);
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
          } catch (err: unknown) {
            if (!cancelled) setReplayError(err instanceof Error ? err.message : "Failed to load replay data");
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

      {/* ─── 1. Run Summary ─────────────────────────────────────── */}

      <DetailSection title="Run Summary">
        <DetailRow label="Run ID" value={<code style={{ fontSize: 12, color: "#94a3b8" }}>{run.id}</code>} />
        <DetailRow label="Mission ID" value={
          <a href={`/missions/${run.mission_id}`} onClick={(e) => { e.preventDefault(); navigate(`/missions/${run.mission_id}`); }} style={{ color: "#38bdf8", textDecoration: "none", fontSize: 12 }}>
            {run.mission_id}
          </a>
        } />
        <DetailRow label="Mission Type" value={run.missions?.mission_type ?? "—"} />
        <DetailRow label="Status" value={<StatusBadge value={run.status} />} />
        <DetailRow label="Trigger" value={<StatusBadge value={run.trigger_type ?? "—"} />} />
        <DetailRow label="Requested By" value={run.requested_by ?? "—"} />
        <DetailRow label="Started" value={run.started_at ? new Date(run.started_at).toLocaleString() : "—"} />
        <DetailRow label="Completed" value={run.completed_at ? new Date(run.completed_at).toLocaleString() : "—"} />
        <DetailRow label="Duration" value={run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s (${run.duration_ms}ms)` : "—"} />
        {run.summary && (
          <DetailRow label="Summary" value={
            <span style={{ lineHeight: 1.6 }}>{run.summary}</span>
          } />
        )}
        {run.failure_ref && (
          <DetailRow label="Failure Ref" value={<code style={{ color: "#f87171", fontSize: 12 }}>{run.failure_ref}</code>} />
        )}
      </DetailSection>

      {/* ─── 2. Step Timeline ───────────────────────────────────── */}

      {replayLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 0", color: "#64748b", fontSize: 13 }}>
          <div style={{ width: 14, height: 14, border: "2px solid #334155", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          Loading execution replay from Neon…
        </div>
      )}

      {replayError && (
        <DetailSection title="Replay Data">
          <div style={{ padding: "8px 12px", backgroundColor: "#1e293b", borderRadius: 6, color: "#94a3b8", fontSize: 13, border: "1px solid #334155" }}>
            Replay data unavailable: {replayError}
          </div>
        </DetailSection>
      )}

      {replay && (
        <>
          {replay.run.error && (
            <DetailSection title="Run Error">
              <div style={{ padding: "8px 12px", backgroundColor: "#450a0a", borderRadius: 6, color: "#fca5a5", fontSize: 13, border: "1px solid #7f1d1d" }}>
                {replay.run.error}
              </div>
            </DetailSection>
          )}

          <CollapsibleSection
            title={`Step Timeline (${replay.steps.length})`}
            defaultOpen={true}
            badge={
              replay.steps.some((s) => !s.ok) ? (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                  {replay.steps.filter((s) => !s.ok).length} failed
                </span>
              ) : (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#064e3b", color: "#6ee7b7" }}>
                  all passed
                </span>
              )
            }
          >
            <ReplayTimeline steps={replay.steps} />
          </CollapsibleSection>

          {/* ─── 3. Observations ──────────────────────────────────── */}

          <CollapsibleSection
            title={`Observations (${replay.observations.length})`}
            defaultOpen={replay.observations.length > 0 && replay.observations.some((o) => !o.healthy)}
            badge={
              replay.observations.length === 0 ? (
                <span style={{ fontSize: 11, color: "#64748b" }}>none</span>
              ) : replay.observations.some((o) => !o.healthy) ? (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                  {replay.observations.filter((o) => !o.healthy).length} unhealthy
                </span>
              ) : (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#064e3b", color: "#6ee7b7" }}>
                  all healthy
                </span>
              )
            }
          >
            <ObservationPanel observations={replay.observations} />
          </CollapsibleSection>

          {/* ─── 4. Failures ─────────────────────────────────────── */}

          <CollapsibleSection
            title={`Failures (${replay.failures.length})`}
            defaultOpen={replay.failures.length > 0}
            badge={
              replay.failures.length > 0 ? (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                  {replay.failures.length}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#64748b" }}>none</span>
              )
            }
          >
            <FailurePanel failures={replay.failures} />
          </CollapsibleSection>

          {/* ─── Neon Metadata (collapsed) ────────────────────────── */}

          <CollapsibleSection title="Neon Run Metadata" defaultOpen={false}>
            <JsonViewer data={replay.run} />
          </CollapsibleSection>
        </>
      )}

      {/* ─── 5. Linked Outputs ──────────────────────────────────── */}

      <DetailSection title={`Linked Outputs — Deliverables (${deliverables.length})`}>
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

      {run.artifacts && run.artifacts.length > 0 && (
        <DetailSection title={`Linked Outputs — Artifacts (${(run.artifacts as string[]).length})`}>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1", fontSize: 13 }}>
            {(run.artifacts as string[]).map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </DetailSection>
      )}
    </div>
  );
}
