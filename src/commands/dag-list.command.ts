import { listDagRuns } from "../bel/dag/dag-store.js";
import type { BelDagRunState } from "../bel/dag/dag-types.js";

export interface DagListCommandInput {
  json?: boolean;
  status?: string;
  tenantId?: string;
  limit?: number;
}

export interface DagListCommandResult {
  ok: boolean;
  data?: BelDagRunState[];
  error?: string;
}

export class DagListCommand {
  async run(input: DagListCommandInput): Promise<DagListCommandResult> {
    try {
      const filter: Parameters<typeof listDagRuns>[0] = {};
      if (input.status !== undefined) filter.status = input.status as BelDagRunState["status"];
      if (input.tenantId !== undefined) filter.tenantId = input.tenantId;
      if (input.limit !== undefined) filter.limit = input.limit;
      const runs = listDagRuns(filter);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: runs }, null, 2));
        return { ok: true, data: runs };
      }

      if (runs.length === 0) {
        console.log("No DAG runs found.");
        return { ok: true, data: runs };
      }

      console.log("DAG Runs");
      console.log("========");
      for (const r of runs) {
        console.log(`  ${r.runId}  [${r.status}]  dag=${r.dagId}  env=${r.environment}  nodes=${r.nodes.length}  updated=${r.updatedAt}`);
      }
      return { ok: true, data: runs };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
