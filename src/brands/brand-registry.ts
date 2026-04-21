import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { BrandManifestSchema } from "../schemas/brand-manifest.schema.js";
import type { BrandManifest } from "./brand-manifest-types.js";
import { createBrandContext, type BrandContext } from "./brand-context.js";

export interface ResolveBrandInput {
  brandId?: string;
}

interface LoadedBrandManifest {
  manifest: BrandManifest;
  manifestPath: string;
}

export class BrandRegistry {
  private readonly manifestsDirectory: string;

  constructor(manifestsDirectory = path.resolve("data", "brands", "manifests")) {
    this.manifestsDirectory = manifestsDirectory;
  }

  async listManifests(): Promise<BrandManifest[]> {
    const loaded = await this.loadManifestRecords();
    return loaded.map((entry) => entry.manifest);
  }

  async getBrandById(brandId: string): Promise<BrandContext | undefined> {
    const manifests = await this.loadManifestRecords();
    const match = manifests.find((entry) => entry.manifest.brandId === brandId.trim());
    return match ? createBrandContext(match.manifest, match.manifestPath) : undefined;
  }

  async getBrandByClientId(clientId: string): Promise<BrandContext | undefined> {
    const manifests = await this.loadManifestRecords();
    const match = manifests.find((entry) => entry.manifest.clientId === clientId.trim());
    return match ? createBrandContext(match.manifest, match.manifestPath) : undefined;
  }

  async getDefaultBrand(): Promise<BrandContext | undefined> {
    const manifests = await this.loadManifestRecords();
    const explicitDefault = manifests.find((entry) => entry.manifest.defaultBrand === true);
    const firstManifest = explicitDefault ?? manifests[0];
    return firstManifest ? createBrandContext(firstManifest.manifest, firstManifest.manifestPath) : undefined;
  }

  async resolveBrand(input: ResolveBrandInput = {}): Promise<BrandContext | undefined> {
    if (input.brandId && input.brandId.trim().length > 0) {
      return this.getBrandById(input.brandId);
    }

    return this.getDefaultBrand();
  }

  private async loadManifestRecords(): Promise<LoadedBrandManifest[]> {
    await mkdir(this.manifestsDirectory, { recursive: true });
    const entries = await readdir(this.manifestsDirectory, { withFileTypes: true });
    const manifestFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    const manifests = await Promise.all(
      manifestFiles.map(async (fileName) => {
        const manifestPath = path.join(this.manifestsDirectory, fileName);
        const raw = await readFile(manifestPath, "utf-8");
        return {
          manifest: BrandManifestSchema.parse(JSON.parse(raw)) as BrandManifest,
          manifestPath,
        };
      }),
    );

    return manifests.sort((left, right) => left.manifest.displayName.localeCompare(right.manifest.displayName));
  }
}
