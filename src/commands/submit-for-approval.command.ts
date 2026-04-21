import { DeliverableLifecycleService } from "../services/runtime/deliverable-lifecycle.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

export interface SubmitForApprovalCommandInput {
  deliverableId: string;
  actor?: string;
  notes?: string;
  json?: boolean;
}

export interface SubmitForApprovalCommandResult {
  ok: boolean;
  command: "submit-for-approval";
  rendered: boolean;
  deliverable?: DeliverableRecord | undefined;
  warnings: string[];
  errors: string[];
}

export class SubmitForApprovalCommand {
  constructor(private readonly lifecycle = new DeliverableLifecycleService()) {}

  async run(input: SubmitForApprovalCommandInput): Promise<SubmitForApprovalCommandResult> {
    if (!input.deliverableId.trim()) {
      return this.render({
        ok: false,
        command: "submit-for-approval",
        rendered: true,
        warnings: [],
        errors: ["submit-for-approval requires --deliverableId <id>."],
      }, input.json);
    }

    const result = await this.lifecycle.submitForApproval({
      deliverableId: input.deliverableId.trim(),
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    return this.render({
      ok: result.ok,
      command: "submit-for-approval",
      rendered: true,
      ...(result.deliverable ? { deliverable: result.deliverable } : {}),
      warnings: result.warnings,
      errors: result.errors,
    }, input.json);
  }

  private render(result: SubmitForApprovalCommandResult, json?: boolean): SubmitForApprovalCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS SUBMIT FOR APPROVAL");
    console.log("=================================");
    if (result.deliverable) {
      console.log(`Deliverable: ${result.deliverable.deliverableId}`);
      console.log(`Status: ${result.deliverable.status}`);
      console.log(`Title: ${result.deliverable.title}`);
    }
    for (const warning of result.warnings) {
      console.log(`Warning: ${warning}`);
    }
    for (const error of result.errors) {
      console.log(`Error: ${error}`);
    }
    return result;
  }
}
