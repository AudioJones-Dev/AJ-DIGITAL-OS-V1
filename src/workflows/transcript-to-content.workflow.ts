import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowExecutionResult,
  WorkflowModelRuntime,
} from "../types/workflow.types.js";
import { parseModelOutputObject } from "./model-output-parser.js";

/**
 * Converts transcript material into reusable short-form content assets.
 */
export class TranscriptToContentWorkflow implements WorkflowDefinition {
  readonly id = "workflow.transcript_to_content.v1";
  readonly supportedTaskTypes = ["transcript_to_content"];

  async execute(
    context: WorkflowContext,
    modelRuntime?: WorkflowModelRuntime,
  ): Promise<WorkflowExecutionResult> {
    const transcript = this.extractTranscript(context);
    const fallbackResult = this.buildDeterministicResult(context, transcript);

    if (!modelRuntime || !transcript) {
      return fallbackResult;
    }

    try {
      await this.emitModelEvent(modelRuntime, {
        type: "model_execution_attempted",
        metadata: this.buildModelEventMetadata(modelRuntime),
      });

      const generated = await modelRuntime.provider.generate({
        model: modelRuntime.model,
        system: modelRuntime.system,
        user: modelRuntime.user,
        responseFormat: "json",
        temperature: 0,
        maxTokens: 1400,
        metadata: {
          workflowId: this.id,
          taskType: context.taskType,
          runId: context.runId,
          ...modelRuntime.metadata,
        },
      });
      const parsed = this.parseGeneratedContent(generated.content);

      if (!parsed.ok) {
        const reason = parsed.reason ?? "Model output was not valid JSON.";
        await this.emitModelEvent(modelRuntime, {
          type: "model_execution_parse_failed",
          metadata: {
            ...this.buildModelEventMetadata(modelRuntime, generated.model),
            reason,
          },
          message: reason,
        });
        await this.emitModelEvent(modelRuntime, {
          type: "model_execution_fallback_used",
          metadata: {
            ...this.buildModelEventMetadata(modelRuntime, generated.model),
            reason,
          },
          message: "Deterministic fallback content was used after model output parse failure.",
        });
      } else {
        await this.emitModelEvent(modelRuntime, {
          type: "model_execution_succeeded",
          metadata: {
            ...this.buildModelEventMetadata(modelRuntime, generated.model),
            repaired: parsed.repaired,
          },
          ...(parsed.repaired
            ? { message: "Model execution succeeded after conservative JSON normalization." }
            : {}),
        });
      }

      const hooks = parsed.hooks.length > 0 ? parsed.hooks : this.extractHooks(transcript);
      const titles = parsed.titles.length > 0 ? parsed.titles : this.generateTitles(hooks, context);
      const captions = parsed.captions.length > 0 ? parsed.captions : this.generateCaptions(hooks, context);

      return {
        workflowId: this.id,
        taskType: "transcript_to_content",
        status: "draft_complete",
        summary: parsed.summary ?? `Transcript converted into hooks, titles, and captions with ${modelRuntime.providerName}.`,
        warnings: [...fallbackResult.warnings, ...parsed.warnings],
        assets: [
          { type: "hook_set", value: hooks.join("\n") || "No hooks generated." },
          { type: "title", value: titles.join("\n") || "No titles generated." },
          { type: "caption_set", value: captions.join("\n") || "No captions generated." },
        ],
      };
    } catch (error) {
      const reason = this.getErrorReason(error);
      await this.emitModelEvent(modelRuntime, {
        type: "model_execution_failed",
        metadata: {
          ...this.buildModelEventMetadata(modelRuntime),
          reason,
        },
        message: reason,
      });
      await this.emitModelEvent(modelRuntime, {
        type: "model_execution_fallback_used",
        metadata: {
          ...this.buildModelEventMetadata(modelRuntime),
          reason,
        },
        message: "Deterministic fallback content was used after model execution failure.",
      });

      return {
        ...fallbackResult,
        warnings: [
          ...fallbackResult.warnings,
          `Model-assisted transcript generation failed; using deterministic fallback instead: ${reason}`,
        ],
      };
    }
  }

  private buildDeterministicResult(context: WorkflowContext, transcript: string): WorkflowExecutionResult {
    const hooks = this.extractHooks(transcript);
    const titles = this.generateTitles(hooks, context);
    const captions = this.generateCaptions(hooks, context);

    return {
      workflowId: this.id,
      taskType: "transcript_to_content",
      status: "draft_complete",
      summary: "Transcript converted into hooks, titles, and captions.",
      warnings: transcript ? [] : ["No transcript provided."],
      assets: [
        { type: "hook_set", value: hooks.join("\n") || "No hooks generated." },
        { type: "title", value: titles.join("\n") || "No titles generated." },
        { type: "caption_set", value: captions.join("\n") || "No captions generated." },
      ],
    };
  }

  private parseGeneratedContent(content: string): {
    ok: boolean;
    summary?: string;
    hooks: string[];
    titles: string[];
    captions: string[];
    warnings: string[];
    reason?: string;
    repaired: boolean;
  } {
    const parsedObject = parseModelOutputObject(content);
    if (parsedObject.ok && parsedObject.value) {
      return {
        ok: true,
        repaired: parsedObject.repaired,
        warnings: parsedObject.warnings,
        ...this.extractParsedSections(parsedObject.value),
      };
    }

    return {
      ok: false,
      repaired: parsedObject.repaired,
      hooks: [],
      titles: [],
      captions: [],
      warnings: parsedObject.warnings,
      ...(parsedObject.reason ? { reason: parsedObject.reason } : {}),
    }
  }

  private extractParsedSections(parsed: Record<string, unknown>): {
    summary?: string;
    hooks: string[];
    titles: string[];
    captions: string[];
  } {
    const summary = this.readFirstString(parsed, ["summary", "overview"]);

    return {
      ...(summary
        ? { summary }
        : {}),
      hooks: this.readFirstStringList(parsed, ["hooks", "hook_set", "hookSet"]),
      titles: this.readFirstStringList(parsed, ["titles", "headlines", "title_set"]),
      captions: this.readFirstStringList(parsed, ["captions", "caption_set", "captionSet", "posts"]),
    };
  }

  private buildModelEventMetadata(
    modelRuntime: WorkflowModelRuntime,
    resolvedModel?: string,
  ): Record<string, unknown> {
    return {
      provider: modelRuntime.providerName,
      model: resolvedModel ?? modelRuntime.model,
      workflowId: this.id,
    };
  }

  private async emitModelEvent(
    modelRuntime: WorkflowModelRuntime | undefined,
    event: {
      type: "model_execution_attempted" | "model_execution_succeeded" | "model_execution_parse_failed" | "model_execution_fallback_used" | "model_execution_failed";
      message?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!modelRuntime?.onEvent) {
      return;
    }

    await modelRuntime.onEvent(event);
  }

  private getErrorReason(error: unknown): string {
    const candidates = [
      error instanceof Error ? error.message : undefined,
      error instanceof Error ? String(error) : undefined,
      typeof error === "string" ? error : undefined,
    ];

    for (const candidate of candidates) {
      const normalized = candidate?.replace(/\s+/g, " ").trim();
      if (normalized && normalized !== "Error") {
        return normalized;
      }
    }

    return "Unknown provider error.";
  }

  private readStringList(value: unknown): string[] {
    if (typeof value === "string") {
      return value
        .split(/\r?\n|;/)
        .map((item) => item.replace(/^\d+[.)]\s*/, "").replace(/^[-*]\s*/, "").trim())
        .filter((item) => item.length > 0);
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private readFirstString(
    record: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = typeof record[key] === "string" ? (record[key] as string).trim() : "";
      if (value.length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private readFirstStringList(
    record: Record<string, unknown>,
    keys: string[],
  ): string[] {
    for (const key of keys) {
      const value = this.readStringList(record[key]);
      if (value.length > 0) {
        return value;
      }
    }

    return [];
  }

  private extractTranscript(context: WorkflowContext): string {
    return context.sourceMaterials
      .map((source) => (typeof source.text === "string" ? source.text : ""))
      .join(" ")
      .trim();
  }

  private extractHooks(text: string): string[] {
    if (!text) {
      return [];
    }

    return text
      .split(/[.!?]/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 20)
      .slice(0, 10);
  }

  private generateTitles(hooks: string[], context: WorkflowContext): string[] {
    const brandName = typeof context.brandDNA.brandName === "string" ? context.brandDNA.brandName : context.clientId;

    return hooks.map((hook) => `${brandName}: ${hook}`);
  }

  private generateCaptions(hooks: string[], context: WorkflowContext): string[] {
    const cta = Array.isArray(context.brandDNA.preferredCTAs)
      ? context.brandDNA.preferredCTAs.find((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined;

    return hooks.map((hook) => `${hook} - here's why this matters. ${cta ?? "Follow for more insights."}`);
  }
}

export const transcriptToContentWorkflow = new TranscriptToContentWorkflow();
