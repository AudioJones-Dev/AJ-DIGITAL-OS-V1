"use client";

import { useState } from "react";
import type {
  ControlAction,
  ControlActionResult,
  RunControlState,
} from "@/lib/types";
import {
  APPROVAL_REQUIRED_ACTIONS,
  ACTION_RISK,
} from "@/lib/types";
import {
  buildActionPayload,
  clientControlRunAction,
  isActionDisabledForState,
  PUBLIC_DEFAULT_TENANT_ID,
} from "@/lib/control-client";

const ACTIONS: ControlAction[] = [
  "approve",
  "reject",
  "pause",
  "resume",
  "rerun",
  "escalate",
  "cancel",
];

interface Props {
  runId: string;
  currentState: RunControlState;
  onResult?: (action: ControlAction, result: ControlActionResult) => void;
}

interface ActionMessage {
  kind: "success" | "error" | "approval";
  text: string;
}

export default function RunControls({ runId, currentState, onResult }: Props) {
  const [loading, setLoading] = useState<ControlAction | null>(null);
  const [state, setState] = useState<RunControlState>(currentState);
  const [message, setMessage] = useState<ActionMessage | null>(null);

  async function handleAction(action: ControlAction) {
    if (APPROVAL_REQUIRED_ACTIONS.includes(action)) {
      const ok = typeof window !== "undefined"
        ? window.confirm(`'${action}' is a high-risk action and requires approval. Continue?`)
        : true;
      if (!ok) return;
    }

    setLoading(action);
    setMessage(null);

    const payload = buildActionPayload({
      action,
      actor: "dashboard-user",
      actorType: "human",
      ...(PUBLIC_DEFAULT_TENANT_ID ? { tenantId: PUBLIC_DEFAULT_TENANT_ID } : {}),
    });

    const result = await clientControlRunAction(runId, payload);

    if (result.requiresApproval) {
      setMessage({
        kind: "approval",
        text: `Approval required${result.approvalId ? ` (${result.approvalId.slice(0, 8)}…)` : ""}. Awaiting human approver.`,
      });
    } else if (result.ok) {
      if (result.newState) setState(result.newState);
      setMessage({
        kind: "success",
        text: `'${action}' applied. State: ${result.newState ?? state}`,
      });
    } else {
      setMessage({
        kind: "error",
        text: result.error ?? "Action failed",
      });
    }

    onResult?.(action, result);
    setLoading(null);
  }

  function btnClass(action: ControlAction, disabled: boolean): string {
    const risk = ACTION_RISK[action];
    const base =
      "px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
    if (disabled) return `${base} bg-aj-surface-2 text-aj-text-muted border border-aj-border`;
    if (risk === "high") return `${base} bg-aj-critical/15 hover:bg-aj-critical/20 text-aj-critical border border-aj-critical/40`;
    if (risk === "medium") return `${base} bg-aj-warning/15 hover:bg-aj-warning/20 text-aj-warning border border-aj-warning/40`;
    return `${base} bg-aj-surface-2 hover:bg-aj-surface-3 text-aj-text border border-aj-border-strong`;
  }

  return (
    <div className="space-y-3" data-testid="run-controls">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const stateDisabled = isActionDisabledForState(action, state);
          const disabled = stateDisabled || loading !== null;
          return (
            <button
              key={action}
              onClick={() => handleAction(action)}
              disabled={disabled}
              data-testid={`action-${action}`}
              data-disabled={stateDisabled ? "true" : "false"}
              className={btnClass(action, stateDisabled)}
              title={stateDisabled ? `Run is in terminal state: ${state}` : `Risk: ${ACTION_RISK[action]}`}
            >
              {loading === action ? "…" : action}
              {APPROVAL_REQUIRED_ACTIONS.includes(action) && (
                <span className="ml-1 text-[10px] opacity-70">⚠</span>
              )}
            </button>
          );
        })}
      </div>

      {message && (
        <div
          data-testid="action-message"
          data-kind={message.kind}
          className={`text-xs rounded border px-2 py-1.5 ${
            message.kind === "success"
              ? "bg-aj-success/15 border-aj-success/40 text-aj-success"
              : message.kind === "approval"
              ? "bg-aj-warning/15 border-aj-warning/40 text-aj-warning"
              : "bg-aj-critical/15 border-aj-critical/40 text-aj-critical"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
