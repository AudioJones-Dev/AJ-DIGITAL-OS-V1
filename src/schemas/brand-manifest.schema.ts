import { z } from "zod";

export const BrandVoiceProfileSchema = z.object({
  brandName: z.string().min(1),
  audience: z.array(z.string()),
  tone: z.array(z.string()),
  positioning: z.string().min(1).optional(),
  styleNotes: z.array(z.string()),
  bannedPhrases: z.array(z.string()),
  preferredCtas: z.array(z.string()),
});

export const BrandContentRulesSchema = z.object({
  requiredDisclaimers: z.array(z.string()),
  forbiddenClaims: z.array(z.string()),
  formattingRules: z.array(z.string()),
  reviewChecklist: z.array(z.string()),
  platformNotes: z.record(z.string(), z.array(z.string())),
});

export const BrandRepoBindingSchema = z.object({
  repoId: z.string().min(1),
  localPath: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).optional(),
  contentRoot: z.string().min(1).optional(),
  assetRoot: z.string().min(1).optional(),
  publishTarget: z.string().min(1).optional(),
});

export const BrandOutputPathPolicySchema = z.object({
  brandRoot: z.string().min(1),
  drafts: z.string().min(1),
  pending: z.string().min(1).optional(),
  approved: z.string().min(1),
  published: z.string().min(1),
});

export const BrandApprovalPolicySchema = z.object({
  mode: z.enum(["always_required", "conditional", "draft_only"]),
  approverRoles: z.array(z.string()),
  approverChannels: z.array(z.string()),
  autoApproveTaskTypes: z.array(z.string()),
  escalationRoles: z.array(z.string()),
  notes: z.string().min(1).optional(),
});

export const BrandPublishPolicySchema = z.object({
  mode: z.enum(["manual_only", "approved_only", "auto_after_approval"]),
  allowedTargets: z.array(z.string().min(1)),
  defaultTarget: z.string().min(1),
  pathStrategy: z.enum(["brand_scoped", "repo_bound"]),
  notes: z.string().min(1).optional(),
});

export const SecretReferenceSchema = z.object({
  provider: z.string().min(1),
  secretId: z.string().min(1),
  purpose: z.enum([
    "api_token",
    "api_key",
    "oauth_client_id",
    "oauth_client_secret",
    "oauth_refresh_token",
    "bot_token",
    "signing_secret",
    "session_cookie",
    "local_encryption_key",
  ]),
  field: z.string().min(1),
  version: z.number().int().positive().optional(),
});

export const IntegrationAuthConfigSchema = z.object({
  strategy: z.enum(["none", "api_key", "oauth2", "bot_token", "session_token", "local_path"]),
  scopes: z.array(z.string()),
  secretRefs: z.array(SecretReferenceSchema),
});

export const BrandIntegrationProfileReferenceSchema = z.object({
  profileId: z.string().min(1),
  defaultChannelAdapterId: z.string().min(1).optional(),
  connectorIds: z.array(z.string().min(1)),
  settingsProfileId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()),
});

export const BrandManifestSchema = z.object({
  manifestVersion: z.string().min(1),
  brandId: z.string().min(1),
  displayName: z.string().min(1),
  defaultBrand: z.boolean(),
  clientId: z.string().min(1),
  description: z.string().min(1),
  voice: BrandVoiceProfileSchema,
  contentRules: BrandContentRulesSchema,
  repoBindings: z.array(BrandRepoBindingSchema),
  outputPaths: BrandOutputPathPolicySchema,
  approvalPolicy: BrandApprovalPolicySchema,
  publishPolicy: BrandPublishPolicySchema,
  integrationProfiles: z.array(BrandIntegrationProfileReferenceSchema),
  defaultTaskCategories: z.array(z.enum(["research", "lead-gen", "content", "ops", "client-work", "review"])),
  secretPolicy: z.object({
    provider: z.string().min(1),
    auth: IntegrationAuthConfigSchema,
    notes: z.array(z.string()),
  }),
  metadata: z.record(z.string(), z.unknown()),
});
