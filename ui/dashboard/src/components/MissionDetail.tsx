import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchMissionById,
  fetchRunsByMissionId,
  createMissionRun,
} from "../lib/queries";
import type { MissionWithClient, MissionRun } from "../lib/types";
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

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mission, setMission] = useState<MissionWithClient | null>(null);
  const [runs, setRuns] = useState<MissionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [m, r] = await Promise.all([
          fetchMissionById(id),
          fetchRunsByMissionId(id),
        ]);
        if (!cancelled) {
          setMission(m);
          setRuns(r);
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
    if (!id) return;
    setRetrying(true);
    try {
      const run = await createMissionRun({
        mission_id: id,
        requested_by: "operator",
        trigger_type: "manual",
      });
      navigate(`/runs/${run.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRetrying(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!mission) return <ErrorBanner message="Mission not found" />;

  const clientName = mission.clients?.display_name ?? mission.client_id ?? "—";

  return (
    <div>
      <BackLink to="/missions" label="All Missions" />
      <PageHeader
        title={mission.objective || `Mission ${mission.id.slice(0, 8)}`}
        subtitle={`${mission.mission_type} · ${clientName}`}
        right={
          <ActionButton
            label={retrying ? "Triggering…" : "Run Mission"}
            onClick={handleRetry}
            disabled={retrying}
          />
        }
      />

      <DetailSection title="Mission Info">
        <DetailRow label="ID" value={<code style={{ fontSize: 12, color: "#94a3b8" }}>{mission.id}</code>} />
        <DetailRow label="Status" value={<StatusBadge value={mission.status} />} />
        <DetailRow label="Type" value={<StatusBadge value={mission.mission_type} />} />
        <DetailRow label="Priority" value={mission.priority} />
        <DetailRow label="Client" value={clientName} />
        <DetailRow label="Objective" value={mission.objective} />
        <DetailRow label="Tags" value={mission.tags?.length ? mission.tags.join(", ") : "—"} />
        <DetailRow label="Created" value={mission.created_at ? new Date(mission.created_at).toLocaleString() : "—"} />
        <DetailRow label="Updated" value={mission.updated_at ? new Date(mission.updated_at).toLocaleString() : "—"} />
      </DetailSection>

      {mission.input_payload && Object.keys(mission.input_payload).length > 0 && (
        <DetailSection title="Input Payload">
          <pre style={{ background: "#0f172a", borderRadius: 6, padding: 12, fontSize: 12, color: "#cbd5e1", overflowX: "auto", margin: 0 }}>
            {JSON.stringify(mission.input_payload, null, 2)}
          </pre>
        </DetailSection>
      )}

      <DetailSection title={`Runs (${runs.length})`}>
        {runs.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>No runs yet.</p>
        ) : (
          <DataTable<MissionRun>
            rows={runs}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/runs/${r.id}`)}
            columns={[
              { key: "run_ref", header: "Run Ref", render: (r) => r.run_ref ?? r.id.slice(0, 8) },
              { key: "status", header: "Status", width: "100px", render: (r) => <StatusBadge value={r.status} /> },
              { key: "ok", header: "OK", width: "50px", render: (r) => r.ok === true ? "✓" : r.ok === false ? "✗" : "—" },
              { key: "trigger", header: "Trigger", width: "90px", render: (r) => <StatusBadge value={r.trigger_type ?? "—"} /> },
              { key: "duration", header: "Duration", width: "100px", render: (r) => r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—" },
              { key: "started", header: "Started", width: "160px", render: (r) => r.started_at ? new Date(r.started_at).toLocaleString() : "—" },
              { key: "summary", header: "Summary", render: (r) => r.summary ?? "—" },
            ]}
          />
        )}
      </DetailSection>
    </div>
  );
}
