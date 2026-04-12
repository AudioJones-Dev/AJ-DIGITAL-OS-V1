import { DeliverableLifecycleService } from "../services/runtime/deliverable-lifecycle.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

export interface ApproveDeliverableCommandInput {
  deliverableId: string;
  actor?: string;
  notes?: string;
  json?: boolean;
}

export interface ApproveDeliverableCommandResult {
  ok: boolean;
  command: "approve-deliverable";
  rendered: boolean;
  deliverable?: DeliverableRecord | undefined;
  warnings: string[];
  errors: string[];
}

export class ApproveDeliverableCommand {
  constructor(private readonly lifecycle = new DeliverableLifecycleService()) {}

  async run(input: ApproveDeliverableCommandInput): Promise<ApproveDeliverableCommandResult> {
    if (!input.deliverableId.trim()) {
      return this.render({
        ok: false,
        command: "approve-deliverable",
        rendered: true,
        warnings: [],
        errors: ["approve-deliverable requires --deliverableId <id>."],
      }, input.json);
    }

    const result = await this.lifecycle.approveDeliverable({
      deliverableId: input.deliverableId.trim(),
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    return this.render({
      ok: result.ok,
      command: "approve-deliverable",
      rendered: true,
      ...(result.deliverable ? { deliverable: result.deliverable } : {}),
      warnings: result.warnings,
      errors: result.errors,
    }, input.json);
  }

  private render(result: ApproveDeliverableCommandResult, json?: boolean): ApproveDeliverableCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS APPROVE DELIVERABLE");
    console.log("=================================");
    if (result.deliverable) {
      console.log(`Deliverable: ${result.deliverable.deliverableId}`);
      console.log(`Status: ${result.deliverable.status}`);
      console.log(`Approved By: ${result.deliverable.approvedBy ?? "-"}`);
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
