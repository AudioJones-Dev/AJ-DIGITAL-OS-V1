import { retryNode } from "../bel/dag/dag-runtime.js";
import { getDagRun } from "../bel/dag/dag-store.js";
import type { BelDagRunState } from "../bel/dag/dag-types.js";

export interface DagRetryNodeCommandInput {
  runId: string;
  nodeId: string;
  json?: boolean;
}

export interface DagRetryNodeCommandResult {
  ok: boolean;
  data?: BelDagRunState;
  error?: string;
}

export class DagRetryNodeCommand {
  async run(input: DagRetryNodeCommandInput): Promise<DagRetryNodeCommandResult> {
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

      const next = retryNode(state, input.nodeId);
      const node = next.nodes.find((n) => n.nodeId === input.nodeId);
      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: next }, null, 2));
      } else {
        console.log(`Retried node ${input.nodeId}: status=${node?.status}, attempts=${node?.attempts}/${node?.maxAttempts}`);
      }
      return { ok: true, data: next };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
