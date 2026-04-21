import type { SecretReferencePurpose } from "../types/integration-config.types.js";

export type SecretProviderStatus = "placeholder" | "configured" | "error";

export interface SecretMetadataRecord {
  secretId: string;
  provider: string;
  purpose: SecretReferencePurpose;
  integrationKey: string;
  label: string;
  status: SecretProviderStatus;
  createdAt: string;
  updatedAt: string;
  brandId?: string | undefined;
  profileId?: string | undefined;
  externalKeyName?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  notes?: string | undefined;
}

export interface SecretReferenceBinding {
  referenceId: string;
  secretId: string;
  provider: string;
  purpose: SecretReferencePurpose;
  integrationKey: string;
  field: string;
  brandId?: string | undefined;
  profileId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface SecretsProvider {
  readonly name: string;
  initialize(): Promise<void>;
  listMetadata(): Promise<SecretMetadataRecord[]>;
  getMetadata(secretId: string): Promise<SecretMetadataRecord | undefined>;
  saveMetadata(record: SecretMetadataRecord): Promise<SecretMetadataRecord>;
  listReferences(): Promise<SecretReferenceBinding[]>;
  getReference(referenceId: string): Promise<SecretReferenceBinding | undefined>;
  saveReference(reference: SecretReferenceBinding): Promise<SecretReferenceBinding>;
  readSecret(secretId: string): Promise<string | undefined>;
  writeSecret(secretId: string, value: string): Promise<void>;
  deleteSecret(secretId: string): Promise<void>;
}
