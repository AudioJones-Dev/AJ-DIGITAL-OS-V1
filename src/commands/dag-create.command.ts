import { readFileSync } from "node:fs";
import { createDagRun } from "../bel/dag/dag-runtime.js";
import { validateDagPlan } from "../bel/dag/dag-validator.js";
import type { BelDagPlan, BelDagRunState, BelDagValidationResult } from "../bel/dag/dag-types.js";

export interface DagCreateCommandInput {
  file?: string;
  json?: boolean;
  actor?: string;
}

export interface DagCreateCommandResult {
  ok: boolean;
  data?: BelDagRunState;
  validation?: BelDagValidationResult;
  error?: string;
}

export class DagCreateCommand {
  async run(input: DagCreateCommandInput): Promise<DagCreateCommandResult> {
    try {
      if (!input.file) {
        const error = "--file <path-to-plan.json> is required";
        if (input.json) console.log(JSON.stringify({ ok: false, error }));
        else console.error(error);
        return { ok: false, error };
      }

      const raw = readFileSync(input.file, "utf-8");
      const plan = JSON.parse(raw) as BelDagPlan;
      const validation = validateDagPlan(plan);

      if (!validation.valid) {
        if (input.json) {
          console.log(JSON.stringify({ ok: false, validation }, null, 2));
        } else {
          console.error("DAG plan invalid:");
          for (const e of validation.errors) console.error(`  - ${e}`);
        }
        return { ok: false, validation, error: "Invalid DAG plan" };
      }

      const state = createDagRun(plan, input.actor !== undefined ? { actor: input.actor } : {});

      if (input.json) {
        console.log(JSON.stringify({ ok: true, data: state, validation }, null, 2));
      } else {
        console.log(`Created DAG run ${state.runId} (dag=${state.dagId}, status=${state.status}, nodes=${state.nodes.length})`);
        if (validation.warnings && validation.warnings.length > 0) {
          console.log("Warnings:");
          for (const w of validation.warnings) console.log(`  - ${w}`);
        }
      }
      return { ok: true, data: state, validation };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      if (input.json) console.log(JSON.stringify({ ok: false, error }));
      else console.error(`Error: ${error}`);
      return { ok: false, error };
    }
  }
}
