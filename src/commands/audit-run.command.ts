import {
  getAuditEvents,
  type AuditEvent,
} from "../control-plane/run-registry/index.js";

export interface AuditRunCommandInput {
  runId: string;
  json?: boolean;
  limit?: number;
}

export interface AuditRunCommandResult {
  ok: boolean;
  command: "audit-run";
  events: AuditEvent[];
  total: number;
}

export class AuditRunCommand {
  async run(input: AuditRunCommandInput): Promise<AuditRunCommandResult> {
    const events = getAuditEvents(input.runId, input.limit ?? 50);

    if (input.json === true) {
      console.log(JSON.stringify({ total: events.length, events }, null, 2));
    } else {
      this.renderHuman(input.runId, events);
    }

    return { ok: true, command: "audit-run", events, total: events.length };
  }

  private renderHuman(runId: string, events: AuditEvent[]): void {
    console.log(`AUDIT TRAIL — ${runId}`);
    console.log("=".repeat(20 + runId.length));
    if (events.length === 0) {
      console.log("No audit events found.");
      return;
    }
    for (const ev of events) {
      console.log(`[${ev.timestamp}] ${ev.action.toUpperCase()} ${ev.fromState} → ${ev.toState} by ${ev.performedBy}`);
    }
  }
}
