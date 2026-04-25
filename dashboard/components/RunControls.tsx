"use client";

import { useState } from "react";

type RunControlState =
  | "queued" | "planning" | "running" | "waiting_for_approval"
  | "retrying" | "escalated" | "completed" | "failed" | "cancelled";

type ControlAction =
  | "rerun" | "pause" | "resume" | "cancel"
  | "approve" | "reject" | "escalate" | "inspect";

const VALID_TRANSITIONS: Record<RunControlState, RunControlState[]> = {
  queued: ["planning", "cancelled"],
  planning: ["running", "waiting_for_approval", "failed", "cancelled"],
  running: ["completed", "failed", "retrying", "escalated", "waiting_for_approval", "cancelled"],
  waiting_for_approval: ["running", "cancelled", "failed"],
  retrying: ["running", "failed", "escalated", "cancelled"],
  escalated: ["running", "cancelled", "failed"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

const ACTION_TARGET: Partial<Record<ControlAction, RunControlState>> = {
  rerun: "queued",
  pause: "waiting_for_approval",
  resume: "running",
  cancel: "cancelled",
  approve: "running",
  reject: "failed",
  escalate: "escalated",
};

const APPROVAL_REQUIRED: ControlAction[] = ["rerun", "escalate", "cancel"];
const AVAILABLE_ACTIONS: ControlAction[] = ["approve", "resume", "pause", "rerun", "reject", "escalate", "cancel", "inspect"];

const HERMES_API_URL = process.env.NEXT_PUBLIC_HERMES_API_URL ?? "http://localhost:3001";

interface Props {
  runId: string;
  currentState: RunControlState;
}

export default function RunControls({ runId, currentState }: Props) {
  const [loading, setLoading] = useState<ControlAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentStateLocal, setCurrentStateLocal] = useState(currentState);

  const validNextStates = VALID_TRANSITIONS[currentStateLocal] ?? [];
  const availableActions = AVAILABLE_ACTIONS.filter((action) => {
    if (action === "inspect") return true;
    const target = ACTION_TARGET[action];
    return target !== undefined && validNextStates.includes(target);
  });

  async function executeAction(action: ControlAction) {
    if (APPROVAL_REQUIRED.includes(action)) {
      if (!confirm(`Action '${action}' requires approval. Proceed?`)) return;
    }
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch(`${HERMES_API_URL}/control/runs/${runId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          performedBy: "dashboard-user",
          approvalGranted: APPROVAL_REQUIRED.includes(action),
        }),
      });
      const json = await res.json() as { ok: boolean; newState?: RunControlState; error?: string };
      if (json.ok && json.newState) {
        setCurrentStateLocal(json.newState);
        setMessage(`Done. State: ${json.newState}`);
      } else {
        setMessage(`Error: ${json.error ?? "Unknown"}`);
      }
    } catch (e) {
      setMessage(`Request failed: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setLoading(null);
    }
  }

  if (availableActions.length === 0) {
    return <p className="text-zinc-500 text-xs">No actions available for state: {currentStateLocal}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => (
          <button
            key={action}
            onClick={() => executeAction(action)}
            disabled={loading !== null}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              APPROVAL_REQUIRED.includes(action)
                ? "bg-red-900 hover:bg-red-800 text-red-200"
                : "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
            } disabled:opacity-50`}
          >
            {loading === action ? "…" : action}
          </button>
        ))}
      </div>
      {message && (
        <p className={`text-xs ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
