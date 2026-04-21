import type { ModelGenerationInput, ModelGenerationResult, ModelProvider } from "./model-provider.js";

export class LMStudioProvider implements ModelProvider {
  readonly name = "lmstudio";

  constructor(private readonly baseUrl: string) {
    void this.baseUrl;
  }

  async generate(_input: ModelGenerationInput): Promise<ModelGenerationResult> {
    throw new Error("LM Studio provider is not implemented yet.");
  }
}
