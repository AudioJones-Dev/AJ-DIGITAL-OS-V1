import type { IntegrationAuthStrategy, SecretReference } from "../types/integration-config.types.js";

export type ProviderProfileKind = "api" | "oauth" | "bot" | "mcp" | "model";

export interface ProviderProfileRecord {
  recordType: "provider_profile";
  profileId: string;
  providerKey: string;
  displayName: string;
  kind: ProviderProfileKind;
  enabled: boolean;
  baseUrl?: string | undefined;
  authStrategy: IntegrationAuthStrategy;
  defaultScopes: string[];
  supportedCapabilities: string[];
  secretRefs: SecretReference[];
  brandIds: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}
