import type {
  IntegrationStatusRecord,
  SecretReference,
} from "../types/integration-config.types.js";

export interface ApiIntegrationProfileRecord {
  recordType: "api_integration_profile";
  profileId: string;
  integrationKey: string;
  displayName: string;
  providerProfileId: string;
  enabled: boolean;
  brandIds: string[];
  connectorIds: string[];
  channelAdapterIds: string[];
  scopes: string[];
  capabilities: string[];
  secretRefs: SecretReference[];
  status: IntegrationStatusRecord;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}
