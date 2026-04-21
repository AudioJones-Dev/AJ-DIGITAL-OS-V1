import {
  AssistantRuntimeService,
  type AssistantRuntimeInput,
  type AssistantRuntimeMode,
  type AssistantRuntimeResult,
} from "../services/runtime/assistant-runtime.js";
import { ConversationRecorder } from "../services/runtime/conversation-recorder.js";
import { DeliverableRecorder } from "../services/runtime/deliverable-recorder.js";
import { AssistantSessionRecorder } from "../services/runtime/assistant-session-recorder.js";
import { renderAssistantHuman } from "./assistant-output.js";

export interface AssistantCommandInput extends AssistantRuntimeInput {
  json?: boolean;
}

export interface AssistantCommandResult {
  ok: boolean;
  command: "assistant";
  rendered: boolean;
  assistant: AssistantRuntimeResult;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing entrypoint for the local assistant runtime layer.
 */
export class AssistantCommand {
  constructor(
    private readonly assistantRuntime = new AssistantRuntimeService(),
    private readonly sessionRecorder = new AssistantSessionRecorder(),
    private readonly conversationRecorder = new ConversationRecorder(),
    private readonly deliverableRecorder = new DeliverableRecorder(),
  ) {}

  async run(input: AssistantCommandInput): Promise<AssistantCommandResult> {
    const task = input.task?.trim() ?? "";
    const mode = input.mode ?? "advisory";
    if (!task) {
      const result = this.buildErrorResult("Assistant command requires `--task <text>`.", input.brandId);
      await this.recordSession({
        sourceCommand: "assistant",
        mode,
        task,
        ...(input.brandId ? { brandId: input.brandId } : {}),
        launched: false,
        warnings: result.assistant.warnings,
        errors: result.assistant.errors,
      });
      if (input.json === true) {
        this.printJson(result.assistant);
      } else {
        this.renderHuman(result.assistant);
      }

      return result;
    }

    const assistant = await this.assistantRuntime.run({
      task,
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.skillName ? { skillName: input.skillName } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.taskType ? { taskType: input.taskType } : {}),
      ...(input.sourceText ? { sourceText: input.sourceText } : {}),
      ...(input.conversationThreadId ? { conversationThreadId: input.conversationThreadId } : {}),
      ...(input.autoSubmitForApproval ? { autoSubmitForApproval: input.autoSubmitForApproval } : {}),
      sourceCommand: "assistant",
    });

    const session = await this.recordSession({
      sourceCommand: "assistant",
      mode,
      task,
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      launched: true,
      assistant,
      warnings: assistant.warnings,
      errors: assistant.errors,
    });
    await this.recordConversation(task, assistant, session?.sessionId, assistant.warnings);
    await this.recordDeliverable("assistant", assistant, assistant.warnings, input.autoSubmitForApproval);

    if (input.json === true) {
      this.printJson(assistant);
    } else {
      this.renderHuman(assistant);
    }

    return {
      ok: assistant.ok,
      command: "assistant",
      rendered: true,
      assistant,
      warnings: assistant.warnings,
      errors: assistant.errors,
    };
  }

  private async recordDeliverable(
    sourceCommand: "assistant",
    assistant: AssistantRuntimeResult,
    warnings: string[],
    autoSubmitForApproval?: boolean,
  ): Promise<void> {
    try {
      await this.deliverableRecorder.recordAssistantResult({
        sourceCommand,
        assistant,
        ...(autoSubmitForApproval ? { autoSubmitForApproval } : {}),
      });
    } catch (error) {
      warnings.push(
        `Deliverable registry persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }

  private renderHuman(result: AssistantRuntimeResult): void {
    renderAssistantHuman(result);
  }

  private printJson(payload: AssistantRuntimeResult): void {
    console.log(JSON.stringify(payload, null, 2));
  }

  private buildErrorResult(message: string, brandId?: string): AssistantCommandResult {
    return {
      ok: false,
      command: "assistant",
      rendered: true,
      assistant: {
        ok: false,
        mode: "advisory",
        execution: "advisory",
        clientId: "_template",
        task: "",
        brandContext: {
          ...(brandId?.trim() ? { selectedBrandId: brandId.trim() } : {}),
          resolution: "none",
        },
        executionPolicy: {
          sideEffectsAllowed: false,
          deliverablePersistenceAllowed: false,
          allowedExecutionModes: ["advisory", "orchestrated"],
        },
        skillMatch: {
          candidateSkillNames: [],
          matchedBy: "none",
          allowedTools: [],
        },
        workflowMatch: {
          matchedBy: "none",
        },
        route: {
          provider: "ollama",
          model: "llama3.1:8b",
          reason: "Default assistant command error route.",
        },
        promptMetadata: {
          systemLength: 0,
          userLength: 0,
        },
        warnings: [],
        errors: [message],
      },
      warnings: [],
      errors: [message],
    };
  }

  private async recordSession(input: {
    sourceCommand: "assistant";
    mode: AssistantRuntimeMode;
    task: string;
    clientId?: string;
    brandId?: string;
    launched: boolean;
    assistant?: AssistantRuntimeResult;
    warnings: string[];
    errors: string[];
  }): Promise<Awaited<ReturnType<AssistantSessionRecorder["record"]>> | undefined> {
    try {
      return await this.sessionRecorder.record(input);
    } catch (error) {
      input.warnings.push(
        `Assistant history persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
      return undefined;
    }
  }

  private async recordConversation(
    task: string,
    assistant: AssistantRuntimeResult,
    sessionId: string | undefined,
    warnings: string[],
  ): Promise<void> {
    try {
      await this.conversationRecorder.recordExchange({
        sourceCommand: "assistant",
        task,
        assistant,
        ...(sessionId ? { sessionId } : {}),
      });
    } catch (error) {
      warnings.push(
        `Conversation persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }
}

export const normalizeAssistantMode = (value: string | undefined): AssistantRuntimeMode | undefined => {
  switch (value) {
    case "advisory":
    case "orchestrated":
      return value;
    default:
      return undefined;
  }
};
