export type AgentExecutionMode = "advisory" | "orchestrated";

export interface AgentExecutionConstraints {
  allowedExecutionModes: AgentExecutionMode[];
  allowSideEffectsInAdvisory: boolean;
  allowSideEffectsInOrchestrated: boolean;
  persistAdvisoryDeliverables: boolean;
  persistOrchestratedDeliverables: boolean;
}

export interface AgentProfileRecord {
  recordType: "agent_profile";
  profileId: string;
  displayName: string;
  description: string;
  enabled: boolean;
  allowedToolNames: string[];
  allowedCapabilityIds: string[];
  executionConstraints: AgentExecutionConstraints;
  metadata: Record<string, unknown>;
}
