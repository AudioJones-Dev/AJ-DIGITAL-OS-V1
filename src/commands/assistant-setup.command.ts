import {
  AssistantReadinessService,
  type AssistantReadinessResult,
} from "../services/runtime/assistant-readiness.js";
import { printJson, renderAssistantReadiness } from "./assistant-readiness-output.js";

export interface AssistantSetupCommandInput {
  json?: boolean;
}

export interface AssistantSetupCommandResult {
  ok: boolean;
  command: "assistant-setup";
  rendered: boolean;
  readiness: AssistantReadinessResult;
  warnings: string[];
  errors: string[];
}

export class AssistantSetupCommand {
  constructor(private readonly readinessService = new AssistantReadinessService()) {}

  async run(input: AssistantSetupCommandInput = {}): Promise<AssistantSetupCommandResult> {
    const readiness = await this.readinessService.run({ initialize: true });

    if (input.json === true) {
      printJson(readiness);
    } else {
      renderAssistantReadiness("AJ DIGITAL OS ASSISTANT SETUP", readiness);
    }

    return {
      ok: readiness.ok,
      command: "assistant-setup",
      rendered: true,
      readiness,
      warnings: readiness.warnings,
      errors: readiness.errors,
    };
  }
}
