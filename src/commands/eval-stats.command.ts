import { listDagRuns } from "../bel/dag/dag-store.js";
import { listVerdicts } from "../evaluation/eval-store.js";
import { countGoldenCases, listGoldenEngines } from "../evaluation/golden-loader.js";
import type { EvalStats } from "../evaluation/eval-types.js";

export interface EvalStatsCommandInput {
  engine?: string;
  tenantId?: string;
  json?: boolean;
}

export interface EvalStatsCommandResult {
  ok: boolean;
  command: "eval-stats";
  stats: EvalStats;
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export class EvalStatsCommand {
  async run(input: EvalStatsCommandInput = {}): Promise<EvalStatsCommandResult> {
    const verdicts = listVerdicts({
      ...(input.engine !== undefined ? { engine: input.engine } : {}),
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    });

    // Coverage is about REAL run-backed verdicts only — golden-replay verdicts
    // (synthetic runIds, basis "golden_case") must not inflate the numerator.
    const realVerdicts = verdicts.filter((v) => v.basis !== "golden_case");

    const terminalRunIds = new Set(
      listDagRuns(input.tenantId !== undefined ? { tenantId: input.tenantId } : undefined)
        .filter((r) => TERMINAL_STATUSES.has(r.status))
        .map((r) => r.runId),
    );
    const totalRuns = terminalRunIds.size;

    // Numerator: distinct REAL terminal runs that actually carry a verdict.
    const verdictedRuns = new Set(
      realVerdicts.map((v) => v.runId).filter((id) => terminalRunIds.has(id)),
    ).size;
    const verdictCoverageRate = totalRuns === 0 ? 0 : verdictedRuns / totalRuns;

    const goldenCaseCount =
      input.engine !== undefined
        ? countGoldenCases(input.engine)
        : listGoldenEngines().reduce((sum, e) => sum + countGoldenCases(e), 0);

    const goldenVerdicts = verdicts.filter((v) => v.basis === "golden_case");
    const goldenPassRate =
      goldenVerdicts.length === 0
        ? 0
        : goldenVerdicts.filter((v) => v.outcome === "pass").length / goldenVerdicts.length;

    const byOutcome = {
      pass: realVerdicts.filter((v) => v.outcome === "pass").length,
      partial: realVerdicts.filter((v) => v.outcome === "partial").length,
      fail: realVerdicts.filter((v) => v.outcome === "fail").length,
    };

    const stats: EvalStats = {
      engine: input.engine ?? "all",
      totalRuns,
      verdictedRuns,
      verdictCoverageRate: Number(verdictCoverageRate.toFixed(4)),
      goldenCaseCount,
      goldenPassRate: Number(goldenPassRate.toFixed(4)),
      byOutcome,
    };

    if (input.json) {
      console.log(JSON.stringify({ ok: true, stats }, null, 2));
    } else {
      console.log(`EVAL STATS (${stats.engine})`);
      console.log("==========================");
      console.log(`Verdict coverage: ${(stats.verdictCoverageRate * 100).toFixed(1)}%  (${stats.verdictedRuns}/${stats.totalRuns} terminal runs)`);
      console.log(`Golden cases:     ${stats.goldenCaseCount}`);
      console.log(`Golden pass rate: ${(stats.goldenPassRate * 100).toFixed(1)}%`);
      console.log(`Outcomes:         pass=${byOutcome.pass} partial=${byOutcome.partial} fail=${byOutcome.fail}`);
    }

    return { ok: true, command: "eval-stats", stats };
  }
}
