import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  SecretMetadataRecord,
  SecretReferenceBinding,
  SecretsProvider,
} from "./secrets-provider.js";

interface SecretMetadataManifest {
  secrets: SecretMetadataRecord[];
  references: SecretReferenceBinding[];
}

const EMPTY_MANIFEST: SecretMetadataManifest = { secrets: [], references: [] };

export class FileSecretsProvider implements SecretsProvider {
  readonly name = "file-scaffold";
  private readonly secretsDirectory: string;
  private readonly manifestPath: string;

  constructor(secretsDirectory = path.resolve("data", "secrets")) {
    this.secretsDirectory = secretsDirectory;
    this.manifestPath = path.join(secretsDirectory, "manifest.json");
  }

  async initialize(): Promise<void> {
    await mkdir(this.secretsDirectory, { recursive: true });
  }

  async listMetadata(): Promise<SecretMetadataRecord[]> {
    const manifest = await this.loadManifest();
    return manifest.secrets.sort((left, right) => left.label.localeCompare(right.label));
  }

  async getMetadata(secretId: string): Promise<SecretMetadataRecord | undefined> {
    const manifest = await this.loadManifest();
    return manifest.secrets.find((record) => record.secretId === secretId);
  }

  async saveMetadata(record: SecretMetadataRecord): Promise<SecretMetadataRecord> {
    const manifest = await this.loadManifest();
    const existingIndex = manifest.secrets.findIndex((candidate) => candidate.secretId === record.secretId);
    if (existingIndex >= 0) {
      manifest.secrets[existingIndex] = record;
    } else {
      manifest.secrets.push(record);
    }

    await this.writeManifest(manifest);
    return record;
  }

  async listReferences(): Promise<SecretReferenceBinding[]> {
    const manifest = await this.loadManifest();
    return manifest.references.sort((left, right) => left.referenceId.localeCompare(right.referenceId));
  }

  async getReference(referenceId: string): Promise<SecretReferenceBinding | undefined> {
    const manifest = await this.loadManifest();
    return manifest.references.find((record) => record.referenceId === referenceId);
  }

  async saveReference(reference: SecretReferenceBinding): Promise<SecretReferenceBinding> {
    const manifest = await this.loadManifest();
    const existingIndex = manifest.references.findIndex((candidate) => candidate.referenceId === reference.referenceId);
    if (existingIndex >= 0) {
      manifest.references[existingIndex] = reference;
    } else {
      manifest.references.push(reference);
    }

    await this.writeManifest(manifest);
    return reference;
  }

  async readSecret(_secretId: string): Promise<string | undefined> {
    throw new Error("FileSecretsProvider raw secret reads are intentionally not implemented in this scaffold.");
  }

  async writeSecret(_secretId: string, _value: string): Promise<void> {
    throw new Error("FileSecretsProvider raw secret writes are intentionally not implemented in this scaffold.");
  }

  async deleteSecret(_secretId: string): Promise<void> {
    throw new Error("FileSecretsProvider raw secret deletion is intentionally not implemented in this scaffold.");
  }

  private async loadManifest(): Promise<SecretMetadataManifest> {
    await this.initialize();

    try {
      const raw = await readFile(this.manifestPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<SecretMetadataManifest>;
      return Array.isArray(parsed.secrets)
        ? {
            secrets: parsed.secrets.filter(isSecretMetadataRecord),
            references: Array.isArray(parsed.references)
              ? parsed.references.filter(isSecretReferenceBindingRecord)
              : [],
          }
        : EMPTY_MANIFEST;
    } catch (error) {
      if (isMissingFileError(error)) {
        return EMPTY_MANIFEST;
      }

      throw error;
    }
  }

  private async writeManifest(manifest: SecretMetadataManifest): Promise<void> {
    await this.initialize();
    await writeFile(this.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  }
}

const isMissingFileError = (error: unknown): boolean => {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
};

const isSecretMetadataRecord = (value: unknown): value is SecretMetadataRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<SecretMetadataRecord>;
  return typeof candidate.secretId === "string"
    && typeof candidate.provider === "string"
    && typeof candidate.purpose === "string"
    && typeof candidate.integrationKey === "string"
    && typeof candidate.label === "string"
    && typeof candidate.status === "string"
    && typeof candidate.createdAt === "string"
    && typeof candidate.updatedAt === "string";
};

const isSecretReferenceBindingRecord = (value: unknown): value is SecretReferenceBinding => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<SecretReferenceBinding>;
  return typeof candidate.referenceId === "string"
    && typeof candidate.secretId === "string"
    && typeof candidate.provider === "string"
    && typeof candidate.purpose === "string"
    && typeof candidate.integrationKey === "string"
    && typeof candidate.field === "string"
    && typeof candidate.createdAt === "string"
    && typeof candidate.updatedAt === "string"
    && !!candidate.metadata
    && typeof candidate.metadata === "object"
    && !Array.isArray(candidate.metadata);
};
