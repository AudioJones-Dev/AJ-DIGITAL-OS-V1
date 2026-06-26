import {
  AssistantRuntimeService,
  type AssistantRuntimeInput,
  type AssistantRuntimeMode,
  type AssistantRuntimeResult,
} from "../services/runtime/assistant-runtime.js";
import {
  AssistantReadinessService,
  type AssistantReadinessResult,
} from "../services/runtime/assistant-readiness.js";
import { ConversationRecorder } from "../services/runtime/conversation-recorder.js";
import { DeliverableRecorder } from "../services/runtime/deliverable-recorder.js";
import { AssistantSessionRecorder } from "../services/runtime/assistant-session-recorder.js";
import { renderAssistantHuman } from "./assistant-output.js";
import { printJson, renderAssistantReadiness } from "./assistant-readiness-output.js";

export interface AssistantStartCommandInput extends AssistantRuntimeInput {
  json?: boolean;
}

export interface AssistantStartCommandResult {
  ok: boolean;
  command: "assistant-start";
  rendered: boolean;
  launched: boolean;
  readiness: AssistantReadinessResult;
  assistant?: AssistantRuntimeResult;
  warnings: string[];
  errors: string[];
}

export class AssistantStartCommand {
  constructor(
    private readonly readinessService = new AssistantReadinessService(),
    private readonly assistantRuntime = new AssistantRuntimeService(),
    private readonly sessionRecorder = new AssistantSessionRecorder(),
    private readonly conversationRecorder = new ConversationRecorder(),
    private readonly deliverableRecorder = new DeliverableRecorder(),
  ) {}

  async run(input: AssistantStartCommandInput): Promise<AssistantStartCommandResult> {
    const readiness = await this.readinessService.run();
    const task = input.task?.trim() ?? "";
    const mode = input.mode ?? "advisory";

    if (!readiness.ok) {
      const result = this.buildBlockedResult(
        readiness,
        "Assistant prerequisites are not ready. Run `npm run cli -- assistant-doctor` and resolve the reported setup issues before starting a session.",
      );
      await this.recordSession({
        sourceCommand: "assistant-start",
        mode,
        task,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.brandId ? { brandId: input.brandId } : {}),
        launched: false,
        warnings: result.warnings,
        errors: result.errors,
      });
      this.renderResult(result, input.json === true, mode);
      return result;
    }

    if (!task) {
      const result = this.buildBlockedResult(
        readiness,
        "Assistant start currently runs one task per invocation. Pass `--task <text>`. A persistent chat UI is not implemented in this stage.",
      );
      await this.recordSession({
        sourceCommand: "assistant-start",
        mode,
        task,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.brandId ? { brandId: input.brandId } : {}),
        launched: false,
        warnings: result.warnings,
        errors: result.errors,
      });
      this.renderResult(result, input.json === true, mode);
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
      sourceCommand: "assistant-start",
    });

    const result: AssistantStartCommandResult = {
      ok: assistant.ok,
      command: "assistant-start",
      rendered: true,
      launched: true,
      readiness,
      assistant,
      warnings: [...readiness.warnings, ...assistant.warnings],
      errors: [...readiness.errors, ...assistant.errors],
    };

    const session = await this.recordSession({
      sourceCommand: "assistant-start",
      mode,
      task,
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      launched: true,
      assistant,
      warnings: result.warnings,
      errors: result.errors,
    });
    await this.recordConversation(task, assistant, session?.sessionId, result.warnings);
    await this.recordDeliverable("assistant-start", assistant, result.warnings, input.autoSubmitForApproval);

    this.renderResult(result, input.json === true, mode);
    return result;
  }

  private buildBlockedResult(
    readiness: AssistantReadinessResult,
    error: string,
  ): AssistantStartCommandResult {
    return {
      ok: false,
      command: "assistant-start",
      rendered: true,
      launched: false,
      readiness,
      warnings: [...readiness.warnings],
      errors: [...readiness.errors, error],
    };
  }

  private async recordSession(input: {
    sourceCommand: "assistant-start";
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

  private async recordDeliverable(
    sourceCommand: "assistant-start",
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

  private async recordConversation(
    task: string,
    assistant: AssistantRuntimeResult,
    sessionId: string | undefined,
    warnings: string[],
  ): Promise<void> {
    try {
      await this.conversationRecorder.recordExchange({
        sourceCommand: "assistant-start",
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

  private renderResult(
    result: AssistantStartCommandResult,
    json: boolean,
    mode: AssistantRuntimeMode,
  ): void {
    if (json) {
      printJson(result);
      return;
    }

    if (!result.launched || !result.assistant) {
      renderAssistantReadiness("AJ DIGITAL OS ASSISTANT START", result.readiness);
      console.log("");
      console.log("Launch Status");
      console.log(`Mode: ${mode}`);
      console.log("Interface: single-task CLI session");
      console.log("Session: not started");
      console.log("");
      console.log("Errors");
      for (const error of result.errors) {
        console.log(`- ${error}`);
      }
      return;
    }

    console.log("AJ DIGITAL OS ASSISTANT START");
    console.log("=============================");
    console.log(`Readiness: ${result.readiness.ok ? "ready" : "not-ready"}`);
    console.log(`Mode: ${result.assistant.mode}`);
    console.log("Interface: single-task CLI session");
    console.log("Limitation: persistent chat UI is not implemented in this stage.");
    console.log("");
    renderAssistantHuman(result.assistant);
  }
}
