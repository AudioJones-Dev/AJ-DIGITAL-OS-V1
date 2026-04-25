import { getDecisionAuditEvents } from "../decision/decision-store.js";
import type { DecisionAuditEvent } from "../decision/decision-types.js";

export interface DecisionAuditCommandInput {
  evaluationId?: string;
  cycleId?: string;
  event?: string;
  limit?: number;
  json?: boolean;
}

export interface DecisionAuditCommandResult {
  ok: boolean;
  command: "decision-audit";
  events: DecisionAuditEvent[];
}

export class DecisionAuditCommand {
  async run(input: DecisionAuditCommandInput = {}): Promise<DecisionAuditCommandResult> {
    const filter: Parameters<typeof getDecisionAuditEvents>[0] = {};
    if (input.evaluationId !== undefined) filter.evaluationId = input.evaluationId;
    if (input.cycleId !== undefined) filter.cycleId = input.cycleId;
    if (input.event !== undefined) filter.event = input.event;
    if (input.limit !== undefined) filter.limit = input.limit;
    const events = getDecisionAuditEvents(filter);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, events }, null, 2));
    } else {
      console.log(`DECISION AUDIT (${events.length})`);
      console.log("============================");
      for (const e of events) {
        const ref = e.evaluationId ?? e.cycleId ?? "-";
        console.log(`[${e.timestamp}] ${e.event} ref=${ref.slice(0, 8)}`);
      }
    }

    return { ok: true, command: "decision-audit", events };
  }
}
