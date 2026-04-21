/**
 * AJ Digital OS - Telegram Local Control Plane
 *
 * Starts the Telegram listener for local operator control.
 * Phase 1: Ingress, Auth, /help, /status, /ops commands
 */

import { logger } from "../core/logger.js";
import { createTelegramAuthService } from "./auth/telegram-auth.js";
import { TelegramListener } from "./telegram/telegram-listener.js";
import { TelegramParser } from "./telegram/telegram-parser.js";
import { AJOSCliAdapter } from "./adapters/ajos-cli.adapter.js";
import type { AuthContext, ControlPlaneCommand } from "./types/control-plane.types.js";

let botToken = "";

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const params = new URLSearchParams({
      chat_id: String(chatId),
      text,
      parse_mode: "Markdown",
    });

    const response = await fetch(`${url}?${params}`, {
      method: "POST",
    });

    if (!response.ok) {
      logger.error("Failed to send Telegram message", {
        chatId,
        statusCode: response.status,
      });
    }
  } catch (error) {
    logger.error("Error sending Telegram message", {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleCommand(command: ControlPlaneCommand, authContext: AuthContext): Promise<void> {
  if (!authContext.isAuthorized) {
    logger.warn("Unauthorized command attempted", {
      userId: authContext.userId,
      command: command.command,
    });

    await sendTelegramMessage(
      authContext.chatId,
      "❌ You are not authorized to use this command. Control plane access is restricted to approved users."
    );
    return;
  }

  const parser = new TelegramParser();
  const adapter = new AJOSCliAdapter();

  logger.info("Processing authorized command", {
    userId: authContext.userId,
    command: command.command,
    args: command.args.length,
  });

  try {
    switch (command.command) {
      case "help":
        await sendTelegramMessage(authContext.chatId, parser.generateHelpMessage());
        break;

      case "status":
        const statusMsg = parser.generateStatusMessage({
          cliAvailable: adapter.isCliAvailable(),
          fDriveMounted: adapter.isFDriveMounted(),
        });
        await sendTelegramMessage(authContext.chatId, statusMsg);
        break;

      case "ops": {
        const subcommand = command.args[0]?.toLowerCase();
        if (subcommand === "dashboard") {
          const result = await adapter.executeDashboard();
          if (result.ok) {
            await sendTelegramMessage(authContext.chatId, `\`\`\`\n${result.result}\n\`\`\``);
          } else {
            await sendTelegramMessage(authContext.chatId, `❌ Dashboard error: ${result.error}`);
          }
        } else if (subcommand === "pending") {
          const result = await adapter.listPendingApprovals();
          if (result.ok) {
            await sendTelegramMessage(authContext.chatId, `\`\`\`\n${result.result}\n\`\`\``);
          } else {
            await sendTelegramMessage(authContext.chatId, `❌ Pending approvals error: ${result.error}`);
          }
        } else if (subcommand === "track" && command.args[1]) {
          const runId = command.args[1];
          const result = await adapter.trackRun(runId);
          if (result.ok) {
            await sendTelegramMessage(authContext.chatId, `\`\`\`\n${result.result}\n\`\`\``);
          } else {
            await sendTelegramMessage(authContext.chatId, `❌ Track error: ${result.error}`);
          }
        } else {
          await sendTelegramMessage(
            authContext.chatId,
            "❌ Unknown /ops subcommand. Use: /ops dashboard, /ops pending, or /ops track <runId>"
          );
        }
        break;
      }

      default:
        await sendTelegramMessage(authContext.chatId, `❌ Unknown command: /${command.command}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Error processing command", {
      command: command.command,
      error: errorMsg,
    });

    await sendTelegramMessage(authContext.chatId, `❌ Error: ${errorMsg.substring(0, 200)}`);
  }
}

async function main(): Promise<void> {
  try {
    logger.info("Telegram Control Plane starting...");

    // Initialize auth service (will throw if env vars are missing)
    const authService = createTelegramAuthService();
    botToken = process.env.AJ_TELEGRAM_BOT_TOKEN || "";

    const pollInterval = Number(process.env.AJ_CONTROL_PLANE_POLL_INTERVAL_MS) || 1000;
    const parser = new TelegramParser();

    // Create listener
    const listener = new TelegramListener(botToken, pollInterval, async (message) => {
      const command = parser.parseMessage(message);

      if (!command) {
        logger.info("Non-command message ignored", {
          userId: message.userId,
        });
        return;
      }

      const authContext = authService.authorize(message);
      await handleCommand(command, authContext);
    });

    // Start listening
    await listener.start();

    logger.info("Telegram Control Plane active. Listening for messages...");

    // Keep process alive
    process.on("SIGINT", async () => {
      logger.info("SIGINT received. Shutting down...");
      await listener.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received. Shutting down...");
      await listener.stop();
      process.exit(0);
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("FATAL: Control Plane failed to start", {
      error: errorMsg,
    });

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error in control plane:", error);
  process.exit(1);
});