import { listEvaluations } from "../decision/decision-store.js";
import type { MapEvaluation } from "../decision/decision-types.js";

export interface MapListCommandInput {
  tenantId?: string;
  limit?: number;
  json?: boolean;
}

export interface MapListCommandResult {
  ok: boolean;
  command: "map-list";
  evaluations: MapEvaluation[];
}

export class MapListCommand {
  async run(input: MapListCommandInput = {}): Promise<MapListCommandResult> {
    const filter: Parameters<typeof listEvaluations>[0] = {};
    if (input.tenantId !== undefined) filter.tenantId = input.tenantId;
    if (input.limit !== undefined) filter.limit = input.limit;
    const evaluations = listEvaluations(filter);

    if (input.json) {
      console.log(JSON.stringify({ ok: true, evaluations }, null, 2));
    } else {
      console.log(`MAP EVALUATIONS (${evaluations.length})`);
      console.log("=========================");
      for (const e of evaluations) {
        console.log(
          `[${e.createdAt}] ${e.evaluationId.slice(0, 8)} ${e.category} score=${e.mapScore} decision=${e.decision} — ${e.title}`,
        );
      }
    }

    return { ok: true, command: "map-list", evaluations };
  }
}
