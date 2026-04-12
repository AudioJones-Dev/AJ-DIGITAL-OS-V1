import type { ModelGenerationInput, ModelGenerationResult, ModelProvider } from "./model-provider.js";

export class OpenAIProvider implements ModelProvider {
  readonly name = "openai";

  constructor(private readonly apiKey: string) {
    void this.apiKey;
  }

  async generate(_input: ModelGenerationInput): Promise<ModelGenerationResult> {
    throw new Error("OpenAI provider is not implemented yet.");
  }
}
