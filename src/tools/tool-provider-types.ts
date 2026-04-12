export type ToolProviderKind = "native" | "mcp";
export type ToolProviderTransport = "in_process" | "stdio" | "http" | "websocket";
export type ToolProviderStatus = "scaffolded" | "configured" | "ready" | "disabled";

export interface ToolProviderDefinition {
  providerId: string;
  displayName: string;
  kind: ToolProviderKind;
  enabled: boolean;
  transport: ToolProviderTransport;
  integrationProfileId?: string | undefined;
  secretReferenceIds: string[];
  capabilityIds: string[];
  status: ToolProviderStatus;
  metadata: Record<string, unknown>;
}
