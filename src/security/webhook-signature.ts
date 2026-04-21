import { createHmac, timingSafeEqual } from "node:crypto";

import { WebhookAuthHeadersSchema } from "../schemas/webhook-auth.schema.js";
import type { ReplayStore } from "./replay-store.js";

export interface VerifyWebhookRequestInput {
  rawBody: string;
  headers: Record<string, string | undefined>;
  replayStore: ReplayStore;
  nowMs?: number;
}

export type WebhookVerificationFailureCode =
  | "missing_headers"
  | "malformed_headers"
  | "invalid_timestamp"
  | "expired_timestamp"
  | "invalid_signature"
  | "replay_detected"
  | "internal_error";

interface WebhookSecurityConfig {
  secret: string;
  maxSkewSeconds: number;
  replayTtlSeconds: number;
}

export interface VerifiedWebhookMetadata {
  webhookId: string;
  nonce: string;
  timestamp: string;
}

export type VerifyWebhookRequestResult =
  | { ok: true; metadata: VerifiedWebhookMetadata }
  | { ok: false; statusCode: 400 | 401 | 409 | 500; code: WebhookVerificationFailureCode; message: string };

const DEFAULT_MAX_SKEW_SECONDS = 300;
const DEFAULT_REPLAY_TTL_SECONDS = 600;

export const buildCanonicalPayload = (timestamp: string, nonce: string, rawBody: string): string =>
  `${timestamp}.${nonce}.${rawBody}`;

export const computeWebhookSignature = (secret: string, canonicalPayload: string): string =>
  createHmac("sha256", secret).update(canonicalPayload).digest("hex");

export const verifyWebhookRequest = async (
  input: VerifyWebhookRequestInput,
): Promise<VerifyWebhookRequestResult> => {
  try {
    const headerParse = WebhookAuthHeadersSchema.safeParse(input.headers);

    if (!headerParse.success) {
      return {
        ok: false,
        statusCode: 400,
        code: "missing_headers",
        message: "Missing required webhook authentication headers.",
      };
    }

    const signature = headerParse.data["x-aj-signature"];
    const timestamp = headerParse.data["x-aj-timestamp"];
    const nonce = headerParse.data["x-aj-nonce"];
    const webhookId = headerParse.data["x-aj-webhook-id"];

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return {
        ok: false,
        statusCode: 400,
        code: "malformed_headers",
        message: "Webhook signature header is malformed.",
      };
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || !Number.isInteger(timestampSeconds)) {
      return {
        ok: false,
        statusCode: 400,
        code: "invalid_timestamp",
        message: "Webhook timestamp header must be a unix epoch timestamp in seconds.",
      };
    }

    const config = getWebhookSecurityConfig();
    const nowMs = input.nowMs ?? Date.now();
    const nowSeconds = Math.floor(nowMs / 1000);

    if (Math.abs(nowSeconds - timestampSeconds) > config.maxSkewSeconds) {
      return {
        ok: false,
        statusCode: 400,
        code: "expired_timestamp",
        message: "Webhook timestamp is outside the allowed freshness window.",
      };
    }

    const canonicalPayload = buildCanonicalPayload(timestamp, nonce, input.rawBody);
    const expectedSignature = computeWebhookSignature(config.secret, canonicalPayload);

    const expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");
    const providedSignatureBuffer = Buffer.from(signature, "hex");

    if (
      expectedSignatureBuffer.length !== providedSignatureBuffer.length
      || !timingSafeEqual(expectedSignatureBuffer, providedSignatureBuffer)
    ) {
      return {
        ok: false,
        statusCode: 401,
        code: "invalid_signature",
        message: "Webhook signature verification failed.",
      };
    }

    if (config.replayTtlSeconds <= config.maxSkewSeconds) {
      throw new Error("AJ_WEBHOOK_REPLAY_TTL_SECONDS must be greater than AJ_WEBHOOK_MAX_SKEW_SECONDS.");
    }

    const replayCheck = await input.replayStore.checkAndStore({
      nonce,
      webhookId,
      nowMs,
    });

    if (replayCheck.replay) {
      return {
        ok: false,
        statusCode: 409,
        code: "replay_detected",
        message: "Webhook replay detected.",
      };
    }

    return {
      ok: true,
      metadata: {
        webhookId,
        nonce,
        timestamp,
      },
    };
  } catch {
    return {
      ok: false,
      statusCode: 500,
      code: "internal_error",
      message: "Webhook verification failed due to internal security configuration or state.",
    };
  }
};

const getWebhookSecurityConfig = (): WebhookSecurityConfig => {
  const secret = process.env.AJ_WEBHOOK_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error("AJ_WEBHOOK_SECRET is required.");
  }

  const maxSkewRaw = process.env.AJ_WEBHOOK_MAX_SKEW_SECONDS;
  const replayTtlRaw = process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;

  const maxSkewSeconds = parseOptionalPositiveInt(maxSkewRaw, DEFAULT_MAX_SKEW_SECONDS, "AJ_WEBHOOK_MAX_SKEW_SECONDS");
  const replayTtlSeconds = parseOptionalPositiveInt(
    replayTtlRaw,
    DEFAULT_REPLAY_TTL_SECONDS,
    "AJ_WEBHOOK_REPLAY_TTL_SECONDS",
  );

  return {
    secret,
    maxSkewSeconds,
    replayTtlSeconds,
  };
};

const parseOptionalPositiveInt = (raw: string | undefined, fallback: number, envName: string): number => {
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsed;
};
