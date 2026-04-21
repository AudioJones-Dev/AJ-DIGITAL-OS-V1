import type { TokenBudgetPolicy, TokenTelemetry } from "../shared-types/index.js";

const DEFAULT_COST_PER_1K = 0.01;

export function recordTokenUsage(
  usage: Omit<TokenTelemetry, "total_tokens" | "cost_estimate">,
  costPer1kTokens = DEFAULT_COST_PER_1K,
): TokenTelemetry {
  const total_tokens = usage.prompt_tokens + usage.completion_tokens;

  return {
    ...usage,
    total_tokens,
    cost_estimate: Number(((total_tokens / 1000) * costPer1kTokens).toFixed(6)),
  };
}

export function summarizeTokenUsageByCase(tokenEvents: TokenTelemetry[]): {
  total_tokens: number;
  total_cost_estimate: number;
  by_stage: Record<string, number>;
  by_agent: Record<string, number>;
} {
  return tokenEvents.reduce(
    (acc, event) => {
      acc.total_tokens += event.total_tokens;
      acc.total_cost_estimate = Number((acc.total_cost_estimate + event.cost_estimate).toFixed(6));
      acc.by_stage[event.stage] = (acc.by_stage[event.stage] ?? 0) + event.total_tokens;
      acc.by_agent[event.agent] = (acc.by_agent[event.agent] ?? 0) + event.total_tokens;
      return acc;
    },
    {
      total_tokens: 0,
      total_cost_estimate: 0,
      by_stage: {} as Record<string, number>,
      by_agent: {} as Record<string, number>,
    },
  );
}

export function computeErrorReductionPer1kTokens(
  errorBefore: number,
  errorAfter: number,
  tokenEvents: TokenTelemetry[],
): number {
  const totalTokens = tokenEvents.reduce((sum, event) => sum + event.total_tokens, 0);
  if (totalTokens === 0) {
    return 0;
  }

  const errorReduction = errorBefore - errorAfter;
  return Number(((errorReduction / totalTokens) * 1000).toFixed(6));
}

export function enforceTokenBudgetPolicy(
  tokenEvents: TokenTelemetry[],
  policy: TokenBudgetPolicy,
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const summary = summarizeTokenUsageByCase(tokenEvents);

  if (summary.total_tokens > policy.max_tokens_per_case) {
    reasons.push("Case token usage exceeded hard case budget.");
  }

  for (const [stage, total] of Object.entries(summary.by_stage)) {
    if (total > policy.max_tokens_per_stage) {
      reasons.push(`Stage '${stage}' exceeded per-stage budget.`);
    }
  }

  if (summary.total_tokens > policy.max_tokens_per_case * policy.soft_limit_ratio) {
    reasons.push("Case token usage exceeded soft budget threshold.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}
