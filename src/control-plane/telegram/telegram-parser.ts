/**
 * Telegram Command Parser
 *
 * Parses incoming Telegram messages into control plane commands.
 * Supports:
 * - /help - Lists available commands
 * - /status - Shows system status
 * - /ask <prompt> - Ask local Ollama model
 * - /ops dashboard - Shows dashboard
 * - /ops pending - Lists pending approvals
 * - /ops track <runId> - Tracks a specific run
 */

import { logger } from "../../core/logger.js";
import type { ControlPlaneCommand, TelegramMessage } from "../types/control-plane.types.js";

export class TelegramParser {
  parseMessage(message: TelegramMessage): ControlPlaneCommand | null {
    const text = message.text.trim();

    if (!text.startsWith("/")) {
      logger.info("Non-command message received", {
        userId: message.userId,
        text: text.substring(0, 50),
      });
      return null;
    }

    const parts = text.split(/\s+/);
    const firstPart = parts[0];
    const command = firstPart ? firstPart.substring(1).toLowerCase() : "unknown";
    const args = parts.slice(1);

    logger.info("Telegram command parsed", {
      userId: message.userId,
      command,
      argCount: args.length,
    });

    return {
      command,
      args,
      rawMessage: message,
    };
  }

  generateHelpMessage(): string {
    return `
*AJ Digital OS - Local Control Plane*

Available Commands:

\`/help\` - Show this message
\`/status\` - Show system status (CLI available, F drive mounted, etc.)
\`/ask <prompt>\` - Ask local Ollama model (concise answer)
\`/ops dashboard\` - Show control panel dashboard
\`/ops pending\` - List pending approvals
\`/ops track <runId>\` - Track a specific run execution

_Local Telegram interface for AJ OS operations_
`.trim();
  }

  generateStatusMessage(systemStatus: {
    cliAvailable: boolean;
    fDriveMounted: boolean;
    ollamaEnabled: boolean;
    ollamaHealthy: boolean;
    ollamaModel: string;
  }): string {
    const cliStatus = systemStatus.cliAvailable ? "✅" : "❌";
    const fDriveStatus = systemStatus.fDriveMounted ? "✅" : "❌";
    const ollamaEnabled = systemStatus.ollamaEnabled ? "✅" : "❌";
    const ollamaHealth = systemStatus.ollamaHealthy ? "✅" : "❌";

    return `
*System Status*

CLI Available: ${cliStatus}
F: Drive Mounted: ${fDriveStatus}
Ollama Enabled: ${ollamaEnabled}
Ollama Healthy: ${ollamaHealth}
Ollama Model: ${systemStatus.ollamaModel}

_Last updated: ${new Date().toISOString()}_
`.trim();
  }
}