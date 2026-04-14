import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchClients, createMission, createMissionRun } from "../lib/queries";
import type { Client } from "../lib/types";
import {
  BackLink,
  Spinner,
  ErrorBanner,
  PageHeader,
} from "./shared";

const MISSION_TYPES = [
  "build_and_review",
  "extract_normalize_store",
  "repair_failed_workflow",
  "monitor_only",
] as const;

const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#94a3b8",
};

export default function MissionTrigger() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [missionType, setMissionType] = useState<string>(MISSION_TYPES[0]);
  const [objective, setObjective] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [payloadJson, setPayloadJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchClients();
        if (!cancelled) setClients(c);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function validatePayload(val: string) {
    setPayloadJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!objective.trim()) { setError("Objective is required"); return; }
    if (jsonError) { setError("Fix JSON errors before submitting"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      const mission = await createMission({
        client_id: clientId || null,
        mission_type: missionType,
        objective: objective.trim(),
        priority,
        input_payload: payload,
      });
      const run = await createMissionRun({
        mission_id: mission.id,
        requested_by: "operator",
        trigger_type: "manual",
      });
      navigate(`/runs/${run.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <BackLink to="/missions" label="All Missions" />
      <PageHeader title="Trigger New Mission" subtitle="Create a mission and start a manual run" />

      {error && <ErrorBanner message={error} />}

      {loadingClients ? (
        <Spinner />
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
          {/* Mission Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Mission Type</label>
            <select value={missionType} onChange={(e) => setMissionType(e.target.value)} style={inputStyle}>
              {MISSION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Client (optional)</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
              <option value="">— No client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name ?? c.slug}</option>
              ))}
            </select>
          </div>

          {/* Objective */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Objective</label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What should this mission accomplish?"
              style={inputStyle}
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Input Payload */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Input Payload (JSON)</label>
            <textarea
              value={payloadJson}
              onChange={(e) => validatePayload(e.target.value)}
              rows={6}
              style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical" }}
            />
            {jsonError && <p style={{ color: "#f87171", fontSize: 12, margin: "4px 0 0" }}>{jsonError}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !!jsonError || !objective.trim()}
            style={{
              padding: "8px 18px",
              borderRadius: 6,
              border: "none",
              background: submitting || !!jsonError || !objective.trim() ? "#334155" : "#2563eb",
              color: submitting || !!jsonError || !objective.trim() ? "#64748b" : "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting || !!jsonError || !objective.trim() ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creating…" : "Create & Run Mission"}
          </button>
        </form>
      )}
    </div>
  );
}
