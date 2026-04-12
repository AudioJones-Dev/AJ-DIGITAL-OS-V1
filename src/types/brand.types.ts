export type BrandApprovalMode = "always_required" | "conditional" | "draft_only";
export type BrandPublishMode = "manual_only" | "approved_only" | "auto_after_approval";
export type BrandPublishPathStrategy = "brand_scoped" | "repo_bound";

export interface BrandVoiceProfile {
  brandName: string;
  audience: string[];
  tone: string[];
  positioning?: string | undefined;
  styleNotes: string[];
  bannedPhrases: string[];
  preferredCtas: string[];
}

export interface BrandContentRules {
  requiredDisclaimers: string[];
  forbiddenClaims: string[];
  formattingRules: string[];
  reviewChecklist: string[];
  platformNotes: Record<string, string[]>;
}

export interface BrandRepoBinding {
  repoId: string;
  localPath?: string | undefined;
  defaultBranch?: string | undefined;
  contentRoot?: string | undefined;
  assetRoot?: string | undefined;
  publishTarget?: string | undefined;
}

export interface BrandOutputPathPolicy {
  brandRoot: string;
  drafts: string;
  pending?: string | undefined;
  approved: string;
  published: string;
}

export interface BrandApprovalPolicy {
  mode: BrandApprovalMode;
  approverRoles: string[];
  approverChannels: string[];
  autoApproveTaskTypes: string[];
  escalationRoles: string[];
  notes?: string | undefined;
}

export interface BrandPublishPolicy {
  mode: BrandPublishMode;
  allowedTargets: string[];
  defaultTarget: string;
  pathStrategy: BrandPublishPathStrategy;
  notes?: string | undefined;
}

export interface BrandIntegrationProfileReference {
  profileId: string;
  defaultChannelAdapterId?: string | undefined;
  connectorIds: string[];
  settingsProfileId?: string | undefined;
  metadata: Record<string, unknown>;
}
