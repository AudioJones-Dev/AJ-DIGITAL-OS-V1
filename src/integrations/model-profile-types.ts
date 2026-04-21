export type ModelTaskUsageClass =
  | "advisory"
  | "workflow"
  | "coder"
  | "chat"
  | "tool_reasoning";

export interface ModelRoutingPreferences {
  advisory: boolean;
  workflow: boolean;
  coder: boolean;
  chat: boolean;
  toolReasoning: boolean;
}

export interface BrandModelOverride {
  brandId: string;
  baseModel?: string | undefined;
  fineTuneReference?: string | undefined;
  preferredTaskClasses: ModelTaskUsageClass[];
  metadata: Record<string, unknown>;
}

export interface ModelProfileRecord {
  recordType: "model_profile";
  profileId: string;
  displayName: string;
  provider: string;
  baseModel: string;
  modelReference: string;
  fineTuneReference?: string | undefined;
  enabled: boolean;
  brandIds: string[];
  integrationProfileIds: string[];
  taskUsageClasses: ModelTaskUsageClass[];
  routingPreferences: ModelRoutingPreferences;
  brandOverrides: BrandModelOverride[];
  taskTypePreferences: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}
