import { getDagAuditEvents } from "../bel/dag/dag-store.js";
import type { BelDagAuditEvent } from "../bel/dag/dag-types.js";

export interface DagAuditCommandInput {
  runId: string;
  json?: boolean;
  limit?: number;
}

export interface DagAuditCommandResult {
  ok: boolean;
  data?: BelDagAuditEvent[];
  error?: string;
}

export class DagAuditCommand {
  async run(input: DagAuditCommandInput): Promise<DagAuditCommandResult> {
    try {
      if (!input.runId) {
        const error = "--runId <id> is required";
        if (input.json) console.log(JSON.stringify({ ok: false, error }));
        else console.error(error);
        return { ok: false, error };
      }

      const filter: Parameters<typeof getDagAuditEvents>[0] = { runId: input.runId };
      if (input.limit !== undefined) filter.limit = input.limit;
      const events = getDagAuditEvents(filter);

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: events }, null, 2));
        return { ok: true, data: events };
      }

      if (events.length === 0) {
        console.log(`No audit events for ${input.runId}.`);
        return { ok: true, data: events };
      }

      console.log(`Audit Events: ${input.runId}`);
      console.log("==========================");
      for (const e of events) {
        const arrow = e.fromStatus && e.toStatus ? `${e.fromStatus} → ${e.toStatus}` : "";
        console.log(`  [${e.timestamp}] ${e.event}${e.nodeId ? ` (node=${e.nodeId})` : ""} ${arrow}`);
      }
      return { ok: true, data: events };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
