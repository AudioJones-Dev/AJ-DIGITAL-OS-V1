import { z } from "zod";

import {
  IntegrationStatusRecordSchema,
  SecretReferenceSchema,
} from "./shared-integration.schema.js";

export const ApiIntegrationProfileSchema = z.object({
  recordType: z.literal("api_integration_profile"),
  profileId: z.string().min(1),
  integrationKey: z.string().min(1),
  displayName: z.string().min(1),
  providerProfileId: z.string().min(1),
  enabled: z.boolean(),
  brandIds: z.array(z.string().min(1)),
  connectorIds: z.array(z.string().min(1)),
  channelAdapterIds: z.array(z.string().min(1)),
  scopes: z.array(z.string().min(1)),
  capabilities: z.array(z.string().min(1)),
  secretRefs: z.array(SecretReferenceSchema),
  status: IntegrationStatusRecordSchema,
  settings: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()),
});
