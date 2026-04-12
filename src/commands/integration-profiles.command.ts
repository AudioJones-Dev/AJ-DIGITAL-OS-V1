import { ApiIntegrationRegistry } from "../integrations/api-integration-registry.js";
import type { ApiIntegrationProfileRecord } from "../integrations/api-integration-profile.types.js";
import type { ProviderProfileRecord } from "../integrations/provider-profile-types.js";

export interface IntegrationProfilesCommandInput {
  brandId?: string;
  json?: boolean;
}

export interface IntegrationProfilesCommandResult {
  ok: boolean;
  command: "integration-profiles";
  rendered: boolean;
  providerProfiles: ProviderProfileRecord[];
  integrationProfiles: ApiIntegrationProfileRecord[];
  warnings: string[];
  errors: string[];
}

export class IntegrationProfilesCommand {
  constructor(private readonly registry = new ApiIntegrationRegistry()) {}

  async run(input: IntegrationProfilesCommandInput = {}): Promise<IntegrationProfilesCommandResult> {
    const [providerProfiles, integrationProfiles] = await Promise.all([
      this.registry.listProviderProfiles(),
      this.registry.listIntegrationProfiles(),
    ]);
    const filteredProviders = filterByBrand(providerProfiles, input.brandId);
    const filteredIntegrations = filterByBrand(integrationProfiles, input.brandId);

    if (input.json === true) {
      console.log(JSON.stringify({
        ok: true,
        providerProfiles: filteredProviders,
        integrationProfiles: filteredIntegrations,
      }, null, 2));
    } else {
      this.renderHuman(filteredProviders, filteredIntegrations);
    }

    return {
      ok: true,
      command: "integration-profiles",
      rendered: true,
      providerProfiles: filteredProviders,
      integrationProfiles: filteredIntegrations,
      warnings: [],
      errors: [],
    };
  }

  private renderHuman(
    providerProfiles: ProviderProfileRecord[],
    integrationProfiles: ApiIntegrationProfileRecord[],
  ): void {
    console.log("AJ DIGITAL OS INTEGRATION PROFILES");
    console.log("==================================");
    console.log(`Provider Profiles: ${providerProfiles.length}`);
    console.log(`Integration Profiles: ${integrationProfiles.length}`);
    console.log("");
    console.log("Integration Profiles");

    if (integrationProfiles.length === 0) {
      console.log("- None");
      return;
    }

    for (const profile of integrationProfiles) {
      console.log(`- ${profile.displayName} | enabled=${profile.enabled} | provider=${profile.providerProfileId}`);
      console.log(`  Brands: ${profile.brandIds.join(", ") || "-"} | Capabilities: ${profile.capabilities.join(", ") || "-"}`);
    }
  }
}

const filterByBrand = <T extends { brandIds: string[] }>(entries: T[], brandId: string | undefined): T[] => {
  if (!brandId?.trim()) {
    return entries;
  }

  const normalized = brandId.trim();
  return entries.filter((entry) => entry.brandIds.includes(normalized));
};
