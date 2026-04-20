import { z } from "zod";

export const WEBHOOK_HEADER_NAMES = {
  signature: "x-aj-signature",
  timestamp: "x-aj-timestamp",
  nonce: "x-aj-nonce",
  webhookId: "x-aj-webhook-id",
} as const;

export const WebhookAuthHeadersSchema = z.object({
  [WEBHOOK_HEADER_NAMES.signature]: z.string().min(1),
  [WEBHOOK_HEADER_NAMES.timestamp]: z.string().min(1),
  [WEBHOOK_HEADER_NAMES.nonce]: z.string().min(1),
  [WEBHOOK_HEADER_NAMES.webhookId]: z.string().min(1),
});

export type WebhookAuthHeaders = z.infer<typeof WebhookAuthHeadersSchema>;
