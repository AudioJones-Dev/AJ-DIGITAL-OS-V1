import { listCycles } from "../decision/decision-store.js";
import type { CeraCycle } from "../decision/decision-types.js";

export interface CeraListCommandInput {
  tenantId?: string;
  evaluationId?: string;
  limit?: number;
  json?: boolean;
}

export interface CeraListCommandResult {
  ok: boolean;
  command: "cera-list";
  cycles: CeraCycle[];
}

export class CeraListCommand {
  async run(input: CeraListCommandInput = {}): Promise<CeraListCommandResult> {
    const filter: Parameters<typeof listCycles>[0] = {};
    if (input.tenantId !== undefined) filter.tenantId = input.tenantId;
    if (input.evaluationId !== undefined) filter.evaluationId = input.evaluationId;
    if (input.limit !== undefined) filter.limit = input.limit;
    const cycles = listCycles(filter);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, cycles }, null, 2));
    } else {
      console.log(`CERA CYCLES (${cycles.length})`);
      console.log("==========================");
      for (const c of cycles) {
        console.log(
          `[${c.createdAt}] ${c.cycleId.slice(0, 8)} eval=${c.evaluationId.slice(0, 8)} compound=${c.compoundScore.toFixed(1)} path=${c.decisionPath}`,
        );
      }
    }

    return { ok: true, command: "cera-list", cycles };
  }
}
