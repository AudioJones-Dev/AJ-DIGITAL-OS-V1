import { DeliverableLifecycleService } from "../services/runtime/deliverable-lifecycle.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

export interface PublishDeliverableCommandInput {
  deliverableId: string;
  actor?: string;
  notes?: string;
  json?: boolean;
}

export interface PublishDeliverableCommandResult {
  ok: boolean;
  command: "publish-deliverable";
  rendered: boolean;
  deliverable?: DeliverableRecord | undefined;
  warnings: string[];
  errors: string[];
}

export class PublishDeliverableCommand {
  constructor(private readonly lifecycle = new DeliverableLifecycleService()) {}

  async run(input: PublishDeliverableCommandInput): Promise<PublishDeliverableCommandResult> {
    if (!input.deliverableId.trim()) {
      return this.render({
        ok: false,
        command: "publish-deliverable",
        rendered: true,
        warnings: [],
        errors: ["publish-deliverable requires --deliverableId <id>."],
      }, input.json);
    }

    const result = await this.lifecycle.publishDeliverable({
      deliverableId: input.deliverableId.trim(),
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    return this.render({
      ok: result.ok,
      command: "publish-deliverable",
      rendered: true,
      ...(result.deliverable ? { deliverable: result.deliverable } : {}),
      warnings: result.warnings,
      errors: result.errors,
    }, input.json);
  }

  private render(result: PublishDeliverableCommandResult, json?: boolean): PublishDeliverableCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS PUBLISH DELIVERABLE");
    console.log("=================================");
    if (result.deliverable) {
      console.log(`Deliverable: ${result.deliverable.deliverableId}`);
      console.log(`Status: ${result.deliverable.status}`);
      console.log(`Output: ${result.deliverable.outputPath ?? "-"}`);
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
