import { getNodeOutputs } from "../bel/dag/dag-store.js";
import type { BelDagNodeOutput } from "../bel/dag/dag-types.js";

export interface DagOutputsCommandInput {
  runId: string;
  nodeId?: string;
  json?: boolean;
}

export interface DagOutputsCommandResult {
  ok: boolean;
  data?: BelDagNodeOutput[];
  error?: string;
}

export class DagOutputsCommand {
  async run(input: DagOutputsCommandInput): Promise<DagOutputsCommandResult> {
    try {
      if (!input.runId) {
        const error = "--runId <id> is required";
        if (input.json) console.log(JSON.stringify({ ok: false, error }));
        else console.error(error);
        return { ok: false, error };
      }

      const filter: Parameters<typeof getNodeOutputs>[0] = { runId: input.runId };
      if (input.nodeId !== undefined) filter.nodeId = input.nodeId;
      const outputs = getNodeOutputs(filter);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: outputs }, null, 2));
        return { ok: true, data: outputs };
      }

      if (outputs.length === 0) {
        console.log(`No node outputs for ${input.runId}.`);
        return { ok: true, data: outputs };
      }

      console.log(`Node Outputs: ${input.runId}`);
      console.log("==========================");
      for (const o of outputs) {
        console.log(`  ${o.nodeId}  completedAt=${o.completedAt}`);
        console.log(`    output=${JSON.stringify(o.output)}`);
      }
      return { ok: true, data: outputs };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
