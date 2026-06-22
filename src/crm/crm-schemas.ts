import { z } from "zod";

import type { CrmContact, CrmLead, CrmOpportunity } from "./crm-types.js";

export const CRM_SCHEMA_VERSION = "1.0.0";

const ISO_DATE_STRING = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected ISO date string",
});

const TenantScopedRecordZ = z.object({
  tenantId: z.string().min(1),
  createdAt: ISO_DATE_STRING,
  updatedAt: ISO_DATE_STRING,
});

export const CrmContactSchema = TenantScopedRecordZ.extend({
  contactId: z.string().min(1),
  companyId: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  lifecycleStage: z.enum(["new", "lead", "qualified", "customer", "inactive"]),
  ownerUserId: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  consentStatus: z.enum(["unknown", "opted_in", "opted_out"]).optional(),
});

export const CrmLeadSchema = TenantScopedRecordZ.extend({
  leadId: z.string().min(1),
  contactId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  status: z.enum(["new", "working", "qualified", "unqualified", "converted", "lost"]),
  source: z.string().min(1).optional(),
  score: z.number().min(0).max(100).optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  ownerUserId: z.string().min(1).optional(),
});

export const CrmOpportunitySchema = TenantScopedRecordZ.extend({
  opportunityId: z.string().min(1),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  contactId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  expectedCloseAt: ISO_DATE_STRING.optional(),
  status: z.enum(["open", "won", "lost"]),
});

export const CrmStoreSchema = z.object({
  schemaVersion: z.literal(CRM_SCHEMA_VERSION),
  contacts: z.array(CrmContactSchema),
  leads: z.array(CrmLeadSchema),
  opportunities: z.array(CrmOpportunitySchema),
  updatedAt: ISO_DATE_STRING,
});

export interface CrmSchemaValidationResult {
  valid: boolean;
  errors: string[];
}

function formatErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`);
}

function validate(schema: z.ZodTypeAny, input: unknown): CrmSchemaValidationResult {
  const result = schema.safeParse(input);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: formatErrors(result.error) };
}

export function validateCrmContact(input: unknown): CrmSchemaValidationResult {
  return validate(CrmContactSchema, input);
}

export function validateCrmLead(input: unknown): CrmSchemaValidationResult {
  return validate(CrmLeadSchema, input);
}

export function validateCrmOpportunity(input: unknown): CrmSchemaValidationResult {
  return validate(CrmOpportunitySchema, input);
}

export function parseCrmContact(input: unknown): CrmContact {
  return CrmContactSchema.parse(input) as CrmContact;
}

export function parseCrmLead(input: unknown): CrmLead {
  return CrmLeadSchema.parse(input) as CrmLead;
}

export function parseCrmOpportunity(input: unknown): CrmOpportunity {
  return CrmOpportunitySchema.parse(input) as CrmOpportunity;
}
