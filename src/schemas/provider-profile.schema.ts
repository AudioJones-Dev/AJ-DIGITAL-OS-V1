import { z } from "zod";

import { SecretReferenceSchema } from "./shared-integration.schema.js";

export const ProviderProfileSchema = z.object({
  recordType: z.literal("provider_profile"),
  profileId: z.string().min(1),
  providerKey: z.string().min(1),
  displayName: z.string().min(1),
  kind: z.enum(["api", "oauth", "bot", "mcp", "model"]),
  enabled: z.boolean(),
  baseUrl: z.string().min(1).optional(),
  authStrategy: z.enum(["none", "api_key", "oauth2", "bot_token", "session_token", "local_path"]),
  defaultScopes: z.array(z.string().min(1)),
  supportedCapabilities: z.array(z.string().min(1)),
  secretRefs: z.array(SecretReferenceSchema),
  brandIds: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()),
});
