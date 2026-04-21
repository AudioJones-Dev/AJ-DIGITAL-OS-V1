import { config } from "../core/config.js";
import { OllamaProvider } from "./ollama.provider.js";
import { ProviderRegistry } from "./provider-registry.js";

const IMPLEMENTED_PROVIDER_NAMES = ["ollama"] as const;

export const createProviderRegistry = (): ProviderRegistry => {
  const registry = new ProviderRegistry();
  registry.register(new OllamaProvider(config.ollamaBaseUrl));
  return registry;
};

export const getImplementedProviderNames = (): string[] => {
  return [...IMPLEMENTED_PROVIDER_NAMES];
};

export * from "./anthropic.provider.js";
export * from "./lmstudio.provider.js";
export * from "./model-provider.js";
export * from "./ollama.provider.js";
export * from "./openai.provider.js";
export * from "./provider-registry.js";
