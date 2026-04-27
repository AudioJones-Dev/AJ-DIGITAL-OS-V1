/**
 * Operating Core — Schema Registry v1
 *
 * In-memory registry of versioned Zod schemas. Initialized on module load
 * with the canonical Operating Core types so other modules can validate
 * envelopes (commands, events, idempotency records).
 */

import { z } from "zod";

import type {
  SchemaRegistration,
  SchemaSummary,
  SchemaValidationResult,
} from "./schema-types.js";

const registry = new Map<string, SchemaRegistration>();

export function registerSchema(name: string, version: string, schema: z.ZodTypeAny): void {
  registry.set(name, { name, version, schema });
}

export function getSchema(name: string): SchemaRegistration | undefined {
  return registry.get(name);
}

export function getSchemaVersion(name: string): string | undefined {
  return registry.get(name)?.version;
}

export function listSchemas(): SchemaSummary[] {
  return Array.from(registry.values())
    .map((r) => ({ name: r.name, version: r.version }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function validateSchema(name: string, data: unknown): SchemaValidationResult {
  const reg = registry.get(name);
  if (!reg) {
    return { valid: false, errors: [`Unknown schema: ${name}`] };
  }
  const result = reg.schema.safeParse(data);
  if (result.success) return { valid: true };
  return {
    valid: false,
    errors: result.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`),
  };
}

/**
 * Best-effort manual conversion of Zod schemas → JSON Schema (subset).
 * Avoids the `zod-to-json-schema` dependency. Falls back to `{ type: "object" }`
 * for shapes we don't introspect deeply.
 */
export function exportJsonSchema(name: string): Record<string, unknown> {
  const reg = registry.get(name);
  if (!reg) {
    throw new Error(`Unknown schema: ${name}`);
  }
  return zodToJsonSchema(reg.schema, name);
}

function zodToJsonSchema(schema: z.ZodTypeAny, title: string): Record<string, unknown> {
  const def = schema._def as { typeName?: string };
  switch (def.typeName) {
    case "ZodObject": {
      const obj = schema as z.ZodObject<z.ZodRawShape>;
      const shape = obj.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as z.ZodTypeAny, key);
        if (!(value as z.ZodTypeAny).isOptional()) required.push(key);
      }
      return {
        $schema: "http://json-schema.org/draft-07/schema#",
        title,
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodLiteral": {
      const lit = (schema as z.ZodLiteral<unknown>)._def.value;
      return { const: lit };
    }
    case "ZodEnum": {
      const values = (schema as z.ZodEnum<[string, ...string[]]>)._def.values;
      return { type: "string", enum: values };
    }
    case "ZodArray": {
      const inner = (schema as z.ZodArray<z.ZodTypeAny>)._def.type;
      return { type: "array", items: zodToJsonSchema(inner, "item") };
    }
    case "ZodOptional":
    case "ZodNullable": {
      const inner = (schema as z.ZodOptional<z.ZodTypeAny> | z.ZodNullable<z.ZodTypeAny>)._def.innerType;
      return zodToJsonSchema(inner, title);
    }
    case "ZodRecord":
      return { type: "object", additionalProperties: true };
    case "ZodUnion": {
      const options = (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>)._def.options;
      return { anyOf: options.map((o) => zodToJsonSchema(o, title)) };
    }
    default:
      return { type: "object" };
  }
}

/**
 * Reset the registry — used by tests.
 */
export function resetSchemaRegistry(): void {
  registry.clear();
  initializeCoreSchemas();
}

// ── Canonical Operating Core schemas ────────────────────────────────────

const RunStateZ = z.enum([
  "queued",
  "planning",
  "running",
  "waiting_for_approval",
  "retrying",
  "escalated",
  "completed",
  "failed",
  "cancelled",
]);

const ActorTypeZ = z.enum(["user", "admin", "system", "agent", "client"]);
const EnvironmentZ = z.enum(["local", "dev", "staging", "production"]);
const PolicyDecisionZ = z.enum(["allow", "block", "approval_required"]);
const SystemEventCategoryZ = z.enum([
  "run",
  "state",
  "policy",
  "approval",
  "dag",
  "cache",
  "retrieval",
  "decision",
  "attribution",
  "tool",
  "error",
  "dashboard",
]);

const RunZ = z.object({
  runId: z.string(),
  agentId: z.string().optional(),
  state: RunStateZ,
  tenantId: z.string().optional(),
  environment: EnvironmentZ,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

const RunStateTransitionZ = z.object({
  runId: z.string(),
  fromState: RunStateZ,
  toState: RunStateZ,
  reason: z.string().optional(),
  forced: z.boolean().optional(),
  actorId: z.string().optional(),
  actorType: ActorTypeZ.optional(),
  timestamp: z.string(),
});

const PolicyDecisionRecordZ = z.object({
  decision: PolicyDecisionZ,
  reason: z.string(),
  risk: z.enum(["low", "medium", "high"]).optional(),
});

const SystemEventZ = z.object({
  eventId: z.string(),
  eventType: z.string(),
  category: SystemEventCategoryZ,
  tenantId: z.string().optional(),
  runId: z.string().optional(),
  nodeId: z.string().optional(),
  actorId: z.string().optional(),
  actorType: ActorTypeZ.optional(),
  environment: EnvironmentZ,
  payload: z.record(z.unknown()),
  timestamp: z.string(),
  schemaVersion: z.string(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
});

const CommandEnvelopeZ = z.object({
  commandId: z.string(),
  idempotencyKey: z.string(),
  commandType: z.string(),
  tenantId: z.string().optional(),
  actorId: z.string(),
  actorType: ActorTypeZ,
  environment: EnvironmentZ,
  payload: z.record(z.unknown()),
  createdAt: z.string(),
  correlationId: z.string().optional(),
});

const IdempotencyRecordZ = z.object({
  idempotencyKey: z.string(),
  commandHash: z.string(),
  tenantId: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string(),
  status: z.enum(["started", "completed", "failed"]),
  resultRef: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
});

const AttributionEventZ = z.object({
  eventType: z.string(),
  runId: z.string().optional(),
  agentId: z.string().optional(),
  channel: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ── Normalized Entity schemas (L5) ──────────────────────────────────────

const NormalizedTenantZ = z.object({
  entityId: z.string(),
  tenantId: z.string(),
  companyName: z.string().min(1),
  industry: z.string().optional(),
  tier: z.enum(["starter", "growth", "scale", "enterprise"]),
  primaryContact: z.object({
    name: z.string().min(1),
    email: z.string().min(1),
    phone: z.string().optional(),
  }),
  billingEmail: z.string().optional(),
  timezone: z.string(),
  currency: z.enum(["USD", "GBP", "EUR", "CAD", "AUD"]),
  status: z.enum(["active", "trial", "suspended", "churned"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
});

const NormalizedContactZ = z.object({
  entityId: z.string(),
  tenantId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  source: z.enum(["manual", "form", "crm", "import", "webhook", "agent"]),
  tags: z.array(z.string()),
  status: z.enum(["active", "unsubscribed", "bounced", "unknown"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
});

const NormalizedLeadZ = z.object({
  entityId: z.string(),
  tenantId: z.string().optional(),
  contactId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(1),
  company: z.string().optional(),
  source: z.enum(["organic", "paid", "referral", "outbound", "event", "unknown"]),
  score: z.number().min(0).max(100).optional(),
  stage: z.enum([
    "new",
    "contacted",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ]),
  estimatedValue: z.number().optional(),
  currency: z.enum(["USD", "GBP", "EUR", "CAD", "AUD"]).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
});

const NormalizedOfferZ = z.object({
  entityId: z.string(),
  tenantId: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(["retainer", "project", "audit", "workshop", "consulting", "product"]),
  tier: z.enum(["starter", "growth", "scale", "enterprise", "custom"]),
  price: z.number().positive(),
  currency: z.enum(["USD", "GBP", "EUR", "CAD", "AUD"]),
  billingCycle: z.enum(["once", "monthly", "quarterly", "annually"]).optional(),
  deliverables: z.array(z.string()),
  timeline: z.string().optional(),
  scope: z.string().optional(),
  guarantees: z.array(z.string()),
  status: z.enum(["draft", "active", "archived", "deprecated"]),
  governanceStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  mapScore: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
});

const NormalizedAssetZ = z.object({
  entityId: z.string(),
  tenantId: z.string().optional(),
  title: z.string().min(1),
  type: z.enum([
    "blog_post",
    "social_post",
    "email",
    "landing_page",
    "video_script",
    "case_study",
    "whitepaper",
    "report",
    "template",
    "image",
    "other",
  ]),
  format: z.enum([
    "markdown",
    "html",
    "pdf",
    "docx",
    "json",
    "image",
    "video",
    "audio",
    "other",
  ]),
  contentHash: z.string().optional(),
  sourceUri: z.string().optional(),
  publishedUri: z.string().optional(),
  status: z.enum(["draft", "review", "approved", "published", "archived"]),
  tags: z.array(z.string()),
  wordCount: z.number().optional(),
  channel: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
});

const WorkflowStepZ = z.object({
  stepId: z.string(),
  name: z.string(),
  type: z.string(),
  order: z.number(),
  required: z.boolean(),
});

const NormalizedWorkflowZ = z.object({
  entityId: z.string(),
  tenantId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  executionModel: z.enum(["linear", "dag"]),
  steps: z.array(WorkflowStepZ),
  status: z.enum(["draft", "active", "paused", "archived"]),
  sopValidated: z.boolean(),
  governanceStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
});

const NormalizedKnowledgeDocumentZ = z.object({
  entityId: z.string(),
  tenantId: z.string().optional(),
  title: z.string().min(1),
  namespace: z.string().min(1),
  sourceType: z.enum(["markdown", "text", "json", "jsonl", "url", "manual"]),
  contentHash: z.string().optional(),
  chunkCount: z.number().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()),
  status: z.enum(["ingested", "indexing", "indexed", "stale", "archived"]),
  retrievalDocumentId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
});

function initializeCoreSchemas(): void {
  registerSchema("Run", "1.0.0", RunZ);
  registerSchema("RunStateTransition", "1.0.0", RunStateTransitionZ);
  registerSchema("PolicyDecision", "1.0.0", PolicyDecisionRecordZ);
  registerSchema("SystemEvent", "1.0.0", SystemEventZ);
  registerSchema("CommandEnvelope", "1.0.0", CommandEnvelopeZ);
  registerSchema("IdempotencyRecord", "1.0.0", IdempotencyRecordZ);
  registerSchema("AttributionEvent", "1.0.0", AttributionEventZ);
  registerSchema("NormalizedTenant", "1.0.0", NormalizedTenantZ);
  registerSchema("NormalizedContact", "1.0.0", NormalizedContactZ);
  registerSchema("NormalizedLead", "1.0.0", NormalizedLeadZ);
  registerSchema("NormalizedOffer", "1.0.0", NormalizedOfferZ);
  registerSchema("NormalizedAsset", "1.0.0", NormalizedAssetZ);
  registerSchema("NormalizedWorkflow", "1.0.0", NormalizedWorkflowZ);
  registerSchema("NormalizedKnowledgeDocument", "1.0.0", NormalizedKnowledgeDocumentZ);
}

initializeCoreSchemas();
