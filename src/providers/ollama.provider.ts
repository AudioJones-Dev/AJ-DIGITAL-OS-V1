import axios from "axios";

import type { ModelGenerationInput, ModelGenerationResult, ModelProvider } from "./model-provider.js";

interface OllamaChatMessage {
  role?: string;
  content?: string;
}

interface OllamaChatResponse {
  model?: string;
  message?: OllamaChatMessage;
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaGenerateResponse {
  model?: string;
  response?: string;
  message?: OllamaChatMessage;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
}

/**
 * Ollama-backed text generation provider using the local chat endpoint with
 * safe fallback model resolution for internal staging.
 */
export class OllamaProvider implements ModelProvider {
  readonly name = "ollama";
  private static readonly REQUEST_TIMEOUT_MS = readTimeoutFromEnv("OLLAMA_REQUEST_TIMEOUT_MS", 300_000);
  private static readonly TAGS_TIMEOUT_MS = readTimeoutFromEnv("OLLAMA_TAGS_TIMEOUT_MS", 15_000);

  constructor(private readonly baseUrl: string) {}

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get<OllamaTagsResponse>(
        `${this.baseUrl}/api/tags`,
        {
          timeout: OllamaProvider.TAGS_TIMEOUT_MS,
        },
      );

      const models = response.data?.models;
      if (!Array.isArray(models)) {
        return [];
      }

      return Array.from(new Set(
        models
          .flatMap((entry) => [
            typeof entry.name === "string" ? entry.name.trim() : "",
            typeof entry.model === "string" ? entry.model.trim() : "",
          ])
          .filter((value) => value.length > 0),
      )).sort((left, right) => left.localeCompare(right));
    } catch (error) {
      throw new Error(this.normalizeError(error));
    }
  }

  async generate(input: ModelGenerationInput): Promise<ModelGenerationResult> {
    const options: Record<string, unknown> = {};
    const promptPayload = buildPromptPayload(input);

    if (input.temperature !== undefined) {
      options.temperature = input.temperature;
    }

    if (input.maxTokens !== undefined) {
      options.num_predict = input.maxTokens;
    }

    const availableModels = await this.loadAvailableModels();
    const resolvedModel = this.resolveModelName(input.model, availableModels);

    try {
      const response = await axios.post<OllamaChatResponse>(
        `${this.baseUrl}/api/chat`,
        {
          model: resolvedModel,
          messages: buildMessages(promptPayload.system, promptPayload.user),
          stream: false,
          ...(promptPayload.useJsonFormat ? { format: "json" } : {}),
          ...(Object.keys(options).length > 0 ? { options } : {}),
        },
        {
          timeout: OllamaProvider.REQUEST_TIMEOUT_MS,
        },
      );

      return this.normalizeChatResponse(response.data, input, resolvedModel);
    } catch (error) {
      if (shouldRetryWithGenerate(error)) {
        return this.generateWithLegacyEndpoint(promptPayload, input, resolvedModel, options);
      }

      throw new Error(this.normalizeError(error, {
        requestedModel: input.model,
        resolvedModel,
        availableModels,
      }));
    }
  }

  private async loadAvailableModels(): Promise<string[]> {
    try {
      return await this.getAvailableModels();
    } catch {
      return [];
    }
  }

  private resolveModelName(requestedModel: string, availableModels: string[]): string {
    const overrideModel = normalizeModelName(process.env.OLLAMA_MODEL);
    if (overrideModel) {
      return overrideModel;
    }

    const normalizedRequestedModel = normalizeModelName(requestedModel);
    if (!normalizedRequestedModel || availableModels.length === 0) {
      return requestedModel;
    }

    const exactMatch = availableModels.find((candidate) => normalizeModelName(candidate) === normalizedRequestedModel);
    if (exactMatch) {
      return exactMatch;
    }

    const prefixMatch = availableModels.find((candidate) => {
      const normalizedCandidate = normalizeModelName(candidate);
      return normalizedCandidate !== undefined
        && normalizedCandidate.startsWith(normalizedRequestedModel);
    });
    if (prefixMatch) {
      return prefixMatch;
    }

    const containsMatch = availableModels.find((candidate) => {
      const normalizedCandidate = normalizeModelName(candidate);
      return normalizedCandidate !== undefined
        && normalizedCandidate.includes(normalizedRequestedModel);
    });
    if (containsMatch) {
      return containsMatch;
    }

    return availableModels[0] ?? requestedModel;
  }

  private async generateWithLegacyEndpoint(
    promptPayload: {
      system: string;
      user: string;
      useJsonFormat: boolean;
    },
    input: ModelGenerationInput,
    resolvedModel: string,
    options: Record<string, unknown>,
  ): Promise<ModelGenerationResult> {
    try {
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.baseUrl}/api/generate`,
        {
          model: resolvedModel,
          system: promptPayload.system,
          prompt: promptPayload.user,
          stream: false,
          ...(promptPayload.useJsonFormat ? { format: "json" } : {}),
          ...(Object.keys(options).length > 0 ? { options } : {}),
        },
        {
          timeout: OllamaProvider.REQUEST_TIMEOUT_MS,
        },
      );

      return this.normalizeGenerateResponse(response.data, input, resolvedModel);
    } catch (error) {
      if (promptPayload.useJsonFormat && shouldRetryWithoutJsonFormat(error)) {
        return this.generateWithLegacyEndpointWithoutJsonFormat(promptPayload, input, resolvedModel, options);
      }

      throw new Error(this.normalizeError(error, {
        requestedModel: input.model,
        resolvedModel,
      }));
    }
  }

  private async generateWithLegacyEndpointWithoutJsonFormat(
    promptPayload: {
      system: string;
      user: string;
    },
    input: ModelGenerationInput,
    resolvedModel: string,
    options: Record<string, unknown>,
  ): Promise<ModelGenerationResult> {
    try {
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.baseUrl}/api/generate`,
        {
          model: resolvedModel,
          system: promptPayload.system,
          prompt: promptPayload.user,
          stream: false,
          ...(Object.keys(options).length > 0 ? { options } : {}),
        },
        {
          timeout: OllamaProvider.REQUEST_TIMEOUT_MS,
        },
      );

      return this.normalizeGenerateResponse(response.data, input, resolvedModel);
    } catch (error) {
      throw new Error(this.normalizeError(error, {
        requestedModel: input.model,
        resolvedModel,
      }));
    }
  }

  private normalizeChatResponse(
    responseData: OllamaChatResponse | undefined,
    input: ModelGenerationInput,
    resolvedModel: string,
  ): ModelGenerationResult {
    if (!responseData || typeof responseData !== "object" || Array.isArray(responseData)) {
      throw new Error("Ollama returned an invalid chat response shape.");
    }

    const content = responseData.message?.content?.trim() || responseData.response?.trim();
    if (!content) {
      throw new Error("Ollama returned an empty chat response payload.");
    }

    return {
      provider: this.name,
      model: normalizeModelName(responseData.model) ? (responseData.model as string) : resolvedModel,
      content,
      usage: buildUsage(responseData.prompt_eval_count, responseData.eval_count),
      raw: {
        transport: "chat",
        requestedModel: input.model,
        resolvedModel,
        response: responseData,
      },
    };
  }

  private normalizeGenerateResponse(
    responseData: OllamaGenerateResponse | undefined,
    input: ModelGenerationInput,
    resolvedModel: string,
  ): ModelGenerationResult {
    if (!responseData || typeof responseData !== "object" || Array.isArray(responseData)) {
      throw new Error("Ollama returned an invalid generate response shape.");
    }

    const content = responseData.response?.trim() || responseData.message?.content?.trim();
    if (!content) {
      throw new Error("Ollama returned an empty generate response payload.");
    }

    return {
      provider: this.name,
      model: normalizeModelName(responseData.model) ? (responseData.model as string) : resolvedModel,
      content,
      usage: buildUsage(responseData.prompt_eval_count, responseData.eval_count),
      raw: {
        transport: "generate",
        requestedModel: input.model,
        resolvedModel,
        response: responseData,
      },
    };
  }

  private normalizeError(
    error: unknown,
    context?: {
      requestedModel?: string;
      resolvedModel?: string;
      availableModels?: string[];
    },
  ): string {
    const axiosLikeError = toAxiosLikeError(error);

    if (axios.isAxiosError(error) || axiosLikeError) {
      const errorCode = axiosLikeError?.code;
      const response = axiosLikeError?.response;
      const request = axiosLikeError?.request;
      const responseError = extractResponseError(response?.data);

      if (errorCode === "ECONNABORTED") {
        return "Ollama request timed out before a response was received.";
      }

      if (responseError) {
        if (isModelMissingError(responseError) && context?.availableModels && context.availableModels.length > 0) {
          const available = context.availableModels.join(", ");
          const requested = context.requestedModel ?? context.resolvedModel ?? "unknown";
          return `Ollama model "${requested}" is not available locally. Available models: ${available}.`;
        }

        return `Ollama request failed: ${responseError}`;
      }

      if (response) {
        const status = response.status;
        const statusText = normalizeText(response.statusText);
        return statusText
          ? `Ollama request failed with HTTP ${status} ${statusText}.`
          : `Ollama request failed with HTTP ${status}.`;
      }

      if (isConnectionFailure(errorCode)) {
        return "Unable to reach Ollama. Connection was refused or the network was unreachable.";
      }

      if (request) {
        return "Ollama request failed before a valid response was received.";
      }
    }

    const message = error instanceof Error ? normalizeText(error.message) : undefined;
    return message || "Unknown provider error.";
  }
}

const buildMessages = (system: string, user: string): Array<{ role: "system" | "user"; content: string }> => {
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
};

const buildPromptPayload = (
  input: ModelGenerationInput,
): {
  system: string;
  user: string;
  useJsonFormat: boolean;
} => {
  if (input.responseFormat !== "json") {
    return {
      system: input.system,
      user: input.user,
      useJsonFormat: false,
    };
  }

  const jsonInstruction = [
    "Return one valid JSON object only.",
    "Do not include markdown fences, commentary, or any text before or after the JSON object.",
  ].join(" ");

  return {
    system: [input.system, jsonInstruction].join("\n\n"),
    user: [input.user, jsonInstruction].join("\n\n"),
    useJsonFormat: true,
  };
};

const buildUsage = (
  promptEvalCount: number | undefined,
  evalCount: number | undefined,
): { inputTokens?: number; outputTokens?: number; totalTokens?: number } => {
  const tokenCounts = [promptEvalCount, evalCount].filter((value): value is number => typeof value === "number");

  return {
    ...(typeof promptEvalCount === "number" ? { inputTokens: promptEvalCount } : {}),
    ...(typeof evalCount === "number" ? { outputTokens: evalCount } : {}),
    ...(tokenCounts.length > 0
      ? { totalTokens: tokenCounts.reduce((sum, value) => sum + value, 0) }
      : {}),
  };
};

const shouldRetryWithGenerate = (error: unknown): boolean => {
  const axiosLikeError = toAxiosLikeError(error);
  const responseError = extractResponseError(axiosLikeError?.response?.data);
  const message = error instanceof Error ? normalizeText(error.message)?.toLowerCase() : undefined;

  if (message && (
    message.includes("invalid chat response shape")
    || message.includes("empty chat response payload")
  )) {
    return true;
  }

  if (!responseError) {
    return false;
  }

  const normalized = responseError.toLowerCase();
  return normalized.includes("endpoint not found")
    || normalized.includes("404 page not found")
    || normalized.includes("invalid messages")
    || normalized.includes("messages must")
    || normalized.includes("unsupported message role")
    || normalized.includes("system prompt")
    || normalized.includes("unexpected end of json input");
};

const shouldRetryWithoutJsonFormat = (error: unknown): boolean => {
  const axiosLikeError = toAxiosLikeError(error);
  const responseError = extractResponseError(axiosLikeError?.response?.data)?.toLowerCase();
  const message = error instanceof Error ? normalizeText(error.message)?.toLowerCase() : undefined;
  const candidate = responseError ?? message;

  if (!candidate) {
    return false;
  }

  return candidate.includes("invalid format")
    || candidate.includes("format is not supported")
    || candidate.includes("json schema")
    || candidate.includes("json mode")
    || candidate.includes("unsupported format");
};

const isModelMissingError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes("model")
    && (
      normalized.includes("not found")
      || normalized.includes("not available")
      || normalized.includes("try pulling it first")
    );
};

const isConnectionFailure = (code: string | undefined): boolean => {
  switch (code) {
    case "ECONNREFUSED":
    case "ENETUNREACH":
    case "EHOSTUNREACH":
    case "ENOTFOUND":
      return true;
    default:
      return false;
  }
};

const normalizeText = (value: string | undefined): string | undefined => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized && normalized !== "Error" ? normalized : undefined;
};

const normalizeModelName = (value: string | undefined): string | undefined => {
  return normalizeText(value)?.toLowerCase();
};

const extractResponseError = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const candidate = data as { error?: unknown };
  return typeof candidate.error === "string" ? normalizeText(candidate.error) : undefined;
};

const toAxiosLikeError = (error: unknown): {
  code?: string;
  response?: { status: number; statusText?: string; data?: unknown };
  request?: unknown;
} | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
    response?: unknown;
    request?: unknown;
  };

  const code = typeof candidate.code === "string" ? candidate.code : undefined;
  const response = isAxiosLikeResponse(candidate.response)
    ? candidate.response
    : undefined;
  const request = candidate.request;

  if (!code && !response && request === undefined) {
    return undefined;
  }

  return {
    ...(code ? { code } : {}),
    ...(response ? { response } : {}),
    ...(request !== undefined ? { request } : {}),
  };
};

const isAxiosLikeResponse = (
  value: unknown,
): value is { status: number; statusText?: string; data?: unknown } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { status?: unknown; statusText?: unknown; data?: unknown };
  return typeof candidate.status === "number"
    && (candidate.statusText === undefined || typeof candidate.statusText === "string");
};

function readTimeoutFromEnv(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
