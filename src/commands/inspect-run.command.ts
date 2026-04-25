import { getControlRun } from "../control-plane/run-registry/run-control-store.js";
import { getAuditEvents } from "../control-plane/run-registry/run-audit-log.js";

export interface InspectRunCommandInput {
  runId: string;
  json?: boolean;
}

export interface InspectRunCommandResult {
  ok: boolean;
  data?: ReturnType<typeof getControlRun>;
  error?: string;
}

export class InspectRunCommand {
  async run(input: InspectRunCommandInput): Promise<InspectRunCommandResult> {
    try {
      const record = getControlRun(input.runId);
      if (!record) {
        const error = `Run not found: ${input.runId}`;
        console.error(error);
        return { ok: false, error };
      }

      const events = getAuditEvents(input.runId, 10);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: record, recentAudit: events }, null, 2));
        return { ok: true, data: record };
      }

      console.log(`Run: ${record.runId}`);
      console.log("===================");
      console.log(`  Agent:    ${record.agentId}`);
      console.log(`  State:    ${record.controlState}`);
      if (record.previousState) console.log(`  Previous: ${record.previousState}`);
      console.log(`  Created:  ${record.createdAt}`);
      console.log(`  Updated:  ${record.updatedAt}`);
      if (record.approvedBy) console.log(`  Approved by: ${record.approvedBy}`);
      if (record.cancelledBy) console.log(`  Cancelled by: ${record.cancelledBy}`);

      if (events.length > 0) {
        console.log("\nRecent Audit Events");
        console.log("-------------------");
        for (const e of events) {
          console.log(`  [${e.timestamp}] ${e.action}: ${e.fromState} → ${e.toState} by ${e.performedBy}`);
        }
      }

      return { ok: true, data: record };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
