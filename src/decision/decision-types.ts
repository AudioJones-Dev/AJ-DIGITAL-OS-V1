export type DecisionCategory =
  | "offer"
  | "campaign"
  | "workflow"
  | "content"
  | "automation"
  | "agent_action"
  | "operational_change"
  | "client_strategy";

export type MapDecisionBand = "strong_alignment" | "moderate_alignment" | "weak_alignment";
export type MapDecision = "execute" | "improve" | "reconsider";
export type CompoundDecisionPath = "scale" | "pivot" | "kill";

export type DecisionEnvironment = "local" | "dev" | "staging" | "production";

export interface DecisionInput {
  title: string;
  description: string;
  category: DecisionCategory;
  meaningfulScore: number;
  actionableScore: number;
  profitableScore: number;
  tenantId?: string;
  runId?: string;
  createdBy: string;
  environment: DecisionEnvironment;
  policyVersion?: string;
  aeoScore?: number;
}

export interface MapEvaluation {
  evaluationId: string;
  tenantId?: string;
  runId?: string;
  title: string;
  description: string;
  category: DecisionCategory;
  meaningfulScore: number;
  actionableScore: number;
  profitableScore: number;
  mapScore: number;
  decisionBand: MapDecisionBand;
  decision: MapDecision;
  reasoning: string;
  createdAt: string;
  createdBy: string;
  environment: DecisionEnvironment;
  policyVersion: string;
}

export interface CeraCycle {
  cycleId: string;
  tenantId?: string;
  evaluationId: string;
  runId?: string;
  captureSignals: string[];
  extractedInsights: string[];
  refinementActions: string[];
  amplificationActions: string[];
  ceraEfficiencyScore: number;
  compoundScore: number;
  decisionPath: CompoundDecisionPath;
  createdAt: string;
  updatedAt: string;
}

export interface CompoundScore {
  evaluationId: string;
  cycleId: string;
  mapScore: number;
  ceraEfficiencyScore: number;
  compoundScore: number;
  decisionPath: CompoundDecisionPath;
}

export interface DecisionAuditEvent {
  eventId: string;
  evaluationId?: string;
  cycleId?: string;
  event: string;
  timestamp: string;
  actorId?: string;
  tenantId?: string;
  payload: Record<string, unknown>;
}

export interface CeraSignals {
  captureSignals: string[];
  extractedInsights: string[];
  refinementActions: string[];
  amplificationActions: string[];
  tenantId?: string;
  runId?: string;
}

export interface DecisionPolicyContext {
  actorType?: "system" | "user" | "agent";
  forceExecute?: boolean;
}

export interface DecisionPolicyResult {
  allowed: boolean;
  reason?: string;
  routedTo: "execute" | "improve" | "reconsider" | "blocked";
}

export const CATEGORIES_REQUIRING_MAP: DecisionCategory[] = [
  "agent_action",
  "automation",
  "campaign",
  "offer",
  "client_strategy",
];

export const DECISION_POLICY_VERSION = "1.0.0";
