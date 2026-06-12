/**
 * L5 — Normalizer.
 *
 * Per-entity normalize functions. Each accepts a raw object (any shape),
 * applies field mapping + coercion, validates required fields, generates
 * an entityId if missing, fills createdAt/updatedAt defaults, and stamps
 * the schemaVersion.
 */

import { randomUUID } from "node:crypto";

import {
  coerceBoolean,
  coerceEnum,
  coerceNumber,
  coerceString,
  coerceStringArray,
  mapFields,
  requireFields,
  type FieldMap,
} from "./field-mapper.js";
import {
  NORMALIZATION_SCHEMA_VERSION,
  type AssetFormat,
  type AssetStatus,
  type AssetType,
  type ContactSource,
  type ContactStatus,
  type GovernanceStatus,
  type KnowledgeSourceType,
  type KnowledgeStatus,
  type LeadSource,
  type LeadStage,
  type NormalizedAsset,
  type NormalizedContact,
  type NormalizedKnowledgeDocument,
  type NormalizedLead,
  type NormalizedOffer,
  type NormalizedTenant,
  type NormalizedTenantContact,
  type NormalizedWorkflow,
  type OfferBillingCycle,
  type OfferStatus,
  type OfferTier,
  type OfferType,
  type TenantCurrency,
  type TenantStatus,
  type TenantTier,
  type WorkflowExecutionModel,
  type WorkflowStatus,
  type WorkflowStep,
} from "./normalization-types.js";

const TENANT_TIERS = ["starter", "growth", "scale", "enterprise"] as const satisfies readonly TenantTier[];
const TENANT_CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD"] as const satisfies readonly TenantCurrency[];
const TENANT_STATUSES = ["active", "trial", "suspended", "churned"] as const satisfies readonly TenantStatus[];

const CONTACT_SOURCES = ["manual", "form", "crm", "import", "webhook", "agent"] as const satisfies readonly ContactSource[];
const CONTACT_STATUSES = ["active", "unsubscribed", "bounced", "unknown"] as const satisfies readonly ContactStatus[];

const LEAD_SOURCES = ["organic", "paid", "referral", "outbound", "event", "unknown"] as const satisfies readonly LeadSource[];
const LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const satisfies readonly LeadStage[];

const OFFER_TYPES = ["retainer", "project", "audit", "workshop", "consulting", "product"] as const satisfies readonly OfferType[];
const OFFER_TIERS = ["starter", "growth", "scale", "enterprise", "custom"] as const satisfies readonly OfferTier[];
const OFFER_BILLING = ["once", "monthly", "quarterly", "annually"] as const satisfies readonly OfferBillingCycle[];
const OFFER_STATUSES = ["draft", "active", "archived", "deprecated"] as const satisfies readonly OfferStatus[];
const GOVERNANCE_STATUSES = ["pending", "approved", "rejected"] as const satisfies readonly GovernanceStatus[];

const ASSET_TYPES = [
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
] as const satisfies readonly AssetType[];
const ASSET_FORMATS = [
  "markdown",
  "html",
  "pdf",
  "docx",
  "json",
  "image",
  "video",
  "audio",
  "other",
] as const satisfies readonly AssetFormat[];
const ASSET_STATUSES = ["draft", "review", "approved", "published", "archived"] as const satisfies readonly AssetStatus[];

const WORKFLOW_EXECUTION_MODELS = ["linear", "dag"] as const satisfies readonly WorkflowExecutionModel[];
const WORKFLOW_STATUSES = ["draft", "active", "paused", "archived"] as const satisfies readonly WorkflowStatus[];

const KNOWLEDGE_SOURCE_TYPES = ["markdown", "text", "json", "jsonl", "url", "manual"] as const satisfies readonly KnowledgeSourceType[];
const KNOWLEDGE_STATUSES = ["ingested", "indexing", "indexed", "stale", "archived"] as const satisfies readonly KnowledgeStatus[];

function nowIso(): string {
  return new Date().toISOString();
}

function newEntityId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function asString(value: unknown): string | undefined {
  return coerceString(value);
}

function withTimestamps<T extends { createdAt?: string; updatedAt?: string }>(
  obj: T,
  now: string,
): T & { createdAt: string; updatedAt: string } {
  return {
    ...obj,
    createdAt: obj.createdAt ?? now,
    updatedAt: obj.updatedAt ?? now,
  };
}

// ── Tenant ────────────────────────────────────────────────────────────────

const TENANT_FIELD_MAP: FieldMap = {
  entityId: ["entityId"],
  tenantId: ["tenantId", "tenant_id"],
  companyName: ["companyName", "company_name", "company", "name"],
  industry: ["industry", "sector"],
  tier: ["tier", "plan"],
  primaryContact: ["primaryContact", "primary_contact", "contact"],
  contactName: ["contactName", "contact_name"],
  contactEmail: ["contactEmail", "contact_email", "email"],
  contactPhone: ["contactPhone", "contact_phone", "phone"],
  billingEmail: ["billingEmail", "billing_email"],
  timezone: ["timezone", "tz"],
  currency: ["currency"],
  status: ["status"],
  createdAt: ["createdAt", "created_at"],
  updatedAt: ["updatedAt", "updated_at"],
};

function normalizeTenantContact(
  raw: Record<string, unknown>,
  mapped: Record<string, unknown>,
): NormalizedTenantContact {
  const candidate =
    typeof mapped["primaryContact"] === "object" && mapped["primaryContact"] !== null
      ? (mapped["primaryContact"] as Record<string, unknown>)
      : raw;
  const name = asString(candidate["name"]) ?? asString(mapped["contactName"]) ?? "";
  const email = asString(candidate["email"]) ?? asString(mapped["contactEmail"]) ?? "";
  const phone = asString(candidate["phone"]) ?? asString(mapped["contactPhone"]);
  if (!name || !email) {
    throw new Error("normalizeTenant: primaryContact requires name and email");
  }
  return phone !== undefined ? { name, email, phone } : { name, email };
}

export function normalizeTenant(raw: Record<string, unknown>): NormalizedTenant {
  const mapped = mapFields(raw, TENANT_FIELD_MAP);
  requireFields(mapped, ["companyName", "tenantId"], "normalizeTenant");
  const primaryContact = normalizeTenantContact(raw, mapped);
  const now = nowIso();
  const entity: NormalizedTenant = withTimestamps(
    {
      entityId: asString(mapped["entityId"]) ?? newEntityId("tenant"),
      tenantId: asString(mapped["tenantId"])!,
      companyName: asString(mapped["companyName"])!,
      tier: coerceEnum<TenantTier>(mapped["tier"], TENANT_TIERS, "starter"),
      primaryContact,
      timezone: asString(mapped["timezone"]) ?? "UTC",
      currency: coerceEnum<TenantCurrency>(mapped["currency"], TENANT_CURRENCIES, "USD"),
      status: coerceEnum<TenantStatus>(mapped["status"], TENANT_STATUSES, "active"),
      schemaVersion: NORMALIZATION_SCHEMA_VERSION,
      ...(asString(mapped["industry"]) !== undefined ? { industry: asString(mapped["industry"])! } : {}),
      ...(asString(mapped["billingEmail"]) !== undefined
        ? { billingEmail: asString(mapped["billingEmail"])! }
        : {}),
      ...(asString(mapped["createdAt"]) !== undefined ? { createdAt: asString(mapped["createdAt"])! } : {}),
      ...(asString(mapped["updatedAt"]) !== undefined ? { updatedAt: asString(mapped["updatedAt"])! } : {}),
    },
    now,
  );
  return entity;
}

// ── Contact ───────────────────────────────────────────────────────────────

const CONTACT_FIELD_MAP: FieldMap = {
  entityId: ["entityId"],
  tenantId: ["tenantId", "tenant_id"],
  firstName: ["firstName", "first_name", "given_name"],
  lastName: ["lastName", "last_name", "family_name", "surname"],
  email: ["email", "email_address"],
  phone: ["phone", "phone_number"],
  company: ["company", "organization"],
  title: ["title", "job_title"],
  source: ["source"],
  tags: ["tags"],
  status: ["status"],
  createdAt: ["createdAt", "created_at"],
  updatedAt: ["updatedAt", "updated_at"],
};

export function normalizeContact(raw: Record<string, unknown>): NormalizedContact {
  const mapped = mapFields(raw, CONTACT_FIELD_MAP);
  requireFields(mapped, ["firstName", "lastName", "email"], "normalizeContact");
  const now = nowIso();
  return withTimestamps(
    {
      entityId: asString(mapped["entityId"]) ?? newEntityId("contact"),
      firstName: asString(mapped["firstName"])!,
      lastName: asString(mapped["lastName"])!,
      email: asString(mapped["email"])!,
      source: coerceEnum<ContactSource>(mapped["source"], CONTACT_SOURCES, "manual"),
      tags: coerceStringArray(mapped["tags"]),
      status: coerceEnum<ContactStatus>(mapped["status"], CONTACT_STATUSES, "active"),
      schemaVersion: NORMALIZATION_SCHEMA_VERSION,
      ...(asString(mapped["tenantId"]) !== undefined ? { tenantId: asString(mapped["tenantId"])! } : {}),
      ...(asString(mapped["phone"]) !== undefined ? { phone: asString(mapped["phone"])! } : {}),
      ...(asString(mapped["company"]) !== undefined ? { company: asString(mapped["company"])! } : {}),
      ...(asString(mapped["title"]) !== undefined ? { title: asString(mapped["title"])! } : {}),
      ...(asString(mapped["createdAt"]) !== undefined ? { createdAt: asString(mapped["createdAt"])! } : {}),
      ...(asString(mapped["updatedAt"]) !== undefined ? { updatedAt: asString(mapped["updatedAt"])! } : {}),
    },
    now,
  );
}

// ── Lead ──────────────────────────────────────────────────────────────────

const LEAD_FIELD_MAP: FieldMap = {
  entityId: ["entityId"],
  tenantId: ["tenantId", "tenant_id"],
  contactId: ["contactId", "contact_id"],
  firstName: ["firstName", "first_name"],
  lastName: ["lastName", "last_name"],
  email: ["email"],
  company: ["company", "organization"],
  source: ["source"],
  score: ["score", "leadScore", "lead_score"],
  stage: ["stage", "status"],
  estimatedValue: ["estimatedValue", "estimated_value", "value"],
  currency: ["currency"],
  assignedTo: ["assignedTo", "assigned_to", "owner"],
  notes: ["notes"],
  createdAt: ["createdAt", "created_at"],
  updatedAt: ["updatedAt", "updated_at"],
};

function clampScore(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function normalizeLead(raw: Record<string, unknown>): NormalizedLead {
  const mapped = mapFields(raw, LEAD_FIELD_MAP);
  requireFields(mapped, ["firstName", "lastName", "email"], "normalizeLead");
  const score = clampScore(coerceNumber(mapped["score"]));
  const estimatedValue = coerceNumber(mapped["estimatedValue"]);
  const now = nowIso();
  return withTimestamps(
    {
      entityId: asString(mapped["entityId"]) ?? newEntityId("lead"),
      firstName: asString(mapped["firstName"])!,
      lastName: asString(mapped["lastName"])!,
      email: asString(mapped["email"])!,
      source: coerceEnum<LeadSource>(mapped["source"], LEAD_SOURCES, "unknown"),
      stage: coerceEnum<LeadStage>(mapped["stage"], LEAD_STAGES, "new"),
      schemaVersion: NORMALIZATION_SCHEMA_VERSION,
      ...(asString(mapped["tenantId"]) !== undefined ? { tenantId: asString(mapped["tenantId"])! } : {}),
      ...(asString(mapped["contactId"]) !== undefined ? { contactId: asString(mapped["contactId"])! } : {}),
      ...(asString(mapped["company"]) !== undefined ? { company: asString(mapped["company"])! } : {}),
      ...(score !== undefined ? { score } : {}),
      ...(estimatedValue !== undefined ? { estimatedValue } : {}),
      ...(mapped["currency"] !== undefined
        ? { currency: coerceEnum<TenantCurrency>(mapped["currency"], TENANT_CURRENCIES, "USD") }
        : {}),
      ...(asString(mapped["assignedTo"]) !== undefined
        ? { assignedTo: asString(mapped["assignedTo"])! }
        : {}),
      ...(asString(mapped["notes"]) !== undefined ? { notes: asString(mapped["notes"])! } : {}),
      ...(asString(mapped["createdAt"]) !== undefined ? { createdAt: asString(mapped["createdAt"])! } : {}),
      ...(asString(mapped["updatedAt"]) !== undefined ? { updatedAt: asString(mapped["updatedAt"])! } : {}),
    },
    now,
  );
}

// ── Offer ─────────────────────────────────────────────────────────────────

const OFFER_FIELD_MAP: FieldMap = {
  entityId: ["entityId"],
  tenantId: ["tenantId", "tenant_id"],
  title: ["title", "name"],
  type: ["type", "offerType", "offer_type"],
  tier: ["tier"],
  price: ["price", "amount"],
  currency: ["currency"],
  billingCycle: ["billingCycle", "billing_cycle"],
  deliverables: ["deliverables"],
  timeline: ["timeline"],
  scope: ["scope"],
  guarantees: ["guarantees"],
  status: ["status"],
  governanceStatus: ["governanceStatus", "governance_status"],
  mapScore: ["mapScore", "map_score"],
  createdAt: ["createdAt", "created_at"],
  updatedAt: ["updatedAt", "updated_at"],
};

export function normalizeOffer(raw: Record<string, unknown>): NormalizedOffer {
  const mapped = mapFields(raw, OFFER_FIELD_MAP);
  requireFields(mapped, ["title", "price"], "normalizeOffer");
  const price = coerceNumber(mapped["price"]);
  if (price === undefined || price <= 0) {
    throw new Error("normalizeOffer: price must be a positive number");
  }
  const mapScore = coerceNumber(mapped["mapScore"]);
  const now = nowIso();
  return withTimestamps(
    {
      entityId: asString(mapped["entityId"]) ?? newEntityId("offer"),
      title: asString(mapped["title"])!,
      type: coerceEnum<OfferType>(mapped["type"], OFFER_TYPES, "consulting"),
      tier: coerceEnum<OfferTier>(mapped["tier"], OFFER_TIERS, "custom"),
      price,
      currency: coerceEnum<TenantCurrency>(mapped["currency"], TENANT_CURRENCIES, "USD"),
      deliverables: coerceStringArray(mapped["deliverables"]),
      guarantees: coerceStringArray(mapped["guarantees"]),
      status: coerceEnum<OfferStatus>(mapped["status"], OFFER_STATUSES, "draft"),
      schemaVersion: NORMALIZATION_SCHEMA_VERSION,
      ...(asString(mapped["tenantId"]) !== undefined ? { tenantId: asString(mapped["tenantId"])! } : {}),
      ...(mapped["billingCycle"] !== undefined
        ? {
            billingCycle: coerceEnum<OfferBillingCycle>(
              mapped["billingCycle"],
              OFFER_BILLING,
              "once",
            ),
          }
        : {}),
      ...(asString(mapped["timeline"]) !== undefined
        ? { timeline: asString(mapped["timeline"])! }
        : {}),
      ...(asString(mapped["scope"]) !== undefined ? { scope: asString(mapped["scope"])! } : {}),
      ...(mapped["governanceStatus"] !== undefined
        ? {
            governanceStatus: coerceEnum<GovernanceStatus>(
              mapped["governanceStatus"],
              GOVERNANCE_STATUSES,
              "pending",
            ),
          }
        : {}),
      ...(mapScore !== undefined ? { mapScore } : {}),
      ...(asString(mapped["createdAt"]) !== undefined
        ? { createdAt: asString(mapped["createdAt"])! }
        : {}),
      ...(asString(mapped["updatedAt"]) !== undefined
        ? { updatedAt: asString(mapped["updatedAt"])! }
        : {}),
    },
    now,
  );
}

// ── Asset ─────────────────────────────────────────────────────────────────

const ASSET_FIELD_MAP: FieldMap = {
  entityId: ["entityId"],
  tenantId: ["tenantId", "tenant_id"],
  title: ["title", "name"],
  type: ["type", "assetType", "asset_type"],
  format: ["format"],
  contentHash: ["contentHash", "content_hash"],
  sourceUri: ["sourceUri", "source_uri", "sourceUrl", "source_url"],
  publishedUri: ["publishedUri", "published_uri", "publishedUrl", "published_url"],
  status: ["status"],
  tags: ["tags"],
  wordCount: ["wordCount", "word_count"],
  channel: ["channel"],
  createdAt: ["createdAt", "created_at"],
  updatedAt: ["updatedAt", "updated_at"],
};

export function normalizeAsset(raw: Record<string, unknown>): NormalizedAsset {
  const mapped = mapFields(raw, ASSET_FIELD_MAP);
  requireFields(mapped, ["title"], "normalizeAsset");
  const wordCount = coerceNumber(mapped["wordCount"]);
  const now = nowIso();
  return withTimestamps(
    {
      entityId: asString(mapped["entityId"]) ?? newEntityId("asset"),
      title: asString(mapped["title"])!,
      type: coerceEnum<AssetType>(mapped["type"], ASSET_TYPES, "other"),
      format: coerceEnum<AssetFormat>(mapped["format"], ASSET_FORMATS, "other"),
      status: coerceEnum<AssetStatus>(mapped["status"], ASSET_STATUSES, "draft"),
      tags: coerceStringArray(mapped["tags"]),
      schemaVersion: NORMALIZATION_SCHEMA_VERSION,
      ...(asString(mapped["tenantId"]) !== undefined ? { tenantId: asString(mapped["tenantId"])! } : {}),
      ...(asString(mapped["contentHash"]) !== undefined
        ? { contentHash: asString(mapped["contentHash"])! }
        : {}),
      ...(asString(mapped["sourceUri"]) !== undefined
        ? { sourceUri: asString(mapped["sourceUri"])! }
        : {}),
      ...(asString(mapped["publishedUri"]) !== undefined
        ? { publishedUri: asString(mapped["publishedUri"])! }
        : {}),
      ...(wordCount !== undefined ? { wordCount } : {}),
      ...(asString(mapped["channel"]) !== undefined
        ? { channel: asString(mapped["channel"])! }
        : {}),
      ...(asString(mapped["createdAt"]) !== undefined
        ? { createdAt: asString(mapped["createdAt"])! }
        : {}),
      ...(asString(mapped["updatedAt"]) !== undefined
        ? { updatedAt: asString(mapped["updatedAt"])! }
        : {}),
    },
    now,
  );
}

// ── Workflow ──────────────────────────────────────────────────────────────

const WORKFLOW_FIELD_MAP: FieldMap = {
  entityId: ["entityId"],
  tenantId: ["tenantId", "tenant_id"],
  name: ["name", "title"],
  type: ["type", "workflowType"],
  executionModel: ["executionModel", "execution_model"],
  steps: ["steps"],
  status: ["status"],
  sopValidated: ["sopValidated", "sop_validated"],
  governanceStatus: ["governanceStatus", "governance_status"],
  createdAt: ["createdAt", "created_at"],
  updatedAt: ["updatedAt", "updated_at"],
};

function normalizeWorkflowSteps(raw: unknown): WorkflowStep[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkflowStep[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) return;
    const r = entry as Record<string, unknown>;
    const stepId = asString(r["stepId"] ?? r["id"]) ?? `step_${index + 1}`;
    const name = asString(r["name"]) ?? stepId;
    const type = asString(r["type"]) ?? "task";
    const orderRaw = coerceNumber(r["order"]);
    const order = orderRaw !== undefined ? orderRaw : index + 1;
    const required = coerceBoolean(r["required"], true);
    out.push({ stepId, name, type, order, required });
  });
  return out;
}

export function normalizeWorkflow(raw: Record<string, unknown>): NormalizedWorkflow {
  const mapped = mapFields(raw, WORKFLOW_FIELD_MAP);
  requireFields(mapped, ["name", "type"], "normalizeWorkflow");
  const executionModelRaw = mapped["executionModel"];
  if (
    typeof executionModelRaw === "string" &&
    !WORKFLOW_EXECUTION_MODELS.includes(executionModelRaw as WorkflowExecutionModel)
  ) {
    throw new Error(
      `normalizeWorkflow: invalid executionModel "${executionModelRaw}" (allowed: ${WORKFLOW_EXECUTION_MODELS.join(", ")})`,
    );
  }
  const now = nowIso();
  return withTimestamps(
    {
      entityId: asString(mapped["entityId"]) ?? newEntityId("workflow"),
      name: asString(mapped["name"])!,
      type: asString(mapped["type"])!,
      executionModel: coerceEnum<WorkflowExecutionModel>(
        mapped["executionModel"],
        WORKFLOW_EXECUTION_MODELS,
        "linear",
      ),
      steps: normalizeWorkflowSteps(mapped["steps"]),
      status: coerceEnum<WorkflowStatus>(mapped["status"], WORKFLOW_STATUSES, "draft"),
      sopValidated: coerceBoolean(mapped["sopValidated"], false),
      schemaVersion: NORMALIZATION_SCHEMA_VERSION,
      ...(asString(mapped["tenantId"]) !== undefined ? { tenantId: asString(mapped["tenantId"])! } : {}),
      ...(mapped["governanceStatus"] !== undefined
        ? {
            governanceStatus: coerceEnum<GovernanceStatus>(
              mapped["governanceStatus"],
              GOVERNANCE_STATUSES,
              "pending",
            ),
          }
        : {}),
      ...(asString(mapped["createdAt"]) !== undefined
        ? { createdAt: asString(mapped["createdAt"])! }
        : {}),
      ...(asString(mapped["updatedAt"]) !== undefined
        ? { updatedAt: asString(mapped["updatedAt"])! }
        : {}),
    },
    now,
  );
}

// ── Knowledge Document ────────────────────────────────────────────────────

const KNOWLEDGE_FIELD_MAP: FieldMap = {
  entityId: ["entityId"],
  tenantId: ["tenantId", "tenant_id"],
  title: ["title", "name"],
  namespace: ["namespace", "ns"],
  sourceType: ["sourceType", "source_type"],
  contentHash: ["contentHash", "content_hash"],
  chunkCount: ["chunkCount", "chunk_count"],
  version: ["version"],
  tags: ["tags"],
  status: ["status"],
  retrievalDocumentId: ["retrievalDocumentId", "retrieval_document_id", "documentId", "document_id"],
  createdAt: ["createdAt", "created_at"],
  updatedAt: ["updatedAt", "updated_at"],
};

export function normalizeKnowledgeDocument(
  raw: Record<string, unknown>,
): NormalizedKnowledgeDocument {
  const mapped = mapFields(raw, KNOWLEDGE_FIELD_MAP);
  requireFields(mapped, ["title", "namespace"], "normalizeKnowledgeDocument");
  const chunkCount = coerceNumber(mapped["chunkCount"]);
  const now = nowIso();
  return withTimestamps(
    {
      entityId: asString(mapped["entityId"]) ?? newEntityId("knowledge"),
      title: asString(mapped["title"])!,
      namespace: asString(mapped["namespace"])!,
      sourceType: coerceEnum<KnowledgeSourceType>(
        mapped["sourceType"],
        KNOWLEDGE_SOURCE_TYPES,
        "manual",
      ),
      tags: coerceStringArray(mapped["tags"]),
      status: coerceEnum<KnowledgeStatus>(mapped["status"], KNOWLEDGE_STATUSES, "ingested"),
      schemaVersion: NORMALIZATION_SCHEMA_VERSION,
      ...(asString(mapped["tenantId"]) !== undefined ? { tenantId: asString(mapped["tenantId"])! } : {}),
      ...(asString(mapped["contentHash"]) !== undefined
        ? { contentHash: asString(mapped["contentHash"])! }
        : {}),
      ...(chunkCount !== undefined ? { chunkCount } : {}),
      ...(asString(mapped["version"]) !== undefined
        ? { version: asString(mapped["version"])! }
        : {}),
      ...(asString(mapped["retrievalDocumentId"]) !== undefined
        ? { retrievalDocumentId: asString(mapped["retrievalDocumentId"])! }
        : {}),
      ...(asString(mapped["createdAt"]) !== undefined
        ? { createdAt: asString(mapped["createdAt"])! }
        : {}),
      ...(asString(mapped["updatedAt"]) !== undefined
        ? { updatedAt: asString(mapped["updatedAt"])! }
        : {}),
    },
    now,
  );
}
