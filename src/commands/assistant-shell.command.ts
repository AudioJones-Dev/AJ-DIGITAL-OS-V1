import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import process from "node:process";

import {
  AssistantRuntimeService,
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
import { renderAssistantInline } from "./assistant-output.js";
import { printJson, renderAssistantReadiness } from "./assistant-readiness-output.js";

export interface AssistantShellCommandInput {
  clientId?: string;
  brandId?: string;
  threadId?: string;
  skillName?: string;
  mode?: AssistantRuntimeMode;
  taskType?: string;
  sourceText?: string;
  autoSubmitForApproval?: boolean;
  json?: boolean;
  label?: string | undefined;
}

export interface AssistantShellTurnResult {
  turnIndex: number;
  task: string;
  ok: boolean;
  mode: string;
  brandId?: string;
  brandName?: string;
  brandManifestPath?: string;
  selectedSkillName?: string;
  selectedWorkflowId?: string;
  route?: {
    provider: string;
    model: string;
    reason: string;
  };
  runId?: string;
  advisory?: AssistantRuntimeResult["advisory"];
  orchestration?: AssistantRuntimeResult["orchestration"];
  warnings: string[];
  errors: string[];
}

export interface AssistantShellCommandResult {
  ok: boolean;
  command: "assistant-shell";
  rendered: boolean;
  launched: boolean;
  shellSessionId: string;
  shellSessionLabel?: string;
  readiness: AssistantReadinessResult;
  turns: AssistantShellTurnResult[];
  warnings: string[];
  errors: string[];
}

export class AssistantShellCommand {
  constructor(
    private readonly readinessService = new AssistantReadinessService(),
    private readonly assistantRuntime = new AssistantRuntimeService(),
    private readonly sessionRecorder = new AssistantSessionRecorder(),
    private readonly conversationRecorder = new ConversationRecorder(),
    private readonly deliverableRecorder = new DeliverableRecorder(),
  ) {}

  async run(input: AssistantShellCommandInput = {}): Promise<AssistantShellCommandResult> {
    const readiness = await this.readinessService.run();
    const shellSessionId = randomUUID();
    const shellSessionLabel = input.label?.trim() || undefined;
    const mode = input.mode ?? "advisory";
    const threadState: { currentThreadId?: string } = {
      ...(input.threadId?.trim() ? { currentThreadId: input.threadId.trim() } : {}),
    };

    if (input.json === true && process.stdin.isTTY) {
      const result = this.buildBlockedResult(
        readiness,
        shellSessionId,
        shellSessionLabel,
        "Interactive JSON shell mode is not supported. Pipe newline-delimited prompts into `assistant-shell --json`, or run the shell without `--json`.",
      );
      await this.recordBlockedSession(result, input, mode);
      printJson(result);
      return result;
    }

    if (!readiness.ok) {
      const result = this.buildBlockedResult(
        readiness,
        shellSessionId,
        shellSessionLabel,
        "Assistant prerequisites are not ready. Run `npm run assistant:doctor` and resolve the reported setup issues before starting shell mode.",
      );
      await this.recordBlockedSession(result, input, mode);

      if (input.json === true) {
        printJson(result);
      } else {
        renderAssistantReadiness("AJ DIGITAL OS ASSISTANT SHELL", readiness);
        console.log("");
        console.log("Errors");
        for (const error of result.errors) {
          console.log(`- ${error}`);
        }
      }

      return result;
    }

    const turns = input.json === true
      ? await this.runJsonSession(input, mode, shellSessionId, shellSessionLabel, threadState)
      : await this.runInteractiveSession(input, mode, shellSessionId, shellSessionLabel, threadState);

    const result: AssistantShellCommandResult = {
      ok: turns.every((turn) => turn.ok),
      command: "assistant-shell",
      rendered: true,
      launched: true,
      shellSessionId,
      ...(shellSessionLabel ? { shellSessionLabel } : {}),
      readiness,
      turns,
      warnings: [],
      errors: [],
    };

    if (input.json === true) {
      printJson(result);
    }

    return result;
  }

  private async runInteractiveSession(
    input: AssistantShellCommandInput,
    mode: AssistantRuntimeMode,
    shellSessionId: string,
    shellSessionLabel: string | undefined,
    threadState: { currentThreadId?: string },
  ): Promise<AssistantShellTurnResult[]> {
    const turns: AssistantShellTurnResult[] = [];
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: process.stdin.isTTY && process.stdout.isTTY,
    });

    console.log("AJ DIGITAL OS ASSISTANT SHELL");
    console.log("=============================");
    console.log(`Session ID: ${shellSessionId}`);
    console.log(`Mode: ${mode}`);
    console.log(`Brand: ${input.brandId ?? "default-or-none"}`);
    console.log(`Label: ${shellSessionLabel ?? "-"}`);
    console.log("Type your prompt and press Enter.");
    console.log("Type `exit`, `quit`, or `/exit` to close the shell.");
    console.log("Type `/help` to show shell commands.");
    console.log("");

    try {
      while (true) {
        const rawInput = await this.prompt(readline, "you> ");
        if (rawInput === undefined) {
          break;
        }

        const task = rawInput.trim();
        if (!task) {
          continue;
        }

        if (isExitCommand(task)) {
          break;
        }

        if (task === "/help") {
          this.renderShellHelp();
          continue;
        }

        const turn = await this.executeTurn(input, mode, shellSessionId, shellSessionLabel, turns.length + 1, task, threadState);
        turns.push(turn);
        console.log("");
        renderAssistantInline(this.toRuntimeResult(turn, task, mode));
        console.log("");
      }
    } finally {
      readline.close();
    }

    console.log(`Shell closed. Session ID: ${shellSessionId}`);
    return turns;
  }

  private async runJsonSession(
    input: AssistantShellCommandInput,
    mode: AssistantRuntimeMode,
    shellSessionId: string,
    shellSessionLabel: string | undefined,
    threadState: { currentThreadId?: string },
  ): Promise<AssistantShellTurnResult[]> {
    const turns: AssistantShellTurnResult[] = [];
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    try {
      for await (const rawLine of readline) {
        const task = rawLine.trim();
        if (!task || isExitCommand(task)) {
          if (isExitCommand(task)) {
            break;
          }
          continue;
        }

        if (task === "/help") {
          continue;
        }

        const turn = await this.executeTurn(input, mode, shellSessionId, shellSessionLabel, turns.length + 1, task, threadState);
        turns.push(turn);
      }
    } finally {
      readline.close();
    }

    return turns;
  }

  private async executeTurn(
    input: AssistantShellCommandInput,
    mode: AssistantRuntimeMode,
    shellSessionId: string,
    shellSessionLabel: string | undefined,
    turnIndex: number,
    task: string,
    threadState: { currentThreadId?: string },
  ): Promise<AssistantShellTurnResult> {
    try {
      const assistant = await this.assistantRuntime.run({
        task,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.brandId ? { brandId: input.brandId } : {}),
        ...(input.skillName ? { skillName: input.skillName } : {}),
        ...(input.mode ? { mode: input.mode } : {}),
        ...(input.taskType ? { taskType: input.taskType } : {}),
        ...(input.sourceText ? { sourceText: input.sourceText } : {}),
        ...(threadState.currentThreadId ? { conversationThreadId: threadState.currentThreadId } : {}),
        ...(input.autoSubmitForApproval ? { autoSubmitForApproval: input.autoSubmitForApproval } : {}),
        sourceCommand: "assistant-shell",
      });
      if (assistant.conversation?.threadId) {
        threadState.currentThreadId = assistant.conversation.threadId;
      }

      const turn = this.fromRuntimeResult(turnIndex, assistant);
      const session = await this.recordTurn({
        mode,
        task,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.brandId ? { brandId: input.brandId } : {}),
        shellSessionId,
        ...(shellSessionLabel ? { shellSessionLabel } : {}),
        turnIndex,
        launched: true,
        assistant,
        warnings: assistant.warnings,
        errors: assistant.errors,
      });
      await this.recordConversation(
        task,
        assistant,
        session?.sessionId,
        shellSessionId,
        shellSessionLabel,
        turnIndex,
        assistant.warnings,
      );
      await this.recordDeliverable(
        assistant,
        shellSessionId,
        shellSessionLabel,
        turnIndex,
        assistant.warnings,
        input.autoSubmitForApproval,
      );
      return turn;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown assistant shell error.";
      const turn: AssistantShellTurnResult = {
        turnIndex,
        task,
        ok: false,
        mode,
        warnings: [],
        errors: [message],
      };

      await this.recordTurn({
        mode,
        task,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.brandId ? { brandId: input.brandId } : {}),
        shellSessionId,
        ...(shellSessionLabel ? { shellSessionLabel } : {}),
        turnIndex,
        launched: true,
        warnings: [],
        errors: [message],
      });

      return turn;
    }
  }

  private fromRuntimeResult(turnIndex: number, assistant: AssistantRuntimeResult): AssistantShellTurnResult {
    return {
      turnIndex,
      task: assistant.task,
      ok: assistant.ok,
      mode: assistant.mode,
      ...(assistant.brandContext.selectedBrandId ? { brandId: assistant.brandContext.selectedBrandId } : {}),
      ...(assistant.brandContext.brandName ? { brandName: assistant.brandContext.brandName } : {}),
      ...(assistant.brandContext.manifestPath ? { brandManifestPath: assistant.brandContext.manifestPath } : {}),
      ...(assistant.skillMatch.selectedSkillName ? { selectedSkillName: assistant.skillMatch.selectedSkillName } : {}),
      ...(assistant.workflowMatch.workflowId ? { selectedWorkflowId: assistant.workflowMatch.workflowId } : {}),
      route: {
        provider: assistant.route.provider,
        model: assistant.route.model,
        reason: assistant.route.reason,
      },
      ...(assistant.orchestration?.runId ? { runId: assistant.orchestration.runId } : {}),
      ...(assistant.advisory ? { advisory: assistant.advisory } : {}),
      ...(assistant.orchestration ? { orchestration: assistant.orchestration } : {}),
      warnings: assistant.warnings,
      errors: assistant.errors,
    };
  }

  private toRuntimeResult(
    turn: AssistantShellTurnResult,
    task: string,
    mode: AssistantRuntimeMode,
  ): AssistantRuntimeResult {
    return {
      ok: turn.ok,
      mode,
      execution: mode,
      clientId: "_template",
      task,
      brandContext: {
        ...(turn.brandId ? { selectedBrandId: turn.brandId } : {}),
        ...(turn.brandName ? { brandName: turn.brandName } : {}),
        ...(turn.brandManifestPath ? { manifestPath: turn.brandManifestPath } : {}),
        resolution: turn.brandId || turn.brandName ? "explicit" : "none",
      },
      executionPolicy: {
        sideEffectsAllowed: mode === "orchestrated",
        deliverablePersistenceAllowed: mode === "orchestrated",
        allowedExecutionModes: ["advisory", "orchestrated"],
      },
      skillMatch: {
        ...(turn.selectedSkillName ? { selectedSkillName: turn.selectedSkillName } : {}),
        candidateSkillNames: [],
        matchedBy: "none",
        allowedTools: [],
      },
      workflowMatch: turn.selectedWorkflowId
        ? {
            workflowId: turn.selectedWorkflowId,
            matchedBy: "none",
          }
        : {
            matchedBy: "none",
          },
      route: turn.route ?? {
        provider: "ollama",
        model: "unknown",
        reason: "",
      },
      promptMetadata: {
        systemLength: 0,
        userLength: 0,
      },
      ...(turn.advisory ? { advisory: turn.advisory } : {}),
      ...(turn.orchestration ? { orchestration: turn.orchestration } : {}),
      warnings: turn.warnings,
      errors: turn.errors,
    };
  }

  private buildBlockedResult(
    readiness: AssistantReadinessResult,
    shellSessionId: string,
    shellSessionLabel: string | undefined,
    error: string,
  ): AssistantShellCommandResult {
    return {
      ok: false,
      command: "assistant-shell",
      rendered: true,
      launched: false,
      shellSessionId,
      ...(shellSessionLabel ? { shellSessionLabel } : {}),
      readiness,
      turns: [],
      warnings: [...readiness.warnings],
      errors: [...readiness.errors, error],
    };
  }

  private async recordBlockedSession(
    result: AssistantShellCommandResult,
    input: AssistantShellCommandInput,
    mode: AssistantRuntimeMode,
  ): Promise<void> {
    await this.recordTurn({
      mode,
      task: "",
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      shellSessionId: result.shellSessionId,
      ...(result.shellSessionLabel ? { shellSessionLabel: result.shellSessionLabel } : {}),
      launched: false,
      warnings: result.warnings,
      errors: result.errors,
    });
  }

  private async recordTurn(input: {
    mode: AssistantRuntimeMode;
    task: string;
    clientId?: string;
    brandId?: string;
    shellSessionId: string;
    shellSessionLabel?: string;
    turnIndex?: number;
    launched: boolean;
    assistant?: AssistantRuntimeResult;
    warnings: string[];
    errors: string[];
  }): Promise<Awaited<ReturnType<AssistantSessionRecorder["record"]>> | undefined> {
    try {
      return await this.sessionRecorder.record({
        sourceCommand: "assistant-shell",
        ...input,
      });
    } catch (error) {
      input.warnings.push(
        `Assistant history persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
      return undefined;
    }
  }

  private async recordDeliverable(
    assistant: AssistantRuntimeResult,
    shellSessionId: string,
    shellSessionLabel: string | undefined,
    turnIndex: number,
    warnings: string[],
    autoSubmitForApproval?: boolean,
  ): Promise<void> {
    try {
      await this.deliverableRecorder.recordAssistantResult({
        sourceCommand: "assistant-shell",
        assistant,
        shellSessionId,
        ...(shellSessionLabel ? { shellSessionLabel } : {}),
        turnIndex,
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
    shellSessionId: string,
    shellSessionLabel: string | undefined,
    turnIndex: number,
    warnings: string[],
  ): Promise<void> {
    try {
      await this.conversationRecorder.recordExchange({
        sourceCommand: "assistant-shell",
        task,
        assistant,
        ...(sessionId ? { sessionId } : {}),
        shellSessionId,
        ...(shellSessionLabel ? { shellSessionLabel } : {}),
        turnIndex,
      });
    } catch (error) {
      warnings.push(
        `Conversation persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }

  private async prompt(readline: Interface, label: string): Promise<string | undefined> {
    try {
      return await readline.question(label);
    } catch {
      return undefined;
    }
  }

  private renderShellHelp(): void {
    console.log("shell>");
    console.log("- Enter any prompt to send it to the assistant runtime.");
    console.log("- `exit`, `quit`, or `/exit` closes the shell.");
    console.log("- `/help` shows this message.");
    console.log("");
  }
}

const isExitCommand = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized === "exit" || normalized === "quit" || normalized === "/exit";
};
