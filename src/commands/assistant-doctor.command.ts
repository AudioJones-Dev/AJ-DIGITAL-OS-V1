import {
  AssistantReadinessService,
  type AssistantReadinessResult,
} from "../services/runtime/assistant-readiness.js";
import { printJson, renderAssistantReadiness } from "./assistant-readiness-output.js";

export interface AssistantDoctorCommandInput {
  json?: boolean;
}

export interface AssistantDoctorCommandResult {
  ok: boolean;
  command: "assistant-doctor";
  rendered: boolean;
  readiness: AssistantReadinessResult;
  warnings: string[];
  errors: string[];
}

export class AssistantDoctorCommand {
  constructor(private readonly readinessService = new AssistantReadinessService()) {}

  async run(input: AssistantDoctorCommandInput = {}): Promise<AssistantDoctorCommandResult> {
    const readiness = await this.readinessService.run();

    if (input.json === true) {
      printJson(readiness);
    } else {
      renderAssistantReadiness("AJ DIGITAL OS ASSISTANT DOCTOR", readiness);
    }

    return {
      ok: readiness.ok,
      command: "assistant-doctor",
      rendered: true,
      readiness,
      warnings: readiness.warnings,
      errors: readiness.errors,
    };
  }
}
