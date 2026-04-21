import type { IntegrationAuthConfig } from "../types/integration-config.types.js";
import type {
  BrandApprovalPolicy,
  BrandContentRules,
  BrandIntegrationProfileReference,
  BrandOutputPathPolicy,
  BrandPublishPolicy,
  BrandRepoBinding,
  BrandVoiceProfile,
} from "../types/brand.types.js";
import type { TaskCategoryId } from "../types/task-category.types.js";

export interface BrandManifest {
  manifestVersion: string;
  brandId: string;
  displayName: string;
  defaultBrand: boolean;
  clientId: string;
  description: string;
  voice: BrandVoiceProfile;
  contentRules: BrandContentRules;
  repoBindings: BrandRepoBinding[];
  outputPaths: BrandOutputPathPolicy;
  approvalPolicy: BrandApprovalPolicy;
  publishPolicy: BrandPublishPolicy;
  integrationProfiles: BrandIntegrationProfileReference[];
  defaultTaskCategories: TaskCategoryId[];
  secretPolicy: {
    provider: string;
    auth: IntegrationAuthConfig;
    notes: string[];
  };
  metadata: Record<string, unknown>;
}
