import { afterEach, describe, expect, it } from "vitest";

import { createTelegramAuthService } from "../../src/control-plane/auth/telegram-auth.js";

describe("Telegram auth service", () => {
  const originalAjToken = process.env.AJ_TELEGRAM_BOT_TOKEN;
  const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalAllowedUsers = process.env.AJ_ALLOWED_TELEGRAM_USER_IDS;
  const originalAllowedChats = process.env.AJ_ALLOWED_TELEGRAM_CHAT_IDS;

  afterEach(() => {
    restoreEnv("AJ_TELEGRAM_BOT_TOKEN", originalAjToken);
    restoreEnv("TELEGRAM_BOT_TOKEN", originalTelegramToken);
    restoreEnv("AJ_ALLOWED_TELEGRAM_USER_IDS", originalAllowedUsers);
    restoreEnv("AJ_ALLOWED_TELEGRAM_CHAT_IDS", originalAllowedChats);
  });

  it("falls back to the Hermes Telegram token and authorizes allowlisted operator chat", () => {
    delete process.env.AJ_TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.AJ_ALLOWED_TELEGRAM_USER_IDS = "8698656184";
    process.env.AJ_ALLOWED_TELEGRAM_CHAT_IDS = "8698656184";

    const auth = createTelegramAuthService();
    const result = auth.authorize({
      messageId: 4945775,
      userId: 8698656184,
      chatId: 8698656184,
      userName: "ajdigi",
      firstName: "Audio",
      text: "/start",
      timestamp: 1780547892000,
    });

    expect(result).toEqual({
      userId: 8698656184,
      chatId: 8698656184,
      userName: "ajdigi",
      isAuthorized: true,
    });
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
