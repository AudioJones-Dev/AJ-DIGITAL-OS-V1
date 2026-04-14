/**
 * hermes-status.command.ts — CLI command to report Hermes runtime state.
 *
 * Reports scheduler, watcher, schedules, and recent notification counts.
 */

import {
  getSchedulerStatus,
  isWatcherRunning,
  getLastCheckAt,
  getRecentNotifications,
  getEnabledSchedules,
  DEFAULT_SCHEDULES,
} from "../hermes/index.js";

export interface HermesStatusCommandInput {
  json?: boolean;
}

export interface HermesStatusCommandResult {
  ok: boolean;
  command: "hermes:status";
  rendered: boolean;
  schedulerRunning: boolean;
  watcherRunning: boolean;
  activeSchedules: number;
  enabledSchedules: number;
  totalSchedules: number;
  recentNotifications: number;
  failuresSinceStart: number;
  lastWatcherCheck: string | null;
  warnings: string[];
  errors: string[];
}

export class HermesStatusCommand {
  async run(input: HermesStatusCommandInput): Promise<HermesStatusCommandResult> {
    const status = getSchedulerStatus();
    const watcherRunning = isWatcherRunning();
    const lastCheck = getLastCheckAt();
    const notifications = getRecentNotifications();
    const enabled = getEnabledSchedules(DEFAULT_SCHEDULES);

    const result: HermesStatusCommandResult = {
      ok: true,
      command: "hermes:status",
      rendered: true,
      schedulerRunning: status.running,
      watcherRunning,
      activeSchedules: status.activeSchedules,
      enabledSchedules: enabled.length,
      totalSchedules: DEFAULT_SCHEDULES.length,
      recentNotifications: notifications.length,
      failuresSinceStart: status.failuresSinceStart,
      lastWatcherCheck: lastCheck,
      warnings: [],
      errors: [],
    };

    return this.render(result, input.json);
  }

  private render(result: HermesStatusCommandResult, json?: boolean): HermesStatusCommandResult {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    const dot = (on: boolean) => (on ? "● online" : "○ offline");

    console.log("AJ DIGITAL OS — HERMES STATUS");
    console.log("=============================");
    console.log(`Scheduler:         ${dot(result.schedulerRunning)}`);
    console.log(`Failure Watcher:   ${dot(result.watcherRunning)}`);
    console.log(`Active Schedules:  ${result.activeSchedules} / ${result.enabledSchedules} enabled (${result.totalSchedules} total)`);
    console.log(`Failures (session): ${result.failuresSinceStart}`);
    console.log(`Notifications:     ${result.recentNotifications} recent`);
    console.log(`Last Watcher Check: ${result.lastWatcherCheck ?? "—"}`);

    for (const w of result.warnings) console.log(`Warning: ${w}`);
    for (const e of result.errors) console.log(`Error: ${e}`);

    return result;
  }
}
