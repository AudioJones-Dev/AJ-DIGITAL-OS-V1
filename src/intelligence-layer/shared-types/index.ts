export interface StructuralNode {
  id: string;
  label: string;
  category: "actor" | "process" | "signal" | "resource" | "constraint";
}

export interface StructuralRelation {
  from: string;
  to: string;
  type: "flow" | "dependency" | "control" | "feedback";
  description?: string;
}

export interface StructuralAbstraction {
  primary_flow: string;
  nodes: StructuralNode[];
  relations: StructuralRelation[];
  constraints: string[];
  feedback_loops: string[];
  uncertainty_points: string[];
}

export interface ArchetypeClassification {
  primary_archetype: ArchetypeId;
  secondary_archetype?: ArchetypeId;
  confidence: number;
  rationale: string[];
  score_breakdown: Record<ArchetypeId, number>;
}

export interface AnalogicalMapping {
  source_element: string;
  target_element: string;
  relation: string;
}

export interface AnalogicalOutput {
  source_systems: string[];
  mappings: AnalogicalMapping[];
  systematicity_score: number;
  semantic_distance_score: number;
  transferable_inferences: string[];
  blocked_inferences: string[];
}

export interface ValidationResult {
  archetype_validity: number;
  analogy_validity: number;
  causal_alignment_score: number;
  confidence_score: number;
  weaknesses: string[];
  approved_inferences: string[];
  rejected_inferences: string[];
}

export interface InterventionPlan {
  primary_actions: string[];
  secondary_actions: string[];
  sequencing: string[];
  measurement_targets: string[];
  expected_outcomes: string[];
}

export interface PredictionModel {
  metrics: Record<string, number>;
  horizon_days: number;
  assumptions: string[];
}

export interface PredictionErrorMetric {
  predicted: number;
  actual: number;
  absolute_error: number;
  signed_error: number;
}

export interface PredictionErrorResult {
  by_metric: Record<string, PredictionErrorMetric>;
  aggregate_error: number;
  error_delta?: number;
  convergence_notes: string[];
}

export interface CompactCaseObject {
  case_id: string;
  archetype: ArchetypeId;
  schema_id_optional?: string;
  analogy_used: boolean;
  structural_mapping: string[];
  key_constraints: string[];
  intervention: InterventionPlan;
  predicted_outcome: Record<string, number>;
  actual_outcome?: Record<string, number>;
  prediction_error_before?: number;
  prediction_error_after?: number;
  lessons: string[];
  retrieval_tags: string[];
}

export interface TokenTelemetry {
  case_id: string;
  stage: string;
  agent: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_estimate: number;
}

export interface TokenBudgetPolicy {
  max_tokens_per_case: number;
  max_tokens_per_stage: number;
  soft_limit_ratio: number;
}

export interface DiagnoseSystemRequest {
  case_id: string;
  source: { type: string; origin: string };
  context: {
    company: string;
    industry: string;
    business_model: string;
    objective: string;
    constraints: string[];
  };
  problem: {
    description: string;
    symptoms: string[];
    observed_failures: string[];
    desired_outcome: string;
  };
  data: {
    metrics: Array<{ name: string; value: number }>;
    events: string[];
  };
  options?: {
    run_analogical_engine?: boolean;
    max_token_budget?: number;
    confidence_threshold?: number;
  };
}

export interface DiagnoseSystemResponse {
  case_id: string;
  status: "diagnosed";
  intake_summary: string;
  structural_abstraction: StructuralAbstraction;
  archetype_classification: ArchetypeClassification;
  analogical_output?: AnalogicalOutput;
  intervention_plan: InterventionPlan;
  prediction_model: PredictionModel;
  validation: ValidationResult;
  token_telemetry: TokenTelemetry[];
  storage: {
    compact_case_object: CompactCaseObject;
    schema_reference_ids: string[];
  };
}

export interface UpdateOutcomeRequest {
  case_id: string;
  actual_outcomes: Record<string, number>;
  notes?: string;
  intervention_status: "not_started" | "in_progress" | "completed";
  predicted_outcomes: Record<string, number>;
  prior_error?: number;
}

export interface UpdateOutcomeResponse {
  case_id: string;
  prediction_error: PredictionErrorResult;
  updated_schema: string;
  lessons: string[];
  reuse_eligibility: "high" | "medium" | "low";
}

export type ArchetypeId =
  | "bottleneck_constraint"
  | "transformation_failure"
  | "signal_degradation"
  | "feedback_delay"
  | "incentive_misalignment"
  | "capacity_mismatch"
  | "coordination_breakdown"
  | "compounding_decay";
