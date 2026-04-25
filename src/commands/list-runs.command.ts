import { listControlRuns } from "../control-plane/run-registry/run-control-store.js";
import type { RunControlState } from "../control-plane/run-registry/run-control-types.js";

export interface ListRunsCommandInput {
  json?: boolean;
  state?: string;
  limit?: number;
}

export interface ListRunsCommandResult {
  ok: boolean;
  data?: ReturnType<typeof listControlRuns>;
  error?: string;
}

export class ListRunsCommand {
  async run(input: ListRunsCommandInput): Promise<ListRunsCommandResult> {
    try {
      const filter: { state?: RunControlState; limit?: number } = {};
      if (input.state !== undefined) filter.state = input.state as RunControlState;
      if (input.limit !== undefined) filter.limit = input.limit;
      const runs = listControlRuns(filter);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: runs }, null, 2));
        return { ok: true, data: runs };
      }

      if (runs.length === 0) {
        console.log("No control runs found.");
        return { ok: true, data: runs };
      }

      console.log("Control Runs");
      console.log("============");
      for (const r of runs) {
        console.log(`  ${r.runId}  [${r.controlState}]  agent=${r.agentId}  updated=${r.updatedAt}`);
      }
      return { ok: true, data: runs };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
