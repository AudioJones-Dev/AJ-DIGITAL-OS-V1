import { z } from "zod";

const ModelTaskUsageClassSchema = z.enum([
  "advisory",
  "workflow",
  "coder",
  "chat",
  "tool_reasoning",
]);

export const BrandModelOverrideSchema = z.object({
  brandId: z.string().min(1),
  baseModel: z.string().min(1).optional(),
  fineTuneReference: z.string().min(1).optional(),
  preferredTaskClasses: z.array(ModelTaskUsageClassSchema),
  metadata: z.record(z.unknown()),
});

export const ModelRoutingPreferencesSchema = z.object({
  advisory: z.boolean(),
  workflow: z.boolean(),
  coder: z.boolean(),
  chat: z.boolean(),
  toolReasoning: z.boolean(),
});

export const ModelProfileSchema = z.object({
  recordType: z.literal("model_profile"),
  profileId: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  baseModel: z.string().min(1),
  modelReference: z.string().min(1),
  fineTuneReference: z.string().min(1).optional(),
  enabled: z.boolean(),
  brandIds: z.array(z.string().min(1)),
  integrationProfileIds: z.array(z.string().min(1)),
  taskUsageClasses: z.array(ModelTaskUsageClassSchema),
  routingPreferences: ModelRoutingPreferencesSchema,
  brandOverrides: z.array(BrandModelOverrideSchema),
  taskTypePreferences: z.record(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()),
});
