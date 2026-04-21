import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  config,
  createRuntimeConfig,
  isProductionEnvironment,
  type ProviderName,
  type RuntimeConfig,
} from "../../core/config.js";
import { getImplementedProviderNames } from "../../providers/index.js";

export type HealthcheckStatus = "pass" | "warn" | "fail";

export interface HealthcheckItem {
  id: string;
  status: HealthcheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface RuntimeHealthcheckResult {
  ok: boolean;
  environment: RuntimeConfig["environment"];
  activeProvider: ProviderName;
  enabledProviders: ProviderName[];
  memoryEnabled: boolean;
  checks: HealthcheckItem[];
  warnings: string[];
  errors: string[];
}

export class RuntimeHealthcheckService {
  constructor(private readonly runtimeConfig: RuntimeConfig = createRuntimeConfig()) {}

  async run(): Promise<RuntimeHealthcheckResult> {
    const checks: HealthcheckItem[] = [];

    checks.push(...this.checkImplementedProviders());
    checks.push(...this.checkProviderConfiguration());
    checks.push(...await this.checkRuntimeDirectories());
    checks.push(await this.checkMemoryDirectory());

    const warnings = checks.filter((check) => check.status === "warn").map((check) => check.message);
    const errors = checks.filter((check) => check.status === "fail").map((check) => check.message);

    return {
      ok: errors.length === 0,
      environment: this.runtimeConfig.environment,
      activeProvider: this.runtimeConfig.activeProvider,
      enabledProviders: this.runtimeConfig.enabledProviders,
      memoryEnabled: this.runtimeConfig.memoryEnabled,
      checks,
      warnings,
      errors,
    };
  }

  private checkImplementedProviders(): HealthcheckItem[] {
    const implementedProviders = new Set(getImplementedProviderNames());
    const implementedProviderList = Array.from(implementedProviders).sort();
    const checks: HealthcheckItem[] = [];

    checks.push(
      implementedProviders.has(this.runtimeConfig.activeProvider)
        ? {
            id: "provider.active_provider_supported",
            status: "pass",
            message: `ACTIVE_MODEL_PROVIDER "${this.runtimeConfig.activeProvider}" is implemented.`,
            details: {
              activeProvider: this.runtimeConfig.activeProvider,
            },
          }
        : {
            id: "provider.active_provider_supported",
            status: "fail",
            message: `ACTIVE_MODEL_PROVIDER "${this.runtimeConfig.activeProvider}" is not implemented in this scaffold.`,
            details: {
              activeProvider: this.runtimeConfig.activeProvider,
              implementedProviders: implementedProviderList,
            },
          },
    );

    for (const provider of this.runtimeConfig.enabledProviders) {
      checks.push(
        implementedProviders.has(provider)
          ? {
              id: `provider.${provider}.implemented`,
              status: "pass",
              message: `Enabled provider "${provider}" is implemented.`,
              details: {
                provider,
              },
            }
          : {
              id: `provider.${provider}.implemented`,
              status: "fail",
              message: `Enabled provider "${provider}" is not implemented in this scaffold.`,
              details: {
                provider,
                implementedProviders: implementedProviderList,
              },
            },
      );
    }

    return checks;
  }

  private checkProviderConfiguration(): HealthcheckItem[] {
    const checks: HealthcheckItem[] = [];
    const production = isProductionEnvironment(this.runtimeConfig);

    for (const provider of this.runtimeConfig.enabledProviders) {
      switch (provider) {
        case "ollama":
          checks.push(this.buildProviderUrlCheck(
            "provider.ollama.base_url",
            "OLLAMA_BASE_URL",
            this.runtimeConfig.ollamaBaseUrl,
            this.runtimeConfig.explicitEnv.ollamaBaseUrl,
            production,
          ));
          break;
        case "lmstudio":
          checks.push(this.buildProviderUrlCheck(
            "provider.lmstudio.base_url",
            "LMSTUDIO_BASE_URL",
            this.runtimeConfig.lmstudioBaseUrl,
            this.runtimeConfig.explicitEnv.lmstudioBaseUrl,
            production,
          ));
          break;
        case "openai":
          checks.push(this.buildProviderSecretCheck(
            "provider.openai.api_key",
            "OPENAI_API_KEY",
            this.runtimeConfig.openaiApiKey,
          ));
          break;
        case "anthropic":
          checks.push(this.buildProviderSecretCheck(
            "provider.anthropic.api_key",
            "ANTHROPIC_API_KEY",
            this.runtimeConfig.anthropicApiKey,
          ));
          break;
      }
    }

    return checks;
  }

  private buildProviderUrlCheck(
    id: string,
    envName: string,
    value: string,
    explicit: boolean,
    production: boolean,
  ): HealthcheckItem {
    if (production && !explicit) {
      return {
        id,
        status: "fail",
        message: `${envName} must be set explicitly in production for the enabled provider.`,
        details: {
          envName,
          resolvedValue: value,
        },
      };
    }

    return {
      id,
      status: explicit ? "pass" : "warn",
      message: explicit
        ? `${envName} is configured for the enabled provider.`
        : `${envName} is using the local development default.`,
      details: {
        envName,
        resolvedValue: value,
      },
    };
  }

  private buildProviderSecretCheck(id: string, envName: string, value: string): HealthcheckItem {
    if (value.length === 0) {
      return {
        id,
        status: "fail",
        message: `${envName} is required for the enabled provider.`,
        details: {
          envName,
        },
      };
    }

    return {
      id,
      status: "pass",
      message: `${envName} is configured for the enabled provider.`,
      details: {
        envName,
      },
    };
  }

  private async checkRuntimeDirectories(): Promise<HealthcheckItem[]> {
    return Promise.all(
      this.runtimeConfig.runtimeDirectories.map(async (directoryPath) => ({
        id: `runtime_directory.${this.toCheckId(directoryPath)}`,
        ...(await this.checkDirectoryWritable(
          directoryPath,
          `Runtime directory is writable: ${directoryPath}`,
          `Runtime directory is not writable: ${directoryPath}`,
        )),
      })),
    );
  }

  private async checkMemoryDirectory(): Promise<HealthcheckItem> {
    if (!this.runtimeConfig.memoryEnabled) {
      return {
        id: "memory.directory",
        status: "warn",
        message: "Memory directory check skipped because memory is disabled.",
        details: {
          path: this.runtimeConfig.memoryDirectory,
        },
      };
    }

    return {
      id: "memory.directory",
      ...(await this.checkDirectoryWritable(
        this.runtimeConfig.memoryDirectory,
        `Memory directory is writable: ${this.runtimeConfig.memoryDirectory}`,
        `Memory directory is not writable: ${this.runtimeConfig.memoryDirectory}`,
      )),
    };
  }

  private async checkDirectoryWritable(
    directoryPath: string,
    successMessage: string,
    failureMessage: string,
  ): Promise<Omit<HealthcheckItem, "id">> {
    const probeFilePath = path.join(
      directoryPath,
      `.healthcheck-${process.pid}-${Date.now()}.tmp`,
    );

    try {
      await mkdir(directoryPath, { recursive: true });
      await writeFile(probeFilePath, "ok", "utf-8");
      await unlink(probeFilePath);

      return {
        status: "pass",
        message: successMessage,
        details: {
          path: directoryPath,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown filesystem error.";
      return {
        status: "fail",
        message: failureMessage,
        details: {
          path: directoryPath,
          error: message,
        },
      };
    }
  }

  private toCheckId(directoryPath: string): string {
    return directoryPath
      .replace(/^[A-Za-z]:/, "")
      .replace(/[\\/]+/g, ".")
      .replace(/^\.+/, "")
      .toLowerCase();
  }
}

export const createRuntimeHealthcheckService = (): RuntimeHealthcheckService => {
  return new RuntimeHealthcheckService(config);
};
