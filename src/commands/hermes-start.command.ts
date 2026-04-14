/**
 * hermes-start.command.ts — CLI command to bring Hermes online.
 *
 * Starts the scheduler + failure watcher, then keeps the process alive.
 * The process stays alive until stopped via Ctrl-C (SIGINT/SIGTERM).
 */

import { startHermes, stopHermes, getSchedulerStatus, isWatcherRunning } from "../hermes/index.js";
import { getEnabledSchedules, DEFAULT_SCHEDULES } from "../hermes/hermes-schedule-config.js";

export interface HermesStartCommandInput {
  json?: boolean;
}

export interface HermesStartCommandResult {
  ok: boolean;
  command: "hermes:start";
  rendered: boolean;
  schedulerRunning: boolean;
  watcherRunning: boolean;
  activeSchedules: number;
  warnings: string[];
  errors: string[];
}

export class HermesStartCommand {
  async run(input: HermesStartCommandInput): Promise<HermesStartCommandResult> {
    const status = getSchedulerStatus();

    if (status.running) {
      const result: HermesStartCommandResult = {
        ok: false,
        command: "hermes:start",
        rendered: true,
        schedulerRunning: true,
        watcherRunning: isWatcherRunning(),
        activeSchedules: status.activeSchedules,
        warnings: ["Hermes is already running."],
        errors: [],
      };
      return this.render(result, input.json);
    }

    startHermes();

    const newStatus = getSchedulerStatus();
    const enabled = getEnabledSchedules(DEFAULT_SCHEDULES);

    // Keep process alive until SIGINT/SIGTERM
    const keepAlive = setInterval(() => {}, 60_000);
    const shutdown = () => {
      clearInterval(keepAlive);
      stopHermes();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    const result: HermesStartCommandResult = {
      ok: true,
      command: "hermes:start",
      rendered: true,
      schedulerRunning: newStatus.running,
      watcherRunning: isWatcherRunning(),
      activeSchedules: newStatus.activeSchedules,
      warnings: enabled.length === 0 ? ["No schedules are enabled."] : [],
      errors: [],
    };
    return this.render(result, input.json);
  }

  private render(result: HermesStartCommandResult, json?: boolean): HermesStartCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log("AJ DIGITAL OS — HERMES START");
    console.log("============================");
    console.log(`Scheduler:  ${result.schedulerRunning ? "● online" : "○ offline"}`);
    console.log(`Watcher:    ${result.watcherRunning ? "● online" : "○ offline"}`);
    console.log(`Schedules:  ${result.activeSchedules} active`);

    for (const w of result.warnings) console.log(`Warning: ${w}`);
    for (const e of result.errors) console.log(`Error: ${e}`);

    if (result.ok) {
      console.log("");
      console.log("Hermes is running. Press Ctrl+C to stop.");
    }

    return result;
  }
}
