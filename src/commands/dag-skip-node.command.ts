import { skipNode } from "../bel/dag/dag-runtime.js";
import { getDagRun } from "../bel/dag/dag-store.js";
import type { BelDagRunState } from "../bel/dag/dag-types.js";

export interface DagSkipNodeCommandInput {
  runId: string;
  nodeId: string;
  json?: boolean;
}

export interface DagSkipNodeCommandResult {
  ok: boolean;
  data?: BelDagRunState;
  error?: string;
}

export class DagSkipNodeCommand {
  async run(input: DagSkipNodeCommandInput): Promise<DagSkipNodeCommandResult> {
    try {
      if (!input.runId || !input.nodeId) {
        const error = "--runId and --nodeId are required";
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

      const next = skipNode(state, input.nodeId);
      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: next }, null, 2));
      } else {
        console.log(`Skipped node ${input.nodeId} on run ${input.runId}.`);
      }
      return { ok: true, data: next };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
