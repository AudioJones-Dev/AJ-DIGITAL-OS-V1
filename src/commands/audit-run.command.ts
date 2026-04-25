import { getAuditEvents } from "../control-plane/run-registry/run-audit-log.js";

export interface AuditRunCommandInput {
  runId: string;
  json?: boolean;
  limit?: number;
}

export interface AuditRunCommandResult {
  ok: boolean;
  events?: ReturnType<typeof getAuditEvents>;
  error?: string;
}

export class AuditRunCommand {
  async run(input: AuditRunCommandInput): Promise<AuditRunCommandResult> {
    try {
      const events = getAuditEvents(input.runId, input.limit);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, events }, null, 2));
        return { ok: true, events };
      }

      if (events.length === 0) {
        console.log(`No audit events found for run: ${input.runId}`);
        return { ok: true, events };
      }

      console.log(`Audit Trail: ${input.runId}`);
      console.log("========================");
      for (const e of events) {
        console.log(`  [${e.timestamp}] ${e.action.toUpperCase()}: ${e.fromState} → ${e.toState} by ${e.performedBy}`);
        if (e.metadata && Object.keys(e.metadata).length > 0) {
          console.log(`    metadata: ${JSON.stringify(e.metadata)}`);
        }
      }
      return { ok: true, events };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
