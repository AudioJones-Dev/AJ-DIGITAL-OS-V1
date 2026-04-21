/**
 * AJ OS CLI Adapter
 *
 * Bridges Telegram commands to AJ OS CLI operations.
 * Executes existing CLI commands and returns results.
 */

import { execSync } from "node:child_process";
import { statSync } from "node:fs";

import { logger } from "../../core/logger.js";
import type { AJOSCommandResult } from "../types/control-plane.types.js";

export class AJOSCliAdapter {
  private readonly cliScriptPath: string;

  constructor(cliScriptPath: string = "./dist/cli.js") {
    this.cliScriptPath = cliScriptPath;
  }

  isCliAvailable(): boolean {
    try {
      const stat = statSync(this.cliScriptPath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  isFDriveMounted(): boolean {
    try {
      const stat = statSync("F:\\");
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async executeDashboard(): Promise<AJOSCommandResult> {
    try {
      if (!this.isCliAvailable()) {
        return {
          ok: false,
          operation: "dashboard",
          error: "CLI binary not available. Build required.",
        };
      }

      const result = execSync(`node --import ./dist/env.js ${this.cliScriptPath} dashboard`, {
        encoding: "utf-8",
        timeout: 5000,
      });

      logger.info("Dashboard command executed", {
        resultLength: result.length,
      });

      return {
        ok: true,
        operation: "dashboard",
        result: result.substring(0, 4000), // Truncate for Telegram message limits
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Dashboard command failed", {
        error: errorMessage,
      });

      return {
        ok: false,
        operation: "dashboard",
        error: errorMessage.substring(0, 500),
      };
    }
  }

  async listPendingApprovals(): Promise<AJOSCommandResult> {
    try {
      if (!this.isCliAvailable()) {
        return {
          ok: false,
          operation: "pending",
          error: "CLI binary not available. Build required.",
        };
      }

      const result = execSync(`node --import ./dist/env.js ${this.cliScriptPath} list-pending-approvals`, {
        encoding: "utf-8",
        timeout: 5000,
      });

      logger.info("Pending approvals command executed", {
        resultLength: result.length,
      });

      return {
        ok: true,
        operation: "pending",
        result: result.substring(0, 4000),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Pending approvals command failed", {
        error: errorMessage,
      });

      return {
        ok: false,
        operation: "pending",
        error: errorMessage.substring(0, 500),
      };
    }
  }

  async trackRun(runId: string): Promise<AJOSCommandResult> {
    try {
      if (!this.isCliAvailable()) {
        return {
          ok: false,
          operation: "track",
          error: "CLI binary not available. Build required.",
        };
      }

      const result = execSync(`node --import ./dist/env.js ${this.cliScriptPath} track-run --runId ${runId}`, {
        encoding: "utf-8",
        timeout: 10000,
      });

      logger.info("Track run command executed", {
        runId,
        resultLength: result.length,
      });

      return {
        ok: true,
        operation: "track",
        result: result.substring(0, 4000),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Track run command failed", {
        runId,
        error: errorMessage,
      });

      return {
        ok: false,
        operation: "track",
        error: errorMessage.substring(0, 500),
      };
    }
  }
}