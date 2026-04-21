import type { ModelGenerationInput, ModelGenerationResult, ModelProvider } from "./model-provider.js";

export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";

  constructor(private readonly apiKey: string) {
    void this.apiKey;
  }

  async generate(_input: ModelGenerationInput): Promise<ModelGenerationResult> {
    throw new Error("Anthropic provider is not implemented yet.");
  }
}
