import path from "node:path";

const normalizeUrl = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  const resolved = trimmed && trimmed.length > 0 ? trimmed : fallback;
  return resolved.replace(/\/+$/, "");
};

const normalizeSecret = (value: string | undefined): string => value?.trim() ?? "";

const normalizeBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return fallback;
  }
};

const normalizeProviderList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  const providers = value
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider) => provider.length > 0);

  return providers.length > 0 ? Array.from(new Set(providers)) : fallback;
};

export type RuntimeEnvironment = "development" | "production";
export type ProviderName = "ollama" | "openai" | "anthropic" | "lmstudio";

export interface RuntimeConfig {
  environment: RuntimeEnvironment;
  activeProvider: ProviderName;
  enabledProviders: ProviderName[];
  memoryEnabled: boolean;
  ollamaBaseUrl: string;
  lmstudioBaseUrl: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  perplexityApiKey: string;
  nanoBananaApiKey: string;
  sanityApiToken: string;
  sanityProjectId: string;
  sanityDataset: string;
  telegramBotToken: string;
  telegramChatId: string;
  n8nMcpToken: string;
  n8nBaseUrl: string;
  n8nWebhookUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  neonDatabaseUrl: string;
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;
  runtimeDirectories: string[];
  memoryDirectory: string;
  explicitEnv: {
    ollamaBaseUrl: boolean;
    lmstudioBaseUrl: boolean;
    anthropicApiKey: boolean;
    openaiApiKey: boolean;
    perplexityApiKey: boolean;
    nanoBananaApiKey: boolean;
    sanityApiToken: boolean;
    telegramBotToken: boolean;
    n8nMcpToken: boolean;
    supabaseUrl: boolean;
    supabaseAnonKey: boolean;
    neonDatabaseUrl: boolean;
    r2Endpoint: boolean;
  };
}

const normalizeEnvironment = (value: string | undefined): RuntimeEnvironment => {
  return value?.trim().toLowerCase() === "production" ? "production" : "development";
};

const normalizeProviderName = (value: string | undefined, fallback: ProviderName): ProviderName => {
  switch (value?.trim().toLowerCase()) {
    case "anthropic":
    case "openai":
    case "lmstudio":
    case "ollama":
      return value.trim().toLowerCase() as ProviderName;
    default:
      return fallback;
  }
};

const hasExplicitValue = (value: string | undefined): boolean => {
  return typeof value === "string" && value.trim().length > 0;
};

const isProviderName = (value: string): value is ProviderName => {
  switch (value) {
    case "ollama":
    case "openai":
    case "anthropic":
    case "lmstudio":
      return true;
    default:
      return false;
  }
};

export const createRuntimeConfig = (): RuntimeConfig => {
  const environment = normalizeEnvironment(process.env.AJ_OS_ENV);
  const activeProvider = normalizeProviderName(process.env.ACTIVE_MODEL_PROVIDER, "ollama");
  const enabledProviders = normalizeProviderList(
    process.env.ENABLED_MODEL_PROVIDERS,
    [activeProvider],
  ).filter(isProviderName);

  const normalizedEnabledProviders = enabledProviders.includes(activeProvider)
    ? enabledProviders
    : [activeProvider, ...enabledProviders];

  return {
    environment,
    activeProvider,
    enabledProviders: normalizedEnabledProviders,
    memoryEnabled: normalizeBoolean(process.env.MEMORY_ENABLED, true),
    ollamaBaseUrl: normalizeUrl(process.env.OLLAMA_BASE_URL, "http://localhost:11434"),
    lmstudioBaseUrl: normalizeUrl(process.env.LMSTUDIO_BASE_URL, "http://localhost:1234/v1"),
    anthropicApiKey: normalizeSecret(process.env.ANTHROPIC_API_KEY),
    openaiApiKey: normalizeSecret(process.env.OPENAI_API_KEY),
    perplexityApiKey: normalizeSecret(process.env.PERPLEXITY_API_KEY),
    nanoBananaApiKey: normalizeSecret(process.env.NANO_BANANA_API_KEY),
    sanityApiToken: normalizeSecret(process.env.SANITY_API_TOKEN),
    sanityProjectId: normalizeSecret(process.env.SANITY_PROJECT_ID),
    sanityDataset: process.env.SANITY_DATASET?.trim() || "production",
    telegramBotToken: normalizeSecret(process.env.TELEGRAM_BOT_TOKEN),
    telegramChatId: normalizeSecret(process.env.TELEGRAM_CHAT_ID),
    n8nMcpToken: normalizeSecret(process.env.N8N_MCP_TOKEN),
    n8nBaseUrl: normalizeUrl(process.env.N8N_BASE_URL, ""),
    n8nWebhookUrl: normalizeUrl(process.env.N8N_WEBHOOK_URL, ""),
    supabaseUrl: normalizeUrl(process.env.SUPABASE_URL, ""),
    supabaseAnonKey: normalizeSecret(process.env.SUPABASE_ANON_KEY),
    neonDatabaseUrl: normalizeSecret(process.env.NEON_DATABASE_URL),
    r2Endpoint: normalizeUrl(process.env.R2_ENDPOINT, ""),
    r2AccessKeyId: normalizeSecret(process.env.R2_ACCESS_KEY_ID),
    r2SecretAccessKey: normalizeSecret(process.env.R2_SECRET_ACCESS_KEY),
    r2BucketName: process.env.R2_BUCKET_NAME?.trim() || "",
    runtimeDirectories: [
      path.resolve("data", "runs"),
      path.resolve("data", "reports", "runs"),
      path.resolve("data", "logs"),
      path.resolve("data", "cache"),
      path.resolve("data", "approvals"),
      path.resolve("data", "approved"),
      path.resolve("data", "assistant"),
      path.resolve("data", "conversations", "threads"),
      path.resolve("data", "conversations", "turns"),
      path.resolve("data", "conversations", "context-cache"),
      path.resolve("data", "brands", "manifests"),
      path.resolve("data", "deliverables", "registry"),
      path.resolve("data", "outputs"),
      path.resolve("data", "memory", "chunks"),
      path.resolve("data", "memory", "embeddings"),
      path.resolve("data", "memory", "index"),
      path.resolve("data", "tools"),
      path.resolve("data", "integrations"),
      path.resolve("data", "integrations", "profiles"),
      path.resolve("data", "model-profiles"),
      path.resolve("data", "secrets"),
    ],
    memoryDirectory: path.resolve("memory"),
    explicitEnv: {
      ollamaBaseUrl: hasExplicitValue(process.env.OLLAMA_BASE_URL),
      lmstudioBaseUrl: hasExplicitValue(process.env.LMSTUDIO_BASE_URL),
      anthropicApiKey: hasExplicitValue(process.env.ANTHROPIC_API_KEY),
      openaiApiKey: hasExplicitValue(process.env.OPENAI_API_KEY),
      perplexityApiKey: hasExplicitValue(process.env.PERPLEXITY_API_KEY),
      nanoBananaApiKey: hasExplicitValue(process.env.NANO_BANANA_API_KEY),
      sanityApiToken: hasExplicitValue(process.env.SANITY_API_TOKEN),
      telegramBotToken: hasExplicitValue(process.env.TELEGRAM_BOT_TOKEN),
      n8nMcpToken: hasExplicitValue(process.env.N8N_MCP_TOKEN),
      supabaseUrl: hasExplicitValue(process.env.SUPABASE_URL),
      supabaseAnonKey: hasExplicitValue(process.env.SUPABASE_ANON_KEY),
      neonDatabaseUrl: hasExplicitValue(process.env.NEON_DATABASE_URL),
      r2Endpoint: hasExplicitValue(process.env.R2_ENDPOINT),
    },
  };
};

export const config: RuntimeConfig = createRuntimeConfig();

export const isProductionEnvironment = (runtimeConfig: RuntimeConfig = config): boolean => {
  return runtimeConfig.environment === "production";
};
