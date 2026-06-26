import { spawnSync } from "node:child_process";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import axios from "axios";

import { createRuntimeConfig, type RuntimeConfig } from "../../core/config.js";
import { resolveModelRoute } from "../../routing/model-router.js";

export type AssistantReadinessStatus = "pass" | "warn" | "fail";

export interface AssistantReadinessItem {
  id: string;
  status: AssistantReadinessStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface AssistantReadinessResult {
  ok: boolean;
  supportedProviderScope: "ollama-local-first";
  activeProvider: RuntimeConfig["activeProvider"];
  enabledProviders: RuntimeConfig["enabledProviders"];
  baseUrl: string;
  requestedModel: string;
  availableModels: string[];
  executablePath?: string;
  buildOutputPath: string;
  initializedDirectories: string[];
  checks: AssistantReadinessItem[];
  limitations: string[];
  nextSteps: string[];
  warnings: string[];
  errors: string[];
}

export interface AssistantReadinessInput {
  initialize?: boolean;
}

interface ModelDiscoveryResult {
  reachable: boolean;
  availableModels: string[];
  message: string;
  details?: Record<string, unknown>;
}

const OLLAMA_EXECUTABLE_ENV = "OLLAMA_EXECUTABLE";
const OLLAMA_SERVER_TIMEOUT_MS = 10_000;
const ASSISTANT_LIMITATIONS = [
  "The current assistant start path is a single-task CLI wrapper over the existing assistant runtime.",
  "The local web/chat shell remains a thin local-first control surface, not a full production GUI or always-on app runtime.",
] as const;

export class AssistantReadinessService {
  constructor(private readonly runtimeConfig: RuntimeConfig = createRuntimeConfig()) {}

  async run(input: AssistantReadinessInput = {}): Promise<AssistantReadinessResult> {
    const requestedModel = resolveModelRoute("classification").model;
    const buildOutputPath = path.resolve("dist", "cli.js");
    const initializedDirectories: string[] = [];
    const checks: AssistantReadinessItem[] = [];

    const buildReady = await pathExists(buildOutputPath);
    checks.push({
      id: "assistant.build_output",
      status: buildReady ? "pass" : "fail",
      message: buildReady
        ? `Build output is available at ${buildOutputPath}.`
        : `Build output is missing at ${buildOutputPath}. Run \`npm run build\` before starting the assistant.`,
      details: {
        path: buildOutputPath,
      },
    });

    checks.push(this.checkActiveProviderScope());
    checks.push(this.checkEnabledProviderScope());

    const discovery = await this.discoverLocalModels();
    checks.push(this.checkOllamaServer(discovery));

    const executable = await this.resolveOllamaExecutable(discovery.reachable);
    checks.push(executable.check);

    const modelAvailable = isRequestedModelAvailable(requestedModel, discovery.availableModels);
    checks.push({
      id: "assistant.ollama_model",
      status: discovery.reachable ? (modelAvailable ? "pass" : "fail") : "fail",
      message: discovery.reachable
        ? (modelAvailable
          ? `Required local model "${requestedModel}" is installed in Ollama.`
          : `Required local model "${requestedModel}" is not installed locally.`)
        : `Required local model "${requestedModel}" could not be verified because the Ollama server is unavailable.`,
      details: {
        requestedModel,
        availableModels: discovery.availableModels,
      },
    });

    const requiredDirectories = [
      ...this.runtimeConfig.runtimeDirectories,
      ...(this.runtimeConfig.memoryEnabled ? [this.runtimeConfig.memoryDirectory] : []),
    ];

    for (const directoryPath of requiredDirectories) {
      checks.push(await this.checkWritableDirectory(directoryPath, input.initialize === true, initializedDirectories));
    }

    const warnings = checks.filter((check) => check.status === "warn").map((check) => check.message);
    const errors = checks.filter((check) => check.status === "fail").map((check) => check.message);

    return {
      ok: errors.length === 0,
      supportedProviderScope: "ollama-local-first",
      activeProvider: this.runtimeConfig.activeProvider,
      enabledProviders: this.runtimeConfig.enabledProviders,
      baseUrl: this.runtimeConfig.ollamaBaseUrl,
      requestedModel,
      availableModels: discovery.availableModels,
      ...(executable.path ? { executablePath: executable.path } : {}),
      buildOutputPath,
      initializedDirectories,
      checks,
      limitations: [...ASSISTANT_LIMITATIONS],
      nextSteps: this.buildNextSteps({
        buildReady,
        executableFound: executable.found,
        serverReachable: discovery.reachable,
        modelAvailable,
      }),
      warnings,
      errors,
    };
  }

  private checkActiveProviderScope(): AssistantReadinessItem {
    if (this.runtimeConfig.activeProvider === "ollama") {
      return {
        id: "assistant.provider_scope.active",
        status: "pass",
        message: "Active provider is set to Ollama, which is the supported live assistant path in this stage.",
        details: {
          activeProvider: this.runtimeConfig.activeProvider,
        },
      };
    }

    return {
      id: "assistant.provider_scope.active",
      status: "fail",
      message: `ACTIVE_MODEL_PROVIDER is "${this.runtimeConfig.activeProvider}", but the current assistant launch path only supports Ollama/local-first.`,
      details: {
        activeProvider: this.runtimeConfig.activeProvider,
      },
    };
  }

  private checkEnabledProviderScope(): AssistantReadinessItem {
    const unsupportedProviders = this.runtimeConfig.enabledProviders.filter((provider) => provider !== "ollama");
    if (unsupportedProviders.length === 0) {
      return {
        id: "assistant.provider_scope.enabled",
        status: "pass",
        message: "Enabled provider scope matches the current Ollama/local-first assistant launch path.",
        details: {
          enabledProviders: this.runtimeConfig.enabledProviders,
        },
      };
    }

    return {
      id: "assistant.provider_scope.enabled",
      status: "warn",
      message: `Enabled providers include scaffold-only entries (${unsupportedProviders.join(", ")}). Assistant launch remains Ollama/local-first in this stage.`,
      details: {
        enabledProviders: this.runtimeConfig.enabledProviders,
        unsupportedProviders,
      },
    };
  }

  private checkOllamaServer(discovery: ModelDiscoveryResult): AssistantReadinessItem {
    return {
      id: "assistant.ollama_server",
      status: discovery.reachable ? "pass" : "fail",
      message: discovery.message,
      details: {
        baseUrl: this.runtimeConfig.ollamaBaseUrl,
        ...discovery.details,
      },
    };
  }

  private async discoverLocalModels(): Promise<ModelDiscoveryResult> {
    try {
      const response = await axios.get<{ models?: Array<{ name?: string; model?: string }> }>(
        `${this.runtimeConfig.ollamaBaseUrl}/api/tags`,
        {
          timeout: OLLAMA_SERVER_TIMEOUT_MS,
        },
      );

      const models = Array.isArray(response.data?.models) ? response.data.models : [];
      const availableModels = Array.from(new Set(
        models
          .flatMap((entry) => [entry.name, entry.model])
          .map((value) => normalizeText(value))
          .filter((value): value is string => Boolean(value)),
      )).sort((left, right) => left.localeCompare(right));

      return {
        reachable: true,
        availableModels,
        message: `Ollama server is reachable at ${this.runtimeConfig.ollamaBaseUrl}.`,
        details: {
          modelCount: availableModels.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? normalizeText(error.message) ?? "Unknown server error." : "Unknown server error.";
      return {
        reachable: false,
        availableModels: [],
        message: `Ollama server is not reachable at ${this.runtimeConfig.ollamaBaseUrl}. Start \`ollama serve\` or set \`OLLAMA_BASE_URL\` to a running local instance.`,
        details: {
          error: message,
        },
      };
    }
  }

  private async resolveOllamaExecutable(serverReachable: boolean): Promise<{
    found: boolean;
    path?: string;
    check: AssistantReadinessItem;
  }> {
    const configuredPath = normalizeText(process.env[OLLAMA_EXECUTABLE_ENV]);
    if (configuredPath) {
      const exists = await pathExists(configuredPath);
      return exists
        ? {
            found: true,
            path: configuredPath,
            check: {
              id: "assistant.ollama_executable",
              status: "pass",
              message: `Ollama executable is configured via ${OLLAMA_EXECUTABLE_ENV}.`,
              details: {
                env: OLLAMA_EXECUTABLE_ENV,
                path: configuredPath,
              },
            },
          }
        : {
            found: false,
            check: {
              id: "assistant.ollama_executable",
              status: "fail",
              message: `${OLLAMA_EXECUTABLE_ENV} is set, but the configured Ollama executable path does not exist.`,
              details: {
                env: OLLAMA_EXECUTABLE_ENV,
                path: configuredPath,
              },
            },
          };
    }

    const lookupCommand = process.platform === "win32" ? "where" : "which";
    const lookup = spawnSync(lookupCommand, ["ollama"], {
      encoding: "utf-8",
      windowsHide: true,
    });
    const discoveredPath = lookup.status === 0
      ? lookup.stdout
        .split(/\r?\n/)
        .map((candidate) => candidate.trim())
        .find((candidate) => candidate.length > 0)
      : undefined;

    if (discoveredPath) {
      return {
        found: true,
        path: discoveredPath,
        check: {
          id: "assistant.ollama_executable",
          status: "pass",
          message: "Ollama executable is available on PATH.",
          details: {
            path: discoveredPath,
          },
        },
      };
    }

    return {
      found: false,
      check: {
        id: "assistant.ollama_executable",
        status: serverReachable ? "warn" : "fail",
        message: serverReachable
          ? "Ollama server is reachable, but the executable is not discoverable on PATH. Local restart instructions will require setting OLLAMA_EXECUTABLE or updating PATH."
          : "Ollama executable is not discoverable on PATH. Install Ollama, add it to PATH, or set OLLAMA_EXECUTABLE before using the local assistant path.",
      },
    };
  }

  private async checkWritableDirectory(
    directoryPath: string,
    initialize: boolean,
    initializedDirectories: string[],
  ): Promise<AssistantReadinessItem> {
    const existedBefore = await pathExists(directoryPath);
    const probeFilePath = path.join(directoryPath, `.assistant-ready-${process.pid}-${Date.now()}.tmp`);

    try {
      if (initialize) {
        await mkdir(directoryPath, { recursive: true });
        if (!existedBefore) {
          initializedDirectories.push(directoryPath);
        }
      }

      await mkdir(directoryPath, { recursive: true });
      await writeFile(probeFilePath, "ok", "utf-8");
      await unlink(probeFilePath);

      return {
        id: `assistant.directory.${toCheckId(directoryPath)}`,
        status: "pass",
        message: `Runtime directory is writable: ${directoryPath}`,
        details: {
          path: directoryPath,
          initialized: initialize && !existedBefore,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? normalizeText(error.message) ?? "Unknown filesystem error." : "Unknown filesystem error.";
      return {
        id: `assistant.directory.${toCheckId(directoryPath)}`,
        status: "fail",
        message: `Runtime directory is not writable: ${directoryPath}`,
        details: {
          path: directoryPath,
          error: message,
        },
      };
    }
  }

  private buildNextSteps(input: {
    buildReady: boolean;
    executableFound: boolean;
    serverReachable: boolean;
    modelAvailable: boolean;
  }): string[] {
    const nextSteps: string[] = [];

    if (!input.buildReady) {
      nextSteps.push("Run `npm run build` to generate the compiled CLI under `dist/`.");
    }

    if (!input.executableFound) {
      nextSteps.push("Install Ollama, add it to PATH, or set `OLLAMA_EXECUTABLE` to the local binary path.");
    }

    if (!input.serverReachable) {
      nextSteps.push("Start the local Ollama server with `ollama serve`, or point `OLLAMA_BASE_URL` at a running local instance.");
    }

    if (input.serverReachable && !input.modelAvailable) {
      nextSteps.push("Pull the expected local model with `ollama pull llama3.1:8b`, or set `OLLAMA_MODEL` to an installed local tag.");
    }

    if (nextSteps.length === 0) {
      nextSteps.push("Assistant prerequisites are satisfied. Start a single-task session with `npm run cli -- assistant-start --task \"Your request\"`.");
    }

    return nextSteps;
  }
}

const isRequestedModelAvailable = (requestedModel: string, availableModels: string[]): boolean => {
  const normalizedRequestedModel = normalizeText(requestedModel)?.toLowerCase();
  if (!normalizedRequestedModel) {
    return false;
  }

  return availableModels.some((candidate) => {
    const normalizedCandidate = normalizeText(candidate)?.toLowerCase();
    if (!normalizedCandidate) {
      return false;
    }

    return normalizedCandidate === normalizedRequestedModel
      || normalizedCandidate.startsWith(normalizedRequestedModel)
      || normalizedCandidate.includes(normalizedRequestedModel);
  });
};

const normalizeText = (value: string | undefined): string | undefined => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const toCheckId = (directoryPath: string): string => {
  return directoryPath
    .replace(/^[A-Za-z]:/, "")
    .replace(/[\\/]+/g, ".")
    .replace(/^\.+/, "")
    .toLowerCase();
};
