import { executeControlAction } from "../control-plane/run-registry/control-actions.js";
import type { ControlAction, RunControlState } from "../control-plane/run-registry/run-control-types.js";

export interface ControlRunCommandInput {
  runId: string;
  action: string;
  by?: string;
  reason?: string;
  approvalGranted?: boolean;
  json?: boolean;
}

export interface ControlRunCommandResult {
  ok: boolean;
  newState?: RunControlState;
  requiresApproval?: boolean;
  error?: string;
}

export class ControlRunCommand {
  async run(input: ControlRunCommandInput): Promise<ControlRunCommandResult> {
    try {
      const result = await executeControlAction(
        input.runId,
        input.action as ControlAction,
        input.by ?? "cli",
        input.reason,
        input.approvalGranted,
      );

      if (input.json) {
        console.log(JSON.stringify({ ok: result.success, ...result }, null, 2));
      } else if (result.success) {
        console.log(`Action '${input.action}' applied. New state: ${result.newState}`);
      } else if (result.requiresApproval) {
        console.log(`Action '${input.action}' requires approval. Re-run with --approval-granted flag after obtaining approval.`);
      } else {
        console.error(`Action failed: ${result.error}`);
      }

      const out: ControlRunCommandResult = { ok: result.success };
      if (result.newState !== undefined) out.newState = result.newState;
      if (result.requiresApproval !== undefined) out.requiresApproval = result.requiresApproval;
      if (result.error !== undefined) out.error = result.error;
      return out;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
