import { getDagRun } from "../bel/dag/dag-store.js";
import { scoreRun } from "../evaluation/eval-engine.js";
import { emitRunVerdict } from "../evaluation/eval-emit.js";
import { loadGoldenSet } from "../evaluation/golden-loader.js";
import { appendEvalAuditEvent, saveVerdict } from "../evaluation/eval-store.js";
import type { EvalVerdict } from "../evaluation/eval-types.js";

export interface EvalRunCommandInput {
  /** Score one persisted DAG run by id. */
  runId?: string;
  /** Replay an engine's golden set (requires engine). */
  golden?: boolean;
  /** Engine label / golden-set name. */
  engine?: string;
  tenantId?: string;
  json?: boolean;
}

export interface EvalRunCommandResult {
  ok: boolean;
  command: "eval-run";
  verdicts: EvalVerdict[];
  error?: string;
}

export class EvalRunCommand {
  async run(input: EvalRunCommandInput = {}): Promise<EvalRunCommandResult> {
    // ── Golden-set replay ──────────────────────────────────────────────────
    if (input.golden) {
      if (!input.engine) {
        const error = "--golden requires --engine <name>";
        if (input.json) console.log(JSON.stringify({ ok: false, error }));
        else console.error(error);
        return { ok: false, command: "eval-run", verdicts: [], error };
      }
      let cases;
      try {
        cases = loadGoldenSet(input.engine);
      } catch (err) {
        const error = `Failed to load golden set '${input.engine}': ${err instanceof Error ? err.message : String(err)}`;
        if (input.json) console.log(JSON.stringify({ ok: false, error }));
        else console.error(error);
        return { ok: false, command: "eval-run", verdicts: [], error };
      }

      const verdicts: EvalVerdict[] = [];
      for (const goldenCase of cases) {
        const verdict = scoreRun(goldenCase.runState, {
          engine: input.engine,
          goldenCase,
        });
        saveVerdict(verdict);
        appendEvalAuditEvent({
          verdictId: verdict.verdictId,
          runId: verdict.runId,
          event: "golden_case_scored",
          ...(verdict.tenantId !== undefined ? { tenantId: verdict.tenantId } : {}),
          payload: { caseId: goldenCase.caseId, outcome: verdict.outcome, score: verdict.score },
        });
        verdicts.push(verdict);
      }

      const passed = verdicts.filter((v) => v.outcome === "pass").length;
      if (input.json) {
        console.log(JSON.stringify({ ok: true, engine: input.engine, total: verdicts.length, passed, verdicts }, null, 2));
      } else {
        console.log(`GOLDEN EVAL — ${input.engine}`);
        console.log("==========================");
        console.log(`Cases:  ${verdicts.length}`);
        console.log(`Passed: ${passed}/${verdicts.length}`);
        for (const v of verdicts) {
          console.log(`  ${v.goldenCaseId ?? v.runId} → ${v.outcome} (${v.score.toFixed(2)})`);
        }
      }
      return { ok: true, command: "eval-run", verdicts };
    }

    // ── Single-run scoring ─────────────────────────────────────────────────
    if (!input.runId) {
      const error = "Provide --runId <id>, or --golden --engine <name>";
      if (input.json) console.log(JSON.stringify({ ok: false, error }));
      else console.error(error);
      return { ok: false, command: "eval-run", verdicts: [], error };
    }

    const state = getDagRun(input.runId);
    if (!state) {
      const error = `DAG run not found: ${input.runId}`;
      if (input.json) console.log(JSON.stringify({ ok: false, error }));
      else console.error(error);
      return { ok: false, command: "eval-run", verdicts: [], error };
    }

    const verdict = emitRunVerdict(state, input.engine ? { engine: input.engine } : {});
    if (!verdict) {
      const error = `Failed to score run: ${input.runId}`;
      if (input.json) console.log(JSON.stringify({ ok: false, error }));
      else console.error(error);
      return { ok: false, command: "eval-run", verdicts: [], error };
    }

    if (input.json) {
      console.log(JSON.stringify({ ok: true, verdict }, null, 2));
    } else {
      console.log("RUN VERDICT");
      console.log("===========");
      console.log(`Run:      ${verdict.runId}`);
      console.log(`Engine:   ${verdict.engine}`);
      console.log(`Outcome:  ${verdict.outcome}`);
      console.log(`Score:    ${verdict.score.toFixed(2)}`);
      console.log(`Basis:    ${verdict.basis}`);
      console.log(`Status:   ${verdict.runStatus}`);
    }
    return { ok: true, command: "eval-run", verdicts: [verdict] };
  }
}
