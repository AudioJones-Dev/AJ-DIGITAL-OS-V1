import { logger } from "../core/logger.js";
import { TelegramListenerService } from "./telegram/telegram-listener.js";

async function main(): Promise<void> {
  const listener = new TelegramListenerService();

  process.on("SIGINT", () => {
    logger.info("Received SIGINT. Stopping Telegram listener.");
    listener.stop();
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM. Stopping Telegram listener.");
    listener.stop();
  });

  await listener.start();
}

main().catch((error) => {
  logger.error("Control plane failed to start.", {
    error: error instanceof Error ? error.message : "Unknown startup error.",
  });
  process.exitCode = 1;
});
