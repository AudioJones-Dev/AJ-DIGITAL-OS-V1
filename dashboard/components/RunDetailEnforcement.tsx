"use client";

import { useEffect, useState } from "react";
import RunControls from "./RunControls";
import EnforcementStatus from "./EnforcementStatus";
import AuditTrail from "./AuditTrail";
import {
  buildEnforcementSnapshot,
  clientGetControlRunAudit,
  PUBLIC_HERMES_API_URL,
} from "@/lib/control-client";
import type {
  ControlAction,
  ControlActionResult,
  ControlAuditEvent,
  RunControlState,
} from "@/lib/types";

interface Props {
  runId: string;
  initialState: RunControlState;
  initialAudit: ControlAuditEvent[];
  environment?: string;
}

/**
 * Client wrapper that owns the cross-component state for a single run:
 * the latest audit batch, the most recent action result, and the enforcement
 * snapshot derived from both. Keeps the page itself a server component.
 */
export default function RunDetailEnforcement({
  runId,
  initialState,
  initialAudit,
  environment,
}: Props) {
  const [audit, setAudit] = useState<ControlAuditEvent[]>(initialAudit);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<RunControlState>(initialState);
  const [lastResult, setLastResult] = useState<ControlActionResult | undefined>(undefined);

  // Refetch audit whenever an action completes.
  useEffect(() => {
    if (refreshKey === 0) return;
    let cancelled = false;
    clientGetControlRunAudit(runId, PUBLIC_HERMES_API_URL)
      .then((evts) => {
        if (!cancelled) setAudit(evts);
      })
      .catch(() => {
        // silent — AuditTrail surfaces its own errors
      });
    return () => {
      cancelled = true;
    };
  }, [runId, refreshKey]);

  function onActionResult(_action: ControlAction, result: ControlActionResult) {
    setLastResult(result);
    if (result.ok && result.newState) setState(result.newState);
    setRefreshKey((k: number) => k + 1);
  }

  const snapshot = buildEnforcementSnapshot(state, audit, lastResult, environment);

  return (
    <div className="space-y-6">
      <EnforcementStatus snapshot={snapshot} />

      <div>
        <h3 className="text-sm font-semibold text-aj-text-secondary mb-3">Run Controls</h3>
        <RunControls runId={runId} currentState={state} onResult={onActionResult} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-aj-text-secondary mb-3">Enforcement Audit Trail</h3>
        <AuditTrail runId={runId} refreshKey={refreshKey} initialEvents={audit} />
      </div>
    </div>
  );
}
