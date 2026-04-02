import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowExecutionResult,
} from "../types/workflow.types.js";

/**
 * Converts transcript material into reusable short-form content assets.
 */
export class TranscriptToContentWorkflow implements WorkflowDefinition {
  readonly id = "workflow.transcript_to_content.v1";
  readonly supportedTaskTypes = ["transcript_to_content"];

  async execute(context: WorkflowContext): Promise<WorkflowExecutionResult> {
    const transcript = this.extractTranscript(context);
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
