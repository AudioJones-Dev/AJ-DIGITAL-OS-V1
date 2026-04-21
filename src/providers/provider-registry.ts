import type { ModelProvider } from "./model-provider.js";

/**
 * In-memory registry for model providers.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): ModelProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(`Model provider "${name}" is not registered.`);
    }

    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys()).sort();
  }
}
