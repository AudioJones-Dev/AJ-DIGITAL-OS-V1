import { DeliverableStore } from "../core/deliverable-store.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

export interface ListPendingDeliverablesCommandInput {
  limit?: number;
  brandId?: string;
  json?: boolean;
}

export interface ListPendingDeliverablesCommandResult {
  ok: boolean;
  command: "list-pending-deliverables";
  rendered: boolean;
  entries: DeliverableRecord[];
  warnings: string[];
  errors: string[];
}

export class ListPendingDeliverablesCommand {
  constructor(private readonly deliverableStore = new DeliverableStore()) {}

  async run(input: ListPendingDeliverablesCommandInput = {}): Promise<ListPendingDeliverablesCommandResult> {
    const entries = await this.deliverableStore.list({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      status: "pending_approval",
    });

    const result: ListPendingDeliverablesCommandResult = {
      ok: true,
      command: "list-pending-deliverables",
      rendered: true,
      entries,
      warnings: [],
      errors: [],
    };

    if (input.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS PENDING DELIVERABLES");
    console.log("==================================");
    if (entries.length === 0) {
      console.log("- None");
      return result;
    }

    for (const entry of entries) {
      console.log(`- ${entry.updatedAt} | ${entry.deliverableId}`);
      console.log(`  Title: ${entry.title}`);
      console.log(`  Brand: ${entry.brandName ?? entry.brandId ?? "-"} | Workflow: ${entry.workflowId}`);
    }

    return result;
  }
}
