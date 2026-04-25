import {
  executeControlAction,
  APPROVAL_REQUIRED_ACTIONS,
  type ControlAction,
} from "../control-plane/run-registry/index.js";

export interface ControlRunCommandInput {
  runId: string;
  action: ControlAction;
  by?: string;
  reason?: string;
  json?: boolean;
}

export interface ControlRunCommandResult {
  ok: boolean;
  command: "control-run";
  success?: boolean;
  newState?: string;
  requiresApproval?: boolean;
  error?: string;
}

export class ControlRunCommand {
  async run(input: ControlRunCommandInput): Promise<ControlRunCommandResult> {
    if (APPROVAL_REQUIRED_ACTIONS.includes(input.action)) {
      console.warn(`WARNING: "${input.action}" is a high-risk action that requires system approval.`);
    }

    const result = await executeControlAction(
      input.runId,
      input.action,
      input.by ?? "cli",
      input.reason,
    );

    if (input.json === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.requiresApproval) {
        console.log(`Action "${input.action}" requires approval. Submit via system escalation.`);
      } else if (result.success) {
        console.log(`OK: ${input.runId} → ${result.newState}`);
      } else {
        console.error(`FAILED: ${result.error}`);
      }
    }

    return {
      ok: result.success ?? false,
      command: "control-run",
      ...(result.success !== undefined ? { success: result.success } : {}),
      ...(result.newState !== undefined ? { newState: result.newState } : {}),
      ...(result.requiresApproval !== undefined ? { requiresApproval: result.requiresApproval } : {}),
      ...(result.error !== undefined ? { error: result.error } : {}),
    };
  }
}
