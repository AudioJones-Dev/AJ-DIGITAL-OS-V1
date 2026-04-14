/**
 * hermes-stop.command.ts — CLI command to take Hermes offline.
 *
 * Stops the scheduler + failure watcher if running.
 */

import { stopHermes, getSchedulerStatus, isWatcherRunning } from "../hermes/index.js";

export interface HermesStopCommandInput {
  json?: boolean;
}

export interface HermesStopCommandResult {
  ok: boolean;
  command: "hermes:stop";
  rendered: boolean;
  wasRunning: boolean;
  warnings: string[];
  errors: string[];
}

export class HermesStopCommand {
  async run(input: HermesStopCommandInput): Promise<HermesStopCommandResult> {
    const before = getSchedulerStatus();
    const wasRunning = before.running || isWatcherRunning();

    if (!wasRunning) {
      const result: HermesStopCommandResult = {
        ok: true,
        command: "hermes:stop",
        rendered: true,
        wasRunning: false,
        warnings: ["Hermes was not running."],
        errors: [],
      };
      return this.render(result, input.json);
    }

    stopHermes();

    const result: HermesStopCommandResult = {
      ok: true,
      command: "hermes:stop",
      rendered: true,
      wasRunning: true,
      warnings: [],
      errors: [],
    };
    return this.render(result, input.json);
  }

  private render(result: HermesStopCommandResult, json?: boolean): HermesStopCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS — HERMES STOP");
    console.log("===========================");

    if (result.wasRunning) {
      console.log("Hermes has been stopped.");
    } else {
      console.log("Hermes was already offline.");
    }

    for (const w of result.warnings) console.log(`Warning: ${w}`);
    for (const e of result.errors) console.log(`Error: ${e}`);

    return result;
  }
}
