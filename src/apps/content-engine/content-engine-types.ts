/**
 * L12 Application Layer — Content Engine types.
 */

import type { GovernanceOutcome } from "../../governance/governance-types.js";
import type {
  AssetFormat,
  AssetType,
  NormalizedAsset,
} from "../../normalization/normalization-types.js";

export type ContentBriefType =
  | "blog_post"
  | "social_post"
  | "email"
  | "landing_page"
  | "case_study"
  | "whitepaper";

export interface ContentBriefInput {
  title: string;
  description: string;
  contentType: ContentBriefType;
  channel: string;
  format?: AssetFormat;
  tags?: string[];
  tenantId?: string;
  createdBy: string;
}

export interface ContentBriefResult {
  ok: boolean;
  briefId?: string;
  dagRunId?: string;
  asset?: NormalizedAsset;
  governanceStatus?: GovernanceOutcome;
  governanceWarnings?: string[];
  blockedReasons?: string[];
  error?: string;
}

export interface PublishResult {
  ok: boolean;
  asset?: NormalizedAsset;
  governanceStatus?: GovernanceOutcome | "skipped";
  governanceWarnings?: string[];
  blockedReasons?: string[];
  error?: string;
}

export function contentTypeToAssetType(type: ContentBriefType): AssetType {
  return type as AssetType;
}
