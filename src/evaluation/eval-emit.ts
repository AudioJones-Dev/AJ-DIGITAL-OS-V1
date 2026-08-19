/**
 * L15 Evaluate step — run-verdict emitter.
 *
 * Never-throws: errors are swallowed so emission can never break the run path
 * (same resilience contract as safeEmit in src/bel/dag/dag-attribution.ts).
 * NOTE: unlike safeEmit's async dispatch, persistence here is synchronous and
 * inline — saveVerdict rewrites the verdict file and the ledger append complete
 * before return. Emission is idempotent per (runId, runStatus), so repeated
 * terminal transitions for one run do not duplicate verdicts or ledger events.
 * Scores the run, persists the verdict, writes an eval audit record, and reports
 * a ledger entry (category "decision", since SystemEventCategory has no
 * "evaluation" member — widening that union is a separate, reviewed change).
 *
 * A verdict is a read-only post-hoc observation of an already-completed run; it
 * takes no action, so it deliberately does NOT route through
 * executeWithEnforcement() — that authority gates actions about to be taken.
 */

import { appendSystemEvent } from "../core/events/event-ledger.js";

import { scoreRun } from "./eval-engine.js";
import type { ScoreRunOptions } from "./eval-engine.js";
import { appendEvalAuditEvent, getVerdictByRunId, saveVerdict } from "./eval-store.js";
import type { EvalVerdict, RunEvalInput } from "./eval-types.js";

export function emitRunVerdict(
  run: RunEvalInput,
  options: ScoreRunOptions = {},
): EvalVerdict | null {
  try {
    // Idempotent per (runId, runStatus): repeated terminal transitions for the
    // same run (e.g. several failNode calls in one driver) must not append
    // duplicate verdicts or emit duplicate ledger events.
    const existing = getVerdictByRunId(run.runId);
    if (existing && existing.runStatus === run.status) {
      return existing;
    }
    const verdict = scoreRun(run, options);
    saveVerdict(verdict);

    appendEvalAuditEvent({
      verdictId: verdict.verdictId,
      runId: verdict.runId,
      event: "run_verdict_emitted",
      ...(verdict.tenantId !== undefined ? { tenantId: verdict.tenantId } : {}),
      payload: {
        engine: verdict.engine,
        outcome: verdict.outcome,
        score: verdict.score,
        basis: verdict.basis,
        runStatus: verdict.runStatus,
      },
    });

    try {
      appendSystemEvent({
        eventType: "run_verdict_emitted",
        category: "decision",
        ...(verdict.tenantId !== undefined ? { tenantId: verdict.tenantId } : {}),
        runId: verdict.runId,
        environment: verdict.environment,
        payload: {
          verdictId: verdict.verdictId,
          engine: verdict.engine,
          outcome: verdict.outcome,
          score: verdict.score,
          basis: verdict.basis,
          runStatus: verdict.runStatus,
        },
      });
    } catch {
      // ledger entry is best-effort
    }

    return verdict;
  } catch {
    // verdict emission must never break the run path
    return null;
  }
}
