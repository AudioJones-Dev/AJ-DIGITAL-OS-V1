import type { TelegramParseResult } from "../types/control-plane.types.js";

const HELP_TEXT = "Unknown command. Use /help for supported commands.";

export class TelegramParser {
  parse(rawText: string): TelegramParseResult {
    const normalizedText = rawText.replace(/\s+/g, " ").trim();

    if (!normalizedText.startsWith("/")) {
      return {
        ok: false,
        reason: `${HELP_TEXT} Commands must start with '/'.`,
        normalizedText,
      };
    }

    const tokens = normalizedText.split(" ");
    const command = tokens[0]?.toLowerCase() ?? "";

    if (command === "/help") {
      return { ok: true, command: "help", args: {}, normalizedText };
    }

    if (command === "/status") {
      return { ok: true, command: "status", args: {}, normalizedText };
    }

    if (command !== "/ops") {
      return {
        ok: false,
        reason: HELP_TEXT,
        normalizedText,
      };
    }

    const subcommand = tokens[1]?.toLowerCase();
    if (!subcommand) {
      return {
        ok: false,
        reason: "Missing ops subcommand. Usage: /ops dashboard | /ops pending | /ops track <runId>",
        normalizedText,
      };
    }

    if (subcommand === "dashboard") {
      return { ok: true, command: "ops-dashboard", args: {}, normalizedText };
    }

    if (subcommand === "pending") {
      return { ok: true, command: "ops-pending", args: {}, normalizedText };
    }

    if (subcommand === "track") {
      const runId = tokens[2]?.trim();
      if (!runId) {
        return {
          ok: false,
          reason: "Missing runId. Usage: /ops track <runId>",
          normalizedText,
        };
      }

      return {
        ok: true,
        command: "ops-track",
        args: { runId },
        normalizedText,
      };
    }

    return {
      ok: false,
      reason: "Unknown ops subcommand. Usage: /ops dashboard | /ops pending | /ops track <runId>",
      normalizedText,
    };
  }
}
