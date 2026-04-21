import { ApiIntegrationRegistry } from "../integrations/api-integration-registry.js";
import type { ModelProfileRecord } from "../integrations/model-profile-types.js";

export interface ModelProfilesCommandInput {
  brandId?: string;
  json?: boolean;
}

export interface ModelProfilesCommandResult {
  ok: boolean;
  command: "model-profiles";
  rendered: boolean;
  profiles: ModelProfileRecord[];
  warnings: string[];
  errors: string[];
}

export class ModelProfilesCommand {
  constructor(private readonly registry = new ApiIntegrationRegistry()) {}

  async run(input: ModelProfilesCommandInput = {}): Promise<ModelProfilesCommandResult> {
    const profiles = await this.registry.listModelProfiles();
    const filteredProfiles = filterByBrand(profiles, input.brandId);

    if (input.json === true) {
      console.log(JSON.stringify({ ok: true, profiles: filteredProfiles }, null, 2));
    } else {
      this.renderHuman(filteredProfiles);
    }

    return {
      ok: true,
      command: "model-profiles",
      rendered: true,
      profiles: filteredProfiles,
      warnings: [],
      errors: [],
    };
  }

  private renderHuman(profiles: ModelProfileRecord[]): void {
    console.log("AJ DIGITAL OS MODEL PROFILES");
    console.log("============================");
    console.log(`Profiles: ${profiles.length}`);
    console.log("");
    console.log("Model Profiles");

    if (profiles.length === 0) {
      console.log("- None");
      return;
    }

    for (const profile of profiles) {
      console.log(`- ${profile.displayName} | provider=${profile.provider} | enabled=${profile.enabled}`);
      console.log(`  Base: ${profile.baseModel} | Fine Tune: ${profile.fineTuneReference ?? "-"}`);
      console.log(`  Brands: ${profile.brandIds.join(", ") || "-"} | Tasks: ${profile.taskUsageClasses.join(", ") || "-"}`);
    }
  }
}

const filterByBrand = (entries: ModelProfileRecord[], brandId: string | undefined): ModelProfileRecord[] => {
  if (!brandId?.trim()) {
    return entries;
  }

  const normalized = brandId.trim();
  return entries.filter((entry) => entry.brandIds.includes(normalized));
};
