import { mkdir } from "node:fs/promises";
import path from "node:path";

import { BrandRegistry } from "../../brands/brand-registry.js";
import type { BrandContext } from "../../brands/brand-context.js";

export interface ResolvedOutputPaths {
  brandId?: string;
  brandName?: string;
  clientId?: string;
  source: "brand" | "fallback";
  brandRoot: string;
  drafts: string;
  pending: string;
  approved: string;
  published: string;
}

export interface ResolveOutputPathsInput {
  brandId?: string;
  clientId?: string;
  brandContext?: BrandContext;
}

export class OutputPathResolver {
  constructor(private readonly brandRegistry = new BrandRegistry()) {}

  async resolve(input: ResolveOutputPathsInput = {}): Promise<ResolvedOutputPaths> {
    const directBrandContext = input.brandContext;
    const resolvedBrandContext = directBrandContext
      ?? await this.resolveBrandContext(input.brandId, input.clientId);

    if (resolvedBrandContext) {
      return {
        brandId: resolvedBrandContext.brandId,
        brandName: resolvedBrandContext.manifest.displayName,
        clientId: resolvedBrandContext.clientId,
        source: "brand",
        brandRoot: resolvedBrandContext.outputDirectories.brandRoot,
        drafts: resolvedBrandContext.outputDirectories.drafts,
        pending: resolvedBrandContext.outputDirectories.pending,
        approved: resolvedBrandContext.outputDirectories.approved,
        published: resolvedBrandContext.outputDirectories.published,
      };
    }

    const fallbackBrandSegment = sanitizePathSegment(input.brandId ?? input.clientId ?? "_default");
    const brandRoot = path.resolve("data", "outputs", fallbackBrandSegment);

    return {
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      source: "fallback",
      brandRoot,
      drafts: path.join(brandRoot, "drafts"),
      pending: path.join(brandRoot, "pending"),
      approved: path.join(brandRoot, "approved"),
      published: path.join(brandRoot, "published"),
    };
  }

  async ensureDirectories(paths: ResolvedOutputPaths): Promise<void> {
    await Promise.all([
      mkdir(paths.brandRoot, { recursive: true }),
      mkdir(paths.drafts, { recursive: true }),
      mkdir(paths.pending, { recursive: true }),
      mkdir(paths.approved, { recursive: true }),
      mkdir(paths.published, { recursive: true }),
    ]);
  }

  private async resolveBrandContext(
    brandId: string | undefined,
    clientId: string | undefined,
  ): Promise<BrandContext | undefined> {
    if (brandId?.trim()) {
      return this.brandRegistry.getBrandById(brandId.trim());
    }

    if (clientId?.trim()) {
      return this.brandRegistry.getBrandByClientId(clientId.trim());
    }

    return this.brandRegistry.getDefaultBrand();
  }
}

const sanitizePathSegment = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
