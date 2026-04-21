import { logger } from "../core/logger.js";
import type { WebhookVerificationFailureCode } from "./webhook-signature.js";

interface SecurityAuditBase {
  webhookType: "approval" | "execution";
  webhookId?: string;
  nonce?: string;
}

export const logWebhookAccepted = (event: SecurityAuditBase): void => {
  logger.info("Webhook security verification accepted request.", {
    securityEvent: "webhook_accepted",
    ...event,
  });
};

export const logWebhookRejected = (
  event: SecurityAuditBase & {
    code: WebhookVerificationFailureCode;
    reason: string;
  },
): void => {
  logger.warn("Webhook security verification rejected request.", {
    securityEvent: "webhook_rejected",
    ...event,
  });
};

export const logWebhookVerificationFailure = (
  event: SecurityAuditBase & {
    errorClass: string;
  },
): void => {
  logger.error("Webhook security verification encountered internal failure.", {
    securityEvent: "webhook_verification_failure",
    ...event,
  });
};
