import type { NormalizedLead } from "../normalization/normalization-types.js";
import type { DiagnosticResult } from "../apps/diagnostic-engine/diagnostic-engine-types.js";
import type { OfferEngineResult } from "../apps/offer-engine/offer-engine-types.js";
import type { ContentBriefResult } from "../apps/content-engine/content-engine-types.js";

export interface LeadToOfferInput {
  airtableRecordId?: string;
  airtableBaseId?: string;
  airtableTableId?: string;
  leadData?: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    source?: string;
  };
  offerType?: "audit" | "retainer" | "consulting";
  offerTitle?: string;
  tenantId?: string;
  createdBy?: string;
  environment?: string;
}

export interface LeadToOfferStages {
  leadFetched?: boolean;
  leadNormalized?: boolean;
  diagnosed?: boolean;
  mapScored?: boolean;
  offerCreated?: boolean;
  governancePassed?: boolean;
  contentBriefCreated?: boolean;
  attributionEmitted?: boolean;
}

export interface LeadToOfferResult {
  ok: boolean;
  dagRunId: string;
  dagStatus: string;
  stages: LeadToOfferStages;
  lead?: NormalizedLead;
  diagnosis?: DiagnosticResult;
  offer?: OfferEngineResult;
  contentBrief?: ContentBriefResult;
  errors?: string[];
  durationMs: number;
}
