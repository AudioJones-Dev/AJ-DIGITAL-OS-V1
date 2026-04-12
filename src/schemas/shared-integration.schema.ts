import { z } from "zod";

export const SecretReferenceSchema = z.object({
  provider: z.string().min(1),
  secretId: z.string().min(1),
  purpose: z.enum([
    "api_token",
    "api_key",
    "oauth_client_id",
    "oauth_client_secret",
    "oauth_refresh_token",
    "bot_token",
    "signing_secret",
    "session_cookie",
    "local_encryption_key",
  ]),
  field: z.string().min(1),
  version: z.number().int().positive().optional(),
});

export const IntegrationStatusRecordSchema = z.object({
  state: z.enum([
    "not_configured",
    "configured",
    "connecting",
    "connected",
    "degraded",
    "error",
    "disabled",
  ]),
  message: z.string(),
  lastCheckedAt: z.string().datetime().optional(),
  lastConnectedAt: z.string().datetime().optional(),
  lastErrorCode: z.string().min(1).optional(),
});
