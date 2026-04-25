import {
  getControlRun,
  type ControlRunRecord,
} from "../control-plane/run-registry/index.js";

export interface InspectRunCommandInput {
  runId: string;
  json?: boolean;
}

export interface InspectRunCommandResult {
  ok: boolean;
  command: "inspect-run";
  run?: ControlRunRecord;
  error?: string;
}

export class InspectRunCommand {
  async run(input: InspectRunCommandInput): Promise<InspectRunCommandResult> {
    const run = getControlRun(input.runId);

    if (!run) {
      const error = `Run not found: ${input.runId}`;
      console.error(error);
      return { ok: false, command: "inspect-run", error };
    }

    if (input.json === true) {
      console.log(JSON.stringify(run, null, 2));
    } else {
      this.renderHuman(run);
    }

    return { ok: true, command: "inspect-run", run };
  }

  private renderHuman(run: ControlRunRecord): void {
    console.log("RUN DETAIL");
    console.log("==========");
    console.log(`Run ID:    ${run.runId}`);
    console.log(`Agent ID:  ${run.agentId}`);
    console.log(`State:     ${run.controlState}`);
    if (run.previousState) console.log(`Previous:  ${run.previousState}`);
    console.log(`Created:   ${run.createdAt}`);
    console.log(`Updated:   ${run.updatedAt}`);
    if (run.approvedBy) console.log(`Approved:  ${run.approvedBy}`);
    if (run.cancelledBy) console.log(`Cancelled: ${run.cancelledBy}`);
    if (run.metadata && Object.keys(run.metadata).length > 0) {
      console.log(`Metadata:  ${JSON.stringify(run.metadata)}`);
    }
  }
}
