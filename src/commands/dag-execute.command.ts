import { runDagToCompletion } from "../bel/dag/dag-runtime.js";
import { getDagRun } from "../bel/dag/dag-store.js";
import type { BelDagRunState } from "../bel/dag/dag-types.js";

export interface DagExecuteCommandInput {
  runId: string;
  force?: boolean;
  json?: boolean;
}

export interface DagExecuteCommandResult {
  ok: boolean;
  data?: BelDagRunState;
  error?: string;
}

export class DagExecuteCommand {
  async run(input: DagExecuteCommandInput): Promise<DagExecuteCommandResult> {
    try {
      if (!input.runId) {
        const error = "--runId <id> is required";
        if (input.json) console.log(JSON.stringify({ ok: false, error }));
        else console.error(error);
        return { ok: false, error };
      }

      const state = getDagRun(input.runId);
      if (!state) {
        const error = `DAG run not found: ${input.runId}`;
        if (input.json) console.log(JSON.stringify({ ok: false, error }));
        else console.error(error);
        return { ok: false, error };
      }

      const next = await runDagToCompletion(state, input.force ? { force: true } : {});

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: next }, null, 2));
      } else {
        const completed = next.nodes.filter((n) => n.status === "completed").length;
        const failed = next.nodes.filter((n) => n.status === "failed").length;
        const skipped = next.nodes.filter((n) => n.status === "skipped").length;
        const waiting = next.nodes.filter((n) => n.status === "waiting_for_approval").length;
        console.log(`Run ${next.runId} → ${next.status}  (completed=${completed}, failed=${failed}, skipped=${skipped}, waiting=${waiting})`);
      }
      return { ok: true, data: next };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
