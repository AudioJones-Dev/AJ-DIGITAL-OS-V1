/**
 * telegram.commands.ts — CLI commands for the Telegram approval bot.
 */

import {
  getTelegramStatus,
  readTelegramConfig,
  startTelegramBot,
  stopTelegramBot,
} from "../telegram/index.js";
import type { TelegramBotStatus } from "../telegram/index.js";

export interface TelegramStartCommandInput {
  json?: boolean;
}

export interface TelegramStartCommandResult {
  ok: boolean;
  command: "telegram-start";
  configured: boolean;
  started: boolean;
  reason?: string;
}

export class TelegramStartCommand {
  async run(input: TelegramStartCommandInput): Promise<TelegramStartCommandResult> {
    const cfg = readTelegramConfig();
    if (!cfg) {
      const result: TelegramStartCommandResult = {
        ok: true,
        command: "telegram-start",
        configured: false,
        started: false,
        reason: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.",
      };
      if (input.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log("Telegram bot not configured.");
        console.log("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID and try again.");
      }
      return result;
    }

    const startResult = await startTelegramBot();
    const result: TelegramStartCommandResult = {
      ok: startResult.ok,
      command: "telegram-start",
      configured: true,
      started: startResult.ok,
      ...(startResult.reason ? { reason: startResult.reason } : {}),
    };

    if (input.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (startResult.ok) {
      console.log(`Telegram bot started for chat ${cfg.chatId}. Press Ctrl-C to stop.`);
      await new Promise<void>((resolve) => {
        const onSignal = async (): Promise<void> => {
          await stopTelegramBot();
          resolve();
        };
        process.once("SIGINT", () => void onSignal());
        process.once("SIGTERM", () => void onSignal());
      });
    } else {
      console.log(`Telegram bot did not start: ${startResult.reason ?? "unknown reason"}`);
    }
    return result;
  }
}

export interface TelegramStatusCommandInput {
  json?: boolean;
}

export interface TelegramStatusCommandResult {
  ok: boolean;
  command: "telegram-status";
  status: TelegramBotStatus;
}

export class TelegramStatusCommand {
  async run(input: TelegramStatusCommandInput): Promise<TelegramStatusCommandResult> {
    const status = getTelegramStatus();
    const result: TelegramStatusCommandResult = {
      ok: true,
      command: "telegram-status",
      status,
    };
    if (input.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("AJ DIGITAL OS — TELEGRAM STATUS");
      console.log("===============================");
      console.log(`Configured: ${status.configured ? "yes" : "no"}`);
      console.log(`Running:    ${status.running ? "yes" : "no"}`);
      if (status.chatId) console.log(`Chat ID:    ${status.chatId}`);
      if (status.lastPolledAt) console.log(`Last poll:  ${status.lastPolledAt}`);
    }
    return result;
  }
}
