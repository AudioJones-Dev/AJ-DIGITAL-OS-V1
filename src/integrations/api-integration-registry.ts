import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { ApiIntegrationProfileSchema } from "../schemas/api-integration-profile.schema.js";
import { ModelProfileSchema } from "../schemas/model-profile.schema.js";
import { ProviderProfileSchema } from "../schemas/provider-profile.schema.js";
import type { ApiIntegrationProfileRecord } from "./api-integration-profile.types.js";
import type { ModelProfileRecord } from "./model-profile-types.js";
import type { ProviderProfileRecord } from "./provider-profile-types.js";

export interface ApiIntegrationRegistrySnapshot {
  providerProfiles: ProviderProfileRecord[];
  integrationProfiles: ApiIntegrationProfileRecord[];
  modelProfiles: ModelProfileRecord[];
}

export class ApiIntegrationRegistry {
  private readonly profilesDirectory: string;
  private readonly modelProfilesDirectory: string;

  constructor(
    profilesDirectory = path.resolve("data", "integrations", "profiles"),
    modelProfilesDirectory = path.resolve("data", "model-profiles"),
  ) {
    this.profilesDirectory = profilesDirectory;
    this.modelProfilesDirectory = modelProfilesDirectory;
  }

  async listProviderProfiles(): Promise<ProviderProfileRecord[]> {
    const files = await this.loadProfileFiles(this.profilesDirectory);
    return files
      .map((entry) => ProviderProfileSchema.safeParse(entry))
      .filter((entry) => entry.success)
      .map((entry) => entry.data)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  async listIntegrationProfiles(): Promise<ApiIntegrationProfileRecord[]> {
    const files = await this.loadProfileFiles(this.profilesDirectory);
    return files
      .map((entry) => ApiIntegrationProfileSchema.safeParse(entry))
      .filter((entry) => entry.success)
      .map((entry) => entry.data)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  async listModelProfiles(): Promise<ModelProfileRecord[]> {
    const files = await this.loadProfileFiles(this.modelProfilesDirectory);
    return files
      .map((entry) => ModelProfileSchema.safeParse(entry))
      .filter((entry) => entry.success)
      .map((entry) => entry.data)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  async snapshot(): Promise<ApiIntegrationRegistrySnapshot> {
    const [providerProfiles, integrationProfiles, modelProfiles] = await Promise.all([
      this.listProviderProfiles(),
      this.listIntegrationProfiles(),
      this.listModelProfiles(),
    ]);

    return {
      providerProfiles,
      integrationProfiles,
      modelProfiles,
    };
  }

  private async loadProfileFiles(directory: string): Promise<unknown[]> {
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    return Promise.all(
      files.map(async (fileName) => {
        const raw = await readFile(path.join(directory, fileName), "utf-8");
        return JSON.parse(raw) as unknown;
      }),
    );
  }
}
