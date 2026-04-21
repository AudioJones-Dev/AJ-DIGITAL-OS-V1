import { getArchetypeById, scoreArchetypes } from "../archetype-library/index.js";
import { computePredictionError } from "../prediction-error/index.js";
import {
  computeErrorReductionPer1kTokens,
  enforceTokenBudgetPolicy,
  recordTokenUsage,
  summarizeTokenUsageByCase,
} from "../token-governance/index.js";
import type {
  ArchetypeClassification,
  CompactCaseObject,
  DiagnoseSystemRequest,
  DiagnoseSystemResponse,
  InterventionPlan,
  TokenBudgetPolicy,
  TokenTelemetry,
  UpdateOutcomeRequest,
  UpdateOutcomeResponse,
} from "../shared-types/index.js";
import { reduceToStructuralAbstraction } from "./structural-reducer.js";

const DEFAULT_BUDGET_POLICY: TokenBudgetPolicy = {
  max_tokens_per_case: 5000,
  max_tokens_per_stage: 2000,
  soft_limit_ratio: 0.8,
};

export function classifyArchetype(input: DiagnoseSystemRequest): ArchetypeClassification {
  const structural = reduceToStructuralAbstraction(input);
  const scores = scoreArchetypes(structural);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const primary = ranked[0] ?? ["coordination_breakdown", 0.1];
  const secondary = ranked[1];

  const result: ArchetypeClassification = {
    primary_archetype: primary[0] as ArchetypeClassification["primary_archetype"],
    confidence: primary[1],
    rationale: [
      `Primary archetype score ${primary[1].toFixed(3)} derived from structural text matching.`,
      secondary ? `Secondary archetype ${secondary[0]} scored ${secondary[1].toFixed(3)}.` : "No strong secondary archetype.",
    ],
    score_breakdown: scores,
  };

  if (secondary) {
    result.secondary_archetype = secondary[0] as ArchetypeClassification["primary_archetype"];
  }

  return result;
}

export function generateInterventionPlan(archetypeId: ArchetypeClassification["primary_archetype"]): InterventionPlan {
  const archetype = getArchetypeById(archetypeId);

  return {
    primary_actions: archetype.default_intervention_classes.map((x) => `Execute ${x} workstream`),
    secondary_actions: archetype.diagnostic_questions.map((x) => `Answer: ${x}`),
    sequencing: ["stabilize measurement", "apply highest-impact intervention", "review feedback in 2 cycles"],
    measurement_targets: ["cycle_time", "error_rate", "throughput"],
    expected_outcomes: ["Reduced failure recurrence", "Higher throughput stability"],
  };
}

export function compressCase(input: {
  case_id: string;
  archetype: ArchetypeClassification["primary_archetype"];
  intervention: InterventionPlan;
  constraints: string[];
  predicted_outcome: Record<string, number>;
}): CompactCaseObject {
  const archetype = getArchetypeById(input.archetype);

  return {
    case_id: input.case_id,
    archetype: input.archetype,
    analogy_used: false,
    structural_mapping: archetype.structural_signature.nodes,
    key_constraints: input.constraints,
    intervention: input.intervention,
    predicted_outcome: input.predicted_outcome,
    lessons: [
      "Start from structural constraints before discussing implementation details.",
      "Track error delta after each intervention cycle.",
    ],
    retrieval_tags: archetype.retrieval_tags,
  };
}

export function diagnoseSystem(input: DiagnoseSystemRequest): DiagnoseSystemResponse {
  const structural = reduceToStructuralAbstraction(input);
  const classification = classifyArchetype(input);
  const interventionPlan = generateInterventionPlan(classification.primary_archetype);

  const expected_outcome_model = {
    metrics: {
      cycle_time: 0.2,
      error_rate: 0.15,
      throughput: 0.8,
    },
    horizon_days: 30,
    assumptions: ["Interventions start within one sprint", "No major objective changes during horizon"],
  };

  const tokenTelemetry: TokenTelemetry[] = [
    recordTokenUsage({ case_id: input.case_id, stage: "intake", agent: "ais-core", model: "deterministic-v1", prompt_tokens: 120, completion_tokens: 40 }),
    recordTokenUsage({ case_id: input.case_id, stage: "classification", agent: "archetype-router", model: "deterministic-v1", prompt_tokens: 80, completion_tokens: 32 }),
    recordTokenUsage({ case_id: input.case_id, stage: "planning", agent: "intervention-planner", model: "deterministic-v1", prompt_tokens: 90, completion_tokens: 50 }),
  ];

  const budgetPolicy: TokenBudgetPolicy = {
    ...DEFAULT_BUDGET_POLICY,
    max_tokens_per_case: input.options?.max_token_budget ?? DEFAULT_BUDGET_POLICY.max_tokens_per_case,
  };
  const budgetCheck = enforceTokenBudgetPolicy(tokenTelemetry, budgetPolicy);
  const compactCase = compressCase({
    case_id: input.case_id,
    archetype: classification.primary_archetype,
    intervention: interventionPlan,
    constraints: structural.constraints,
    predicted_outcome: expected_outcome_model.metrics,
  });

  return {
    case_id: input.case_id,
    status: "diagnosed",
    intake_summary: `${input.problem.description} (${input.problem.symptoms.length} symptoms captured)`,
    structural_abstraction: structural,
    archetype_classification: classification,
    intervention_plan: interventionPlan,
    expected_outcome_model,
    validation: {
      archetype_validity: classification.confidence,
      analogy_validity: 0,
      causal_alignment_score: Math.max(0.4, classification.confidence - 0.1),
      confidence_score: classification.confidence,
      weaknesses: budgetCheck.allowed ? [] : budgetCheck.reasons,
      approved_inferences: ["Primary archetype can support initial intervention planning."],
      rejected_inferences: ["Cross-domain analogical transfer deferred in foundational mode."],
    },
    token_telemetry: tokenTelemetry,
    storage: {
      compact_case_object: compactCase,
      schema_reference_ids: [`schema:${classification.primary_archetype}:v1`],
      routing_hints: {
        requires_qualification: true,
        requires_attribution: true,
        requires_template_mapping: true,
      },
    },
  };
}

export function updateOutcome(input: UpdateOutcomeRequest): UpdateOutcomeResponse {
  const prediction_error = computePredictionError(input.predicted_outcomes, input.actual_outcomes, input.prior_error);
  const mockTelemetry: TokenTelemetry[] = [
    recordTokenUsage({
      case_id: input.case_id,
      stage: "outcome-update",
      agent: "prediction-error",
      model: "deterministic-v1",
      prompt_tokens: 40,
      completion_tokens: 20,
    }),
  ];

  const efficiency = computeErrorReductionPer1kTokens(
    input.prior_error ?? prediction_error.aggregate_error,
    prediction_error.aggregate_error,
    mockTelemetry,
  );

  const summary = summarizeTokenUsageByCase(mockTelemetry);

  return {
    case_id: input.case_id,
    prediction_error,
    updated_schema: `schema:update:${new Date().toISOString().slice(0, 10)}`,
    lessons: [
      `Error reduction per 1k tokens: ${efficiency}`,
      `Outcome update consumed ${summary.total_tokens} tokens.`,
    ],
    reuse_eligibility: prediction_error.aggregate_error <= 0.15 ? "high" : prediction_error.aggregate_error <= 0.3 ? "medium" : "low",
  };
}
