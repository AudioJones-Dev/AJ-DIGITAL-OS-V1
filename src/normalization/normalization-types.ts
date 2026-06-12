/**
 * L5 — Data Normalization Layer types.
 *
 * Standardized, versioned entity objects shared across Application Layer
 * modules, Connector adapters, and Workflow modules.
 */

export const NORMALIZATION_SCHEMA_VERSION = "1.0.0";

export type NormalizedEntityType =
  | "tenant"
  | "contact"
  | "lead"
  | "offer"
  | "asset"
  | "workflow"
  | "knowledge_document";

export const NORMALIZED_ENTITY_TYPES: readonly NormalizedEntityType[] = [
  "tenant",
  "contact",
  "lead",
  "offer",
  "asset",
  "workflow",
  "knowledge_document",
] as const;

// ── Tenant ────────────────────────────────────────────────────────────────

export type TenantTier = "starter" | "growth" | "scale" | "enterprise";
export type TenantCurrency = "USD" | "GBP" | "EUR" | "CAD" | "AUD";
export type TenantStatus = "active" | "trial" | "suspended" | "churned";

export interface NormalizedTenantContact {
  name: string;
  email: string;
  phone?: string;
}

export interface NormalizedTenant {
  entityId: string;
  tenantId: string;
  companyName: string;
  industry?: string;
  tier: TenantTier;
  primaryContact: NormalizedTenantContact;
  billingEmail?: string;
  timezone: string;
  currency: TenantCurrency;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

// ── Contact ───────────────────────────────────────────────────────────────

export type ContactSource = "manual" | "form" | "crm" | "import" | "webhook" | "agent";
export type ContactStatus = "active" | "unsubscribed" | "bounced" | "unknown";

export interface NormalizedContact {
  entityId: string;
  tenantId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source: ContactSource;
  tags: string[];
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

// ── Lead ──────────────────────────────────────────────────────────────────

export type LeadSource = "organic" | "paid" | "referral" | "outbound" | "event" | "unknown";
export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface NormalizedLead {
  entityId: string;
  tenantId?: string;
  contactId?: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  source: LeadSource;
  score?: number;
  stage: LeadStage;
  estimatedValue?: number;
  currency?: TenantCurrency;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

// ── Offer ─────────────────────────────────────────────────────────────────

export type OfferType =
  | "retainer"
  | "project"
  | "audit"
  | "workshop"
  | "consulting"
  | "product";
export type OfferTier = "starter" | "growth" | "scale" | "enterprise" | "custom";
export type OfferBillingCycle = "once" | "monthly" | "quarterly" | "annually";
export type OfferStatus = "draft" | "active" | "archived" | "deprecated";
export type GovernanceStatus = "pending" | "approved" | "rejected";

export interface NormalizedOffer {
  entityId: string;
  tenantId?: string;
  title: string;
  type: OfferType;
  tier: OfferTier;
  price: number;
  currency: TenantCurrency;
  billingCycle?: OfferBillingCycle;
  deliverables: string[];
  timeline?: string;
  scope?: string;
  guarantees: string[];
  status: OfferStatus;
  governanceStatus?: GovernanceStatus;
  mapScore?: number;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

// ── Asset ─────────────────────────────────────────────────────────────────

export type AssetType =
  | "blog_post"
  | "social_post"
  | "email"
  | "landing_page"
  | "video_script"
  | "case_study"
  | "whitepaper"
  | "report"
  | "template"
  | "image"
  | "other";

export type AssetFormat =
  | "markdown"
  | "html"
  | "pdf"
  | "docx"
  | "json"
  | "image"
  | "video"
  | "audio"
  | "other";

export type AssetStatus = "draft" | "review" | "approved" | "published" | "archived";

export interface NormalizedAsset {
  entityId: string;
  tenantId?: string;
  title: string;
  type: AssetType;
  format: AssetFormat;
  contentHash?: string;
  sourceUri?: string;
  publishedUri?: string;
  status: AssetStatus;
  tags: string[];
  wordCount?: number;
  channel?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

// ── Workflow ──────────────────────────────────────────────────────────────

export type WorkflowExecutionModel = "linear" | "dag";
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export interface WorkflowStep {
  stepId: string;
  name: string;
  type: string;
  order: number;
  required: boolean;
}

export interface NormalizedWorkflow {
  entityId: string;
  tenantId?: string;
  name: string;
  type: string;
  executionModel: WorkflowExecutionModel;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  sopValidated: boolean;
  governanceStatus?: GovernanceStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

// ── Knowledge Document ────────────────────────────────────────────────────

export type KnowledgeSourceType = "markdown" | "text" | "json" | "jsonl" | "url" | "manual";
export type KnowledgeStatus = "ingested" | "indexing" | "indexed" | "stale" | "archived";

export interface NormalizedKnowledgeDocument {
  entityId: string;
  tenantId?: string;
  title: string;
  namespace: string;
  sourceType: KnowledgeSourceType;
  contentHash?: string;
  chunkCount?: number;
  version?: string;
  tags: string[];
  status: KnowledgeStatus;
  retrievalDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

// ── Discriminated map ─────────────────────────────────────────────────────

export interface NormalizedEntityMap {
  tenant: NormalizedTenant;
  contact: NormalizedContact;
  lead: NormalizedLead;
  offer: NormalizedOffer;
  asset: NormalizedAsset;
  workflow: NormalizedWorkflow;
  knowledge_document: NormalizedKnowledgeDocument;
}

export type NormalizedEntity = NormalizedEntityMap[NormalizedEntityType];

// ── Audit ─────────────────────────────────────────────────────────────────

export type NormalizationAuditEventType =
  | "entity_normalized"
  | "entity_normalization_failed"
  | "entity_updated";

export interface NormalizationAuditEvent {
  eventId: string;
  eventType: NormalizationAuditEventType;
  entityType: NormalizedEntityType;
  entityId?: string;
  tenantId?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
