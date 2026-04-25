import { getDagRun } from "../bel/dag/dag-store.js";
import type { BelDagRunState } from "../bel/dag/dag-types.js";

export interface DagInspectCommandInput {
  runId: string;
  json?: boolean;
}

export interface DagInspectCommandResult {
  ok: boolean;
  data?: BelDagRunState;
  error?: string;
}

export class DagInspectCommand {
  async run(input: DagInspectCommandInput): Promise<DagInspectCommandResult> {
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

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: state }, null, 2));
        return { ok: true, data: state };
      }

      console.log(`DAG Run: ${state.runId}`);
      console.log("===================");
      console.log(`  DAG:         ${state.dagId}`);
      console.log(`  Status:      ${state.status}`);
      console.log(`  Environment: ${state.environment}`);
      if (state.tenantId) console.log(`  Tenant:      ${state.tenantId}`);
      console.log(`  Created:     ${state.createdAt}`);
      console.log(`  Updated:     ${state.updatedAt}`);
      console.log("");
      console.log("Nodes");
      console.log("-----");
      for (const n of state.nodes) {
        const attempts = `${n.attempts}/${n.maxAttempts}`;
        console.log(`  [${n.status.padEnd(22)}] ${n.nodeId}  type=${n.type}  risk=${n.riskLevel}  attempts=${attempts}`);
      }
      return { ok: true, data: state };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
