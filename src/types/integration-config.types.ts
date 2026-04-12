export type IntegrationRecordKind = "channel_adapter" | "connector";
export type IntegrationStatus =
  | "not_configured"
  | "configured"
  | "connecting"
  | "connected"
  | "degraded"
  | "error"
  | "disabled";
export type IntegrationAuthStrategy =
  | "none"
  | "api_key"
  | "oauth2"
  | "bot_token"
  | "session_token"
  | "local_path";
export type SecretReferencePurpose =
  | "api_token"
  | "api_key"
  | "oauth_client_id"
  | "oauth_client_secret"
  | "oauth_refresh_token"
  | "bot_token"
  | "signing_secret"
  | "session_cookie"
  | "local_encryption_key";

export interface SecretReference {
  provider: string;
  secretId: string;
  purpose: SecretReferencePurpose;
  field: string;
  version?: number | undefined;
}

export interface IntegrationAuthConfig {
  strategy: IntegrationAuthStrategy;
  scopes: string[];
  secretRefs: SecretReference[];
}

export interface IntegrationStatusRecord {
  state: IntegrationStatus;
  message: string;
  lastCheckedAt?: string | undefined;
  lastConnectedAt?: string | undefined;
  lastErrorCode?: string | undefined;
}

export interface IntegrationConfigRecord {
  integrationId: string;
  integrationKey: string;
  kind: IntegrationRecordKind;
  displayName: string;
  enabled: boolean;
  auth: IntegrationAuthConfig;
  settings: Record<string, unknown>;
  status: IntegrationStatusRecord;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}
