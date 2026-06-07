import { createNodeBeacon, type BeaconConfig, type NodeBeacon } from "@fallow-cli/beacon";

import { logger } from "../core/logger.js";

const DEFAULT_ENDPOINT = "https://api.fallow.cloud";
const DEFAULT_PROJECT_ID = "AudioJones-Dev/AJ-DIGITAL-OS-V1";
const DEFAULT_ENVIRONMENT = "local";
const DEFAULT_FLUSH_INTERVAL_MS = 60_000;
const COMMIT_SHA_MAX_LENGTH = 40;

export interface FallowBeaconRuntime {
  enabled: boolean;
  flush(): Promise<void>;
  stop(): Promise<void>;
}

type RuntimeMismatchLogDetail = {
  runtime: unknown;
  reason: unknown;
  attempted: unknown;
  message: unknown;
};

type BudgetLogSnapshot = {
  state?: unknown;
  remaining?: unknown;
  resetAt: unknown;
  sampleRate?: unknown;
  capReason?: unknown;
};

const noopBeacon: FallowBeaconRuntime = {
  enabled: false,
  async flush(): Promise<void> {
    return;
  },
  async stop(): Promise<void> {
    return;
  },
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function isEnabled(): boolean {
  return readEnv("FALLOW_BEACON_ENABLED")?.toLowerCase() === "true";
}

function resolveApiKey(): string | undefined {
  return readEnv("FALLOW_API_KEY") ?? readEnv("BEACON_API_KEY");
}

function resolveCommitSha(): string | undefined {
  const commitSha = readEnv("GIT_SHA") ?? readEnv("GITHUB_SHA") ?? readEnv("VERCEL_GIT_COMMIT_SHA");
  if (!commitSha) {
    return undefined;
  }

  if (commitSha.length > COMMIT_SHA_MAX_LENGTH) {
    logger.warn("[Fallow] commit SHA skipped because it exceeds the beacon limit", {
      length: commitSha.length,
      maxLength: COMMIT_SHA_MAX_LENGTH,
    });
    return undefined;
  }

  return commitSha;
}

const handleRuntimeMismatch = (detail: RuntimeMismatchLogDetail): void => {
  logger.warn("[Fallow] beacon runtime coverage unavailable", {
    runtime: detail.runtime,
    reason: detail.reason,
    attempted: detail.attempted,
    message: detail.message,
  });
};

const handleBudgetWarning = (snapshot: BudgetLogSnapshot): void => {
  logger.warn("[Fallow] ingest budget warning", {
    state: snapshot.state,
    remaining: snapshot.remaining,
    resetAt: snapshot.resetAt,
  });
};

const handleBudgetSampled = (snapshot: BudgetLogSnapshot): void => {
  logger.warn("[Fallow] ingest budget sampled mode active", {
    sampleRate: snapshot.sampleRate,
    resetAt: snapshot.resetAt,
  });
};

const handleBudgetExhausted = (snapshot: BudgetLogSnapshot): void => {
  logger.error("[Fallow] ingest budget exhausted", {
    resetAt: snapshot.resetAt,
    capReason: snapshot.capReason,
  });
};

function createConfig(apiKey: string): BeaconConfig {
  const environment = readEnv("FALLOW_ENVIRONMENT") ?? readEnv("AJ_OS_ENV") ?? DEFAULT_ENVIRONMENT;
  const commitSha = resolveCommitSha();
  const config: BeaconConfig = {
    apiKey,
    projectId: readEnv("FALLOW_PROJECT_ID") ?? DEFAULT_PROJECT_ID,
    endpoint: readEnv("FALLOW_ENDPOINT") ?? DEFAULT_ENDPOINT,
    environment,
    flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
    denyPaths: [/node_modules/],
    coverageSource: "v8",
    onRuntimeMismatch: handleRuntimeMismatch,
    onBudgetWarning: handleBudgetWarning,
    onBudgetSampled: handleBudgetSampled,
    onBudgetExhausted: handleBudgetExhausted,
  };

  if (commitSha) {
    config.commitSha = commitSha;
  }

  return config;
}

export function startFallowBeaconFromEnv(): FallowBeaconRuntime {
  if (!isEnabled()) {
    return noopBeacon;
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    logger.warn("[Fallow] beacon enabled but no FALLOW_API_KEY or BEACON_API_KEY is configured");
    return noopBeacon;
  }

  const nodeBeacon = createNodeBeacon(createConfig(apiKey));
  nodeBeacon.start();
  logger.info("[Fallow] runtime coverage beacon started", {
    projectId: readEnv("FALLOW_PROJECT_ID") ?? DEFAULT_PROJECT_ID,
    endpoint: readEnv("FALLOW_ENDPOINT") ?? DEFAULT_ENDPOINT,
    environment: readEnv("FALLOW_ENVIRONMENT") ?? readEnv("AJ_OS_ENV") ?? DEFAULT_ENVIRONMENT,
  });

  return wrapNodeBeacon(nodeBeacon);
}

function wrapNodeBeacon(nodeBeacon: NodeBeacon): FallowBeaconRuntime {
  return {
    enabled: true,
    async flush(): Promise<void> {
      await nodeBeacon.flush();
    },
    async stop(): Promise<void> {
      await nodeBeacon.stop();
    },
  };
}
