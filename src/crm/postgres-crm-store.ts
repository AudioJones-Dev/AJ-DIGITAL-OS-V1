import type { CrmTenantDbClient } from "../db/crm-tenant-context.js";
import { withTenantContext } from "../db/crm-tenant-context.js";
import type {
  CrmContact,
  CrmLead,
  CrmOpportunity,
  CrmTenantContext,
  CrmTenantScopedRecord,
} from "./crm-types.js";
import {
  validateCrmContact,
  validateCrmLead,
  validateCrmOpportunity,
  type CrmSchemaValidationResult,
} from "./crm-schemas.js";
import { assertTenantScopedRecord } from "./tenant-context.js";
import {
  CrmDuplicateRecordError,
  CrmStoreValidationError,
} from "./persistent-crm-store.js";

export interface PostgresCrmClient extends CrmTenantDbClient {
  release?(): void;
}

export interface PostgresCrmPool {
  connect(): Promise<PostgresCrmClient>;
}

type CrmRecordKind = "contact" | "lead" | "opportunity";

interface ContactRow {
  tenant_id: string;
  contact_id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  lifecycle_stage: CrmContact["lifecycleStage"];
  owner_user_id: string | null;
  source: string | null;
  consent_status: CrmContact["consentStatus"] | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface LeadRow {
  tenant_id: string;
  lead_id: string;
  contact_id: string | null;
  company_id: string | null;
  status: CrmLead["status"];
  source: string | null;
  score: number | null;
  urgency: CrmLead["urgency"] | null;
  owner_user_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface OpportunityRow {
  tenant_id: string;
  opportunity_id: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string | null;
  company_id: string | null;
  value: string | number | null;
  currency: string | null;
  expected_close_at: string | Date | null;
  status: CrmOpportunity["status"];
  created_at: string | Date;
  updated_at: string | Date;
}

function nowIso(): string {
  return new Date().toISOString();
}

function assertValid(result: CrmSchemaValidationResult): void {
  if (!result.valid) {
    throw new CrmStoreValidationError(result.errors);
  }
}

function assertPrimaryIdUnchanged<TRecord extends CrmTenantScopedRecord>(
  idField: Extract<keyof TRecord, string>,
  id: string,
  patch: Partial<TRecord>,
): void {
  const patchedId = patch[idField];
  if (patchedId !== undefined && patchedId !== id) {
    throw new CrmStoreValidationError([`${idField}: primary id cannot be changed`]);
  }
}

function requireId(id: string, idField: string): void {
  if (!id.trim()) {
    throw new CrmStoreValidationError([`${idField}: id is required`]);
  }
}

function dateToIso(value: string | Date | null): string | undefined {
  if (value === null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function requiredDateToIso(value: string | Date): string {
  return dateToIso(value)!;
}

function numberOrUndefined(value: string | number | null): number | undefined {
  if (value === null) return undefined;
  return typeof value === "number" ? value : Number(value);
}

function mapContact(row: ContactRow): CrmContact {
  return {
    tenantId: row.tenant_id,
    contactId: row.contact_id,
    ...(row.company_id !== null ? { companyId: row.company_id } : {}),
    ...(row.first_name !== null ? { firstName: row.first_name } : {}),
    ...(row.last_name !== null ? { lastName: row.last_name } : {}),
    ...(row.email !== null ? { email: row.email } : {}),
    ...(row.phone !== null ? { phone: row.phone } : {}),
    lifecycleStage: row.lifecycle_stage,
    ...(row.owner_user_id !== null ? { ownerUserId: row.owner_user_id } : {}),
    ...(row.source !== null ? { source: row.source } : {}),
    ...(row.consent_status !== null ? { consentStatus: row.consent_status } : {}),
    createdAt: requiredDateToIso(row.created_at),
    updatedAt: requiredDateToIso(row.updated_at),
  };
}

function mapLead(row: LeadRow): CrmLead {
  return {
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    ...(row.contact_id !== null ? { contactId: row.contact_id } : {}),
    ...(row.company_id !== null ? { companyId: row.company_id } : {}),
    status: row.status,
    ...(row.source !== null ? { source: row.source } : {}),
    ...(row.score !== null ? { score: row.score } : {}),
    ...(row.urgency !== null ? { urgency: row.urgency } : {}),
    ...(row.owner_user_id !== null ? { ownerUserId: row.owner_user_id } : {}),
    createdAt: requiredDateToIso(row.created_at),
    updatedAt: requiredDateToIso(row.updated_at),
  };
}

function mapOpportunity(row: OpportunityRow): CrmOpportunity {
  return {
    tenantId: row.tenant_id,
    opportunityId: row.opportunity_id,
    pipelineId: row.pipeline_id,
    stageId: row.stage_id,
    ...(row.contact_id !== null ? { contactId: row.contact_id } : {}),
    ...(row.company_id !== null ? { companyId: row.company_id } : {}),
    ...(row.value !== null ? { value: numberOrUndefined(row.value) } : {}),
    ...(row.currency !== null ? { currency: row.currency } : {}),
    ...(row.expected_close_at !== null ? { expectedCloseAt: dateToIso(row.expected_close_at) } : {}),
    status: row.status,
    createdAt: requiredDateToIso(row.created_at),
    updatedAt: requiredDateToIso(row.updated_at),
  };
}

export class PostgresCrmStore {
  constructor(private readonly pool: PostgresCrmPool) {}

  async createContact(context: CrmTenantContext, contact: CrmContact): Promise<CrmContact> {
    assertValid(validateCrmContact(contact));
    assertTenantScopedRecord(context, contact);
    requireId(contact.contactId, "contactId");

    return this.run(context, async (client) => {
      await this.assertUnique(client, "contact", "crm_contacts", "contact_id", contact.contactId, context.tenantId);
      const result = await client.query<ContactRow>(
        `insert into public.crm_contacts (
          tenant_id, contact_id, company_id, first_name, last_name, email, phone,
          lifecycle_stage, owner_user_id, source, consent_status, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        returning ${CONTACT_COLUMNS}`,
        [
          contact.tenantId,
          contact.contactId,
          contact.companyId ?? null,
          contact.firstName ?? null,
          contact.lastName ?? null,
          contact.email ?? null,
          contact.phone ?? null,
          contact.lifecycleStage,
          contact.ownerUserId ?? null,
          contact.source ?? null,
          contact.consentStatus ?? null,
          contact.createdAt,
          contact.updatedAt,
        ],
      );
      return mapContact(result.rows[0]!);
    });
  }

  async getContact(context: CrmTenantContext, contactId: string): Promise<CrmContact | null> {
    return this.run(context, async (client) => {
      const result = await client.query<ContactRow>(
        `select ${CONTACT_COLUMNS} from public.crm_contacts
         where tenant_id = $1 and contact_id = $2 limit 1`,
        [context.tenantId, contactId],
      );
      return result.rows[0] ? mapContact(result.rows[0]) : null;
    });
  }

  async listContacts(context: CrmTenantContext): Promise<CrmContact[]> {
    return this.run(context, async (client) => {
      const result = await client.query<ContactRow>(
        `select ${CONTACT_COLUMNS} from public.crm_contacts
         where tenant_id = $1 order by created_at asc, contact_id asc`,
        [context.tenantId],
      );
      return result.rows.map(mapContact);
    });
  }

  async updateContact(
    context: CrmTenantContext,
    contactId: string,
    patch: Partial<CrmContact> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmContact> {
    assertTenantScopedRecord(context, patch);
    assertPrimaryIdUnchanged<CrmContact>("contactId", contactId, patch);

    return this.run(context, async (client) => {
      const existing = await this.getRecordInTransaction(client, "crm_contacts", "contact_id", contactId, mapContact);
      const updated: CrmContact = {
        ...existing,
        ...patch,
        tenantId: context.tenantId,
        updatedAt: patch.updatedAt ?? nowIso(),
      };
      assertValid(validateCrmContact(updated));
      const result = await client.query<ContactRow>(
        `update public.crm_contacts set
          company_id = $3, first_name = $4, last_name = $5, email = $6, phone = $7,
          lifecycle_stage = $8, owner_user_id = $9, source = $10, consent_status = $11,
          created_at = $12, updated_at = $13
         where tenant_id = $1 and contact_id = $2
         returning ${CONTACT_COLUMNS}`,
        [
          context.tenantId,
          contactId,
          updated.companyId ?? null,
          updated.firstName ?? null,
          updated.lastName ?? null,
          updated.email ?? null,
          updated.phone ?? null,
          updated.lifecycleStage,
          updated.ownerUserId ?? null,
          updated.source ?? null,
          updated.consentStatus ?? null,
          updated.createdAt,
          updated.updatedAt,
        ],
      );
      return mapContact(result.rows[0]!);
    });
  }

  async createLead(context: CrmTenantContext, lead: CrmLead): Promise<CrmLead> {
    assertValid(validateCrmLead(lead));
    assertTenantScopedRecord(context, lead);
    requireId(lead.leadId, "leadId");

    return this.run(context, async (client) => {
      await this.assertUnique(client, "lead", "crm_leads", "lead_id", lead.leadId, context.tenantId);
      const result = await client.query<LeadRow>(
        `insert into public.crm_leads (
          tenant_id, lead_id, contact_id, company_id, status, source, score,
          urgency, owner_user_id, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        returning ${LEAD_COLUMNS}`,
        [
          lead.tenantId,
          lead.leadId,
          lead.contactId ?? null,
          lead.companyId ?? null,
          lead.status,
          lead.source ?? null,
          lead.score ?? null,
          lead.urgency ?? null,
          lead.ownerUserId ?? null,
          lead.createdAt,
          lead.updatedAt,
        ],
      );
      return mapLead(result.rows[0]!);
    });
  }

  async getLead(context: CrmTenantContext, leadId: string): Promise<CrmLead | null> {
    return this.run(context, async (client) => {
      const result = await client.query<LeadRow>(
        `select ${LEAD_COLUMNS} from public.crm_leads
         where tenant_id = $1 and lead_id = $2 limit 1`,
        [context.tenantId, leadId],
      );
      return result.rows[0] ? mapLead(result.rows[0]) : null;
    });
  }

  async listLeads(context: CrmTenantContext): Promise<CrmLead[]> {
    return this.run(context, async (client) => {
      const result = await client.query<LeadRow>(
        `select ${LEAD_COLUMNS} from public.crm_leads
         where tenant_id = $1 order by created_at asc, lead_id asc`,
        [context.tenantId],
      );
      return result.rows.map(mapLead);
    });
  }

  async updateLead(
    context: CrmTenantContext,
    leadId: string,
    patch: Partial<CrmLead> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmLead> {
    assertTenantScopedRecord(context, patch);
    assertPrimaryIdUnchanged<CrmLead>("leadId", leadId, patch);

    return this.run(context, async (client) => {
      const existing = await this.getRecordInTransaction(client, "crm_leads", "lead_id", leadId, mapLead);
      const updated: CrmLead = {
        ...existing,
        ...patch,
        tenantId: context.tenantId,
        updatedAt: patch.updatedAt ?? nowIso(),
      };
      assertValid(validateCrmLead(updated));
      const result = await client.query<LeadRow>(
        `update public.crm_leads set
          contact_id = $3, company_id = $4, status = $5, source = $6, score = $7,
          urgency = $8, owner_user_id = $9, created_at = $10, updated_at = $11
         where tenant_id = $1 and lead_id = $2
         returning ${LEAD_COLUMNS}`,
        [
          context.tenantId,
          leadId,
          updated.contactId ?? null,
          updated.companyId ?? null,
          updated.status,
          updated.source ?? null,
          updated.score ?? null,
          updated.urgency ?? null,
          updated.ownerUserId ?? null,
          updated.createdAt,
          updated.updatedAt,
        ],
      );
      return mapLead(result.rows[0]!);
    });
  }

  async createOpportunity(context: CrmTenantContext, opportunity: CrmOpportunity): Promise<CrmOpportunity> {
    assertValid(validateCrmOpportunity(opportunity));
    assertTenantScopedRecord(context, opportunity);
    requireId(opportunity.opportunityId, "opportunityId");

    return this.run(context, async (client) => {
      await this.assertUnique(
        client,
        "opportunity",
        "crm_opportunities",
        "opportunity_id",
        opportunity.opportunityId,
        context.tenantId,
      );
      const result = await client.query<OpportunityRow>(
        `insert into public.crm_opportunities (
          tenant_id, opportunity_id, pipeline_id, stage_id, contact_id, company_id,
          value, currency, expected_close_at, status, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        returning ${OPPORTUNITY_COLUMNS}`,
        [
          opportunity.tenantId,
          opportunity.opportunityId,
          opportunity.pipelineId,
          opportunity.stageId,
          opportunity.contactId ?? null,
          opportunity.companyId ?? null,
          opportunity.value ?? null,
          opportunity.currency ?? null,
          opportunity.expectedCloseAt ?? null,
          opportunity.status,
          opportunity.createdAt,
          opportunity.updatedAt,
        ],
      );
      return mapOpportunity(result.rows[0]!);
    });
  }

  async getOpportunity(context: CrmTenantContext, opportunityId: string): Promise<CrmOpportunity | null> {
    return this.run(context, async (client) => {
      const result = await client.query<OpportunityRow>(
        `select ${OPPORTUNITY_COLUMNS} from public.crm_opportunities
         where tenant_id = $1 and opportunity_id = $2 limit 1`,
        [context.tenantId, opportunityId],
      );
      return result.rows[0] ? mapOpportunity(result.rows[0]) : null;
    });
  }

  async listOpportunities(context: CrmTenantContext): Promise<CrmOpportunity[]> {
    return this.run(context, async (client) => {
      const result = await client.query<OpportunityRow>(
        `select ${OPPORTUNITY_COLUMNS} from public.crm_opportunities
         where tenant_id = $1 order by created_at asc, opportunity_id asc`,
        [context.tenantId],
      );
      return result.rows.map(mapOpportunity);
    });
  }

  async updateOpportunity(
    context: CrmTenantContext,
    opportunityId: string,
    patch: Partial<CrmOpportunity> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmOpportunity> {
    assertTenantScopedRecord(context, patch);
    assertPrimaryIdUnchanged<CrmOpportunity>("opportunityId", opportunityId, patch);

    return this.run(context, async (client) => {
      const existing = await this.getRecordInTransaction(
        client,
        "crm_opportunities",
        "opportunity_id",
        opportunityId,
        mapOpportunity,
      );
      const updated: CrmOpportunity = {
        ...existing,
        ...patch,
        tenantId: context.tenantId,
        updatedAt: patch.updatedAt ?? nowIso(),
      };
      assertValid(validateCrmOpportunity(updated));
      const result = await client.query<OpportunityRow>(
        `update public.crm_opportunities set
          pipeline_id = $3, stage_id = $4, contact_id = $5, company_id = $6,
          value = $7, currency = $8, expected_close_at = $9, status = $10,
          created_at = $11, updated_at = $12
         where tenant_id = $1 and opportunity_id = $2
         returning ${OPPORTUNITY_COLUMNS}`,
        [
          context.tenantId,
          opportunityId,
          updated.pipelineId,
          updated.stageId,
          updated.contactId ?? null,
          updated.companyId ?? null,
          updated.value ?? null,
          updated.currency ?? null,
          updated.expectedCloseAt ?? null,
          updated.status,
          updated.createdAt,
          updated.updatedAt,
        ],
      );
      return mapOpportunity(result.rows[0]!);
    });
  }

  private async run<T>(context: CrmTenantContext, fn: (client: CrmTenantDbClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await withTenantContext(client, context, fn);
    } finally {
      client.release?.();
    }
  }

  private async assertUnique(
    client: CrmTenantDbClient,
    recordType: CrmRecordKind,
    tableName: string,
    idColumn: string,
    id: string,
    tenantId: string,
  ): Promise<void> {
    const result = await client.query<{ found: number }>(
      `select 1 as found from public.${tableName} where tenant_id = $1 and ${idColumn} = $2 limit 1`,
      [tenantId, id],
    );
    if (result.rows.length > 0) {
      throw new CrmDuplicateRecordError(recordType, id, tenantId);
    }
  }

  private async getRecordInTransaction<T>(
    client: CrmTenantDbClient,
    tableName: string,
    idColumn: string,
    id: string,
    map: (row: never) => T,
  ): Promise<T> {
    const columns = columnsFor(tableName);
    const result = await client.query<never>(
      `select ${columns} from public.${tableName} where ${idColumn} = $1 limit 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error(`CRM record not found: ${id}`);
    }
    return map(row);
  }
}

const CONTACT_COLUMNS = [
  "tenant_id",
  "contact_id",
  "company_id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "lifecycle_stage",
  "owner_user_id",
  "source",
  "consent_status",
  "created_at",
  "updated_at",
].join(", ");

const LEAD_COLUMNS = [
  "tenant_id",
  "lead_id",
  "contact_id",
  "company_id",
  "status",
  "source",
  "score",
  "urgency",
  "owner_user_id",
  "created_at",
  "updated_at",
].join(", ");

const OPPORTUNITY_COLUMNS = [
  "tenant_id",
  "opportunity_id",
  "pipeline_id",
  "stage_id",
  "contact_id",
  "company_id",
  "value",
  "currency",
  "expected_close_at",
  "status",
  "created_at",
  "updated_at",
].join(", ");

function columnsFor(tableName: string): string {
  switch (tableName) {
    case "crm_contacts":
      return CONTACT_COLUMNS;
    case "crm_leads":
      return LEAD_COLUMNS;
    case "crm_opportunities":
      return OPPORTUNITY_COLUMNS;
    default:
      throw new Error(`Unsupported CRM table: ${tableName}`);
  }
}
