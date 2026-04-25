import {
  listControlRuns,
  type ControlRunRecord,
  type RunControlState,
} from "../control-plane/run-registry/index.js";

export interface ListRunsCommandInput {
  json?: boolean;
  state?: RunControlState;
  limit?: number;
}

export interface ListRunsCommandResult {
  ok: boolean;
  command: "list-runs";
  runs: ControlRunRecord[];
  total: number;
}

export class ListRunsCommand {
  async run(input: ListRunsCommandInput = {}): Promise<ListRunsCommandResult> {
    const runs = listControlRuns({
      ...(input.state ? { state: input.state } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });

    if (input.json === true) {
      console.log(JSON.stringify({ total: runs.length, runs }, null, 2));
    } else {
      this.renderHuman(runs);
    }

    return { ok: true, command: "list-runs", runs, total: runs.length };
  }

  private renderHuman(runs: ControlRunRecord[]): void {
    console.log("CONTROL PLANE RUNS");
    console.log("==================");
    if (runs.length === 0) {
      console.log("No runs found.");
      return;
    }
    console.log(`Total: ${runs.length}`);
    console.log("");
    for (const run of runs) {
      console.log(`- ${run.runId} | ${run.agentId} | ${run.controlState} | ${run.updatedAt}`);
    }
  }
}
