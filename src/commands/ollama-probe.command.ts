import { config } from "../core/config.js";
import { OllamaProvider } from "../providers/ollama.provider.js";
import { resolveModelRoute } from "../routing/model-router.js";
import { parseModelOutputObject } from "../workflows/model-output-parser.js";

export interface OllamaProbeCommandInput {
  json?: boolean;
}

export interface OllamaProbeCommandResult {
  ok: boolean;
  command: "ollama-probe";
  provider: "ollama";
  requestedModel: string;
  resolvedModel?: string;
  availableModels: string[];
  responsePreview?: string;
  warnings: string[];
  errors: string[];
}

/**
 * Focused local probe for validating one real Ollama-backed JSON generation path.
 */
export class OllamaProbeCommand {
  constructor(private readonly provider = new OllamaProvider(config.ollamaBaseUrl)) {}

  async run(input: OllamaProbeCommandInput = {}): Promise<OllamaProbeCommandResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const route = resolveModelRoute("transcript_to_content");

    try {
      const availableModels = await this.provider.getAvailableModels();
      if (availableModels.length === 0) {
        warnings.push("No local Ollama models were reported by /api/tags.");
      }

      const generated = await this.provider.generate({
        model: route.model,
        system: [
          "You are a health probe for AJ Digital OS.",
          "Return strict JSON only.",
        ].join(" "),
        user: [
          "Respond with a JSON object containing keys `status` and `echo`.",
          "Set `status` to `ok` and `echo` to `ollama_probe`.",
          "Do not include markdown fences or commentary.",
        ].join(" "),
        responseFormat: "json",
        temperature: 0,
        maxTokens: 120,
      });

      const parsed = parseModelOutputObject(generated.content);
      if (!parsed.ok || !parsed.value) {
        errors.push(parsed.reason ?? "Probe response was not valid JSON.");
      } else {
        const status = parsed.value.status;
        const echo = parsed.value.echo;

        if (status !== "ok" || echo !== "ollama_probe") {
          errors.push("Probe returned JSON, but the payload did not match the expected contract.");
        }
      }

      const result: OllamaProbeCommandResult = {
        ok: errors.length === 0,
        command: "ollama-probe",
        provider: "ollama",
        requestedModel: route.model,
        resolvedModel: generated.model,
        availableModels,
        responsePreview: generated.content.slice(0, 200),
        warnings: [...warnings, ...parsed.warnings],
        errors,
      };

      if (input.json === true) {
        this.printJson(result);
      } else {
        this.renderHuman(result);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Ollama probe error.";
      errors.push(message);

      const result: OllamaProbeCommandResult = {
        ok: false,
        command: "ollama-probe",
        provider: "ollama",
        requestedModel: route.model,
        availableModels: [],
        warnings,
        errors,
      };

      if (input.json === true) {
        this.printJson(result);
      } else {
        this.renderHuman(result);
      }

      return result;
    }
  }

  private renderHuman(result: OllamaProbeCommandResult): void {
    console.log("AJ DIGITAL OS OLLAMA PROBE");
    console.log("==========================");
    console.log(`Status: ${result.ok ? "pass" : "fail"}`);
    console.log(`Requested Model: ${result.requestedModel}`);
    console.log(`Resolved Model: ${result.resolvedModel ?? "-"}`);
    console.log(`Available Models: ${result.availableModels.length > 0 ? result.availableModels.join(", ") : "-"}`);

    if (result.responsePreview) {
      console.log("");
      console.log("Response Preview");
      console.log(result.responsePreview);
    }

    if (result.warnings.length > 0) {
      console.log("");
      console.log("Warnings");
      for (const warning of result.warnings) {
        console.log(`- ${warning}`);
      }
    }

    if (result.errors.length > 0) {
      console.log("");
      console.log("Errors");
      for (const error of result.errors) {
        console.log(`- ${error}`);
      }
    }
  }

  private printJson(payload: OllamaProbeCommandResult): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
