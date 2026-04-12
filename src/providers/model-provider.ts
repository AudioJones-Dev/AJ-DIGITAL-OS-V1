export interface ModelGenerationInput {
  model: string;
  system: string;
  user: string;
  responseFormat?: "json";
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelGenerationResult {
  provider: string;
  model: string;
  content: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

export interface ModelProvider {
  readonly name: string;
  generate(input: ModelGenerationInput): Promise<ModelGenerationResult>;
  getAvailableModels?(): Promise<string[]>;
}
