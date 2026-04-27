import { access } from "node:fs/promises";
import path from "node:path";

import { TelegramAuthService } from "../auth/telegram-auth.js";
import type { ControlPlaneHealthReport } from "../types/control-plane.types.js";

export class ControlPlaneHealthService {
  constructor(private readonly authService = new TelegramAuthService()) {}

  async validateStartup(): Promise<ControlPlaneHealthReport> {
    const errors: string[] = [];
    const botTokenConfigured = Boolean(process.env.AJ_TELEGRAM_BOT_TOKEN?.trim());
    if (!botTokenConfigured) {
      errors.push("AJ_TELEGRAM_BOT_TOKEN is required.");
    }

    const allowlistConfigured = this.authService.isConfigured();
    if (!allowlistConfigured) {
      errors.push("AJ_ALLOWED_TELEGRAM_USER_IDS and AJ_ALLOWED_TELEGRAM_CHAT_IDS must both be configured.");
    }

    const cliAvailable = await this.checkCliAvailability();
    if (!cliAvailable) {
      errors.push("AJ OS CLI build artifact not found. Run `npm run build` before starting control plane.");
    }

    const modelRootMounted = await this.checkModelRoot();

    return {
      ok: errors.length === 0,
      checks: {
        botTokenConfigured,
        allowlistConfigured,
        cliAvailable,
        modelRootMounted,
      },
      errors,
    };
  }

  private async checkCliAvailability(): Promise<boolean> {
    const cliPath = path.resolve(process.cwd(), "dist", "cli.js");
    try {
      await access(cliPath);
      return true;
    } catch {
      return false;
    }
  }

  private async checkModelRoot(): Promise<"mounted" | "not configured" | "not mounted"> {
    const configuredRoot = process.env.AJ_LOCAL_MODEL_ROOT?.trim();
    if (!configuredRoot) {
      return "not configured";
    }

    try {
      await access(configuredRoot);
      return "mounted";
    } catch {
      return "not mounted";
    }
  }
}
