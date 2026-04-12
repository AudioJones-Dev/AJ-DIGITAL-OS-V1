export type ToolCapabilityDomain =
  | "filesystem"
  | "web"
  | "messaging"
  | "calendar"
  | "content"
  | "automation"
  | "system"
  | "custom";

export interface ToolCapabilityDefinition {
  capabilityId: string;
  displayName: string;
  description: string;
  domain: ToolCapabilityDomain;
  scopes: string[];
  requiresNetwork: boolean;
  requiresSecretReference: boolean;
  metadata: Record<string, unknown>;
}
