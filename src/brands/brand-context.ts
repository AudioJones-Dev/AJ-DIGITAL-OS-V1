import path from "node:path";

import type { BrandManifest } from "./brand-manifest-types.js";

export interface BrandContext {
  brandId: string;
  clientId: string;
  manifest: BrandManifest;
  manifestPath?: string | undefined;
  outputDirectories: {
    brandRoot: string;
    drafts: string;
    pending: string;
    approved: string;
    published: string;
  };
  repoBindings: BrandManifest["repoBindings"];
  approvalPolicy: BrandManifest["approvalPolicy"];
  publishPolicy: BrandManifest["publishPolicy"];
  integrationProfiles: BrandManifest["integrationProfiles"];
}

export const createBrandContext = (
  manifest: BrandManifest,
  manifestPath?: string,
): BrandContext => {
  const brandSegment = sanitizeBrandId(manifest.brandId);
  const resolvedBrandRoot = resolveOutputPath(manifest.outputPaths.brandRoot, brandSegment);

  return {
    brandId: manifest.brandId,
    clientId: manifest.clientId,
    manifest,
    ...(manifestPath ? { manifestPath } : {}),
    outputDirectories: {
      brandRoot: resolvedBrandRoot,
      drafts: resolveOutputPath(manifest.outputPaths.drafts, brandSegment),
      pending: resolveOutputPath(manifest.outputPaths.pending ?? path.join(manifest.outputPaths.brandRoot, "pending"), brandSegment),
      approved: resolveOutputPath(manifest.outputPaths.approved, brandSegment),
      published: resolveOutputPath(manifest.outputPaths.published, brandSegment),
    },
    repoBindings: manifest.repoBindings,
    approvalPolicy: manifest.approvalPolicy,
    publishPolicy: manifest.publishPolicy,
    integrationProfiles: manifest.integrationProfiles,
  };
};

export const sanitizeBrandId = (brandId: string): string => brandId.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();

const resolveOutputPath = (candidate: string, brandSegment: string): string => {
  const normalized = candidate.trim();
  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(normalized.replace(/\{brandId\}/g, brandSegment));
};
