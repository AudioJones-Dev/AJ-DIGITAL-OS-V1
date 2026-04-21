import { DeliverableStore } from "../core/deliverable-store.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

export interface DeliverablesCommandInput {
  limit?: number;
  brandId?: string;
  status?: DeliverableRecord["status"];
  json?: boolean;
}

export interface DeliverablesSummary {
  total: number;
  byStatus: Record<string, number>;
  latestUpdatedAt?: string;
}

export interface DeliverablesCommandResult {
  ok: boolean;
  command: "deliverables";
  rendered: boolean;
  entries: DeliverableRecord[];
  summary: DeliverablesSummary;
  warnings: string[];
  errors: string[];
}

export class DeliverablesCommand {
  constructor(private readonly deliverableStore = new DeliverableStore()) {}

  async run(input: DeliverablesCommandInput = {}): Promise<DeliverablesCommandResult> {
    const entries = await this.deliverableStore.list({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.status ? { status: input.status } : {}),
    });
    const summary = buildDeliverablesSummary(entries);

    if (input.json === true) {
      console.log(JSON.stringify({ ok: true, summary, entries }, null, 2));
    } else {
      this.renderHuman(entries, summary);
    }

    return {
      ok: true,
      command: "deliverables",
      rendered: true,
      entries,
      summary,
      warnings: [],
      errors: [],
    };
  }

  private renderHuman(entries: DeliverableRecord[], summary: DeliverablesSummary): void {
    console.log("AJ DIGITAL OS DELIVERABLES");
    console.log("==========================");
    console.log(`Total Entries: ${summary.total}`);
    console.log(`Latest Updated: ${summary.latestUpdatedAt ?? "-"}`);
    console.log(`By Status: ${formatStatusSummary(summary.byStatus)}`);
    console.log("");
    console.log("Recent Deliverables");

    if (entries.length === 0) {
      console.log("- None");
      return;
    }

    for (const entry of entries) {
      console.log(`- ${entry.updatedAt} | ${entry.status} | ${entry.deliverableType}`);
      console.log(`  Title: ${entry.title}`);
      console.log(`  Brand: ${entry.brandName ?? entry.brandId ?? "-"} | Workflow: ${entry.workflowId} | Run ID: ${entry.runId ?? "-"}`);
      console.log(`  Output: ${entry.outputPath ?? "-"} | Approval Required: ${entry.approvalRequired ? "yes" : "no"}`);
      console.log(`  Approved By: ${entry.approvedBy ?? "-"} | Approved At: ${entry.approvedAt ?? "-"} | Published At: ${entry.publishedAt ?? "-"}`);
    }
  }
}

const buildDeliverablesSummary = (entries: DeliverableRecord[]): DeliverablesSummary => {
  const byStatus = entries.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.status] = (accumulator[entry.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    total: entries.length,
    byStatus,
    ...(entries[0]?.updatedAt ? { latestUpdatedAt: entries[0].updatedAt } : {}),
  };
};

const formatStatusSummary = (summary: Record<string, number>): string => {
  const entries = Object.entries(summary);
  if (entries.length === 0) {
    return "-";
  }

  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}=${count}`)
    .join(", ");
};
