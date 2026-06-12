import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatApprovalList,
  formatRunList,
  parseTelegramCommand,
  startTelegramBot,
  stopTelegramBot,
} from "../../src/telegram/index.js";

describe("Telegram bot", () => {
  const ORIGINAL_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
  const ORIGINAL_CHAT = process.env["TELEGRAM_CHAT_ID"];

  beforeEach(() => {
    delete process.env["TELEGRAM_BOT_TOKEN"];
    delete process.env["TELEGRAM_CHAT_ID"];
  });

  afterEach(async () => {
    await stopTelegramBot();
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env["TELEGRAM_BOT_TOKEN"];
    } else {
      process.env["TELEGRAM_BOT_TOKEN"] = ORIGINAL_TOKEN;
    }
    if (ORIGINAL_CHAT === undefined) {
      delete process.env["TELEGRAM_CHAT_ID"];
    } else {
      process.env["TELEGRAM_CHAT_ID"] = ORIGINAL_CHAT;
    }
    vi.restoreAllMocks();
  });

  it("startTelegramBot returns early when TELEGRAM_BOT_TOKEN is not set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("fetch should not be called when bot is not configured");
    });
    const result = await startTelegramBot();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("parseTelegramCommand extracts /approve with approvalId argument", () => {
    const parsed = parseTelegramCommand("/approve abc-123");
    expect(parsed).not.toBeNull();
    expect(parsed?.command).toBe("approve");
    expect(parsed?.args).toEqual(["abc-123"]);
  });

  it("parseTelegramCommand extracts /reject with approvalId argument", () => {
    const parsed = parseTelegramCommand("/reject xyz-789");
    expect(parsed).not.toBeNull();
    expect(parsed?.command).toBe("reject");
    expect(parsed?.args).toEqual(["xyz-789"]);
  });

  it("parseTelegramCommand extracts /approvals with no args", () => {
    const parsed = parseTelegramCommand("/approvals");
    expect(parsed).not.toBeNull();
    expect(parsed?.command).toBe("approvals");
    expect(parsed?.args).toEqual([]);
  });

  it("parseTelegramCommand extracts /status with no args", () => {
    const parsed = parseTelegramCommand("/status");
    expect(parsed).not.toBeNull();
    expect(parsed?.command).toBe("status");
    expect(parsed?.args).toEqual([]);
  });

  it("parseTelegramCommand returns null for non-command text", () => {
    expect(parseTelegramCommand("hello there")).toBeNull();
    expect(parseTelegramCommand("")).toBeNull();
    expect(parseTelegramCommand("/unknown")).toBeNull();
  });

  it("formatApprovalList returns \"No pending approvals\" for empty list", () => {
    expect(formatApprovalList([])).toBe("No pending approvals");
  });

  it("formatRunList returns \"No runs found\" for empty list", () => {
    expect(formatRunList([])).toBe("No runs found");
  });
});
