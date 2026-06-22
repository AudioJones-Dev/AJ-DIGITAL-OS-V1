import path from "node:path";

import { readJSON, writeJSON } from "../security/persistence/json-file-store.js";
import type {
  CrmContact,
  CrmLead,
  CrmOpportunity,
  CrmTenantContext,
  CrmTenantScopedRecord,
} from "./crm-types.js";
import {
  CRM_SCHEMA_VERSION,
  validateCrmContact,
  validateCrmLead,
  validateCrmOpportunity,
  type CrmSchemaValidationResult,
} from "./crm-schemas.js";
import { assertTenantScopedRecord } from "./tenant-context.js";

const DEFAULT_CRM_STORE_PATH = path.resolve("runtime", "crm", "crm-store.json");

export interface PersistentCrmStoreData {
  schemaVersion: typeof CRM_SCHEMA_VERSION;
  contacts: CrmContact[];
  leads: CrmLead[];
  opportunities: CrmOpportunity[];
  updatedAt: string;
}

export class CrmStoreValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`CRM record validation failed: ${errors.join(" ")}`);
    this.name = "CrmStoreValidationError";
    this.errors = errors;
  }
}

export class CrmDuplicateRecordError extends Error {
  constructor(recordType: string, id: string, tenantId: string) {
    super(`CRM ${recordType} ${id} already exists for tenant ${tenantId}.`);
    this.name = "CrmDuplicateRecordError";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyStoreData(): PersistentCrmStoreData {
  return {
    schemaVersion: CRM_SCHEMA_VERSION,
    contacts: [],
    leads: [],
    opportunities: [],
    updatedAt: nowIso(),
  };
}

function assertValid(result: CrmSchemaValidationResult): void {
  if (!result.valid) {
    throw new CrmStoreValidationError(result.errors);
  }
}

function sameTenantAndId<TRecord extends CrmTenantScopedRecord>(
  record: TRecord,
  idField: Extract<keyof TRecord, string>,
  tenantId: string,
  id: string,
): boolean {
  return record.tenantId === tenantId && record[idField] === id;
}

export class PersistentCrmStore {
  constructor(private readonly filePath: string = DEFAULT_CRM_STORE_PATH) {}

  async createContact(context: CrmTenantContext, contact: CrmContact): Promise<CrmContact> {
    assertValid(validateCrmContact(contact));
    return this.createRecord("contact", "contacts", "contactId", context, contact);
  }

  async getContact(context: CrmTenantContext, contactId: string): Promise<CrmContact | null> {
    return this.getRecord("contacts", "contactId", context, contactId);
  }

  async listContacts(context: CrmTenantContext): Promise<CrmContact[]> {
    const data = await this.load();
    return data.contacts.filter((record) => record.tenantId === context.tenantId);
  }

  async updateContact(
    context: CrmTenantContext,
    contactId: string,
    patch: Partial<CrmContact> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmContact> {
    return this.updateRecord(
      "contacts",
      "contactId",
      context,
      contactId,
      patch,
      validateCrmContact,
    );
  }

  async createLead(context: CrmTenantContext, lead: CrmLead): Promise<CrmLead> {
    assertValid(validateCrmLead(lead));
    return this.createRecord("lead", "leads", "leadId", context, lead);
  }

  async getLead(context: CrmTenantContext, leadId: string): Promise<CrmLead | null> {
    return this.getRecord("leads", "leadId", context, leadId);
  }

  async listLeads(context: CrmTenantContext): Promise<CrmLead[]> {
    const data = await this.load();
    return data.leads.filter((record) => record.tenantId === context.tenantId);
  }

  async updateLead(
    context: CrmTenantContext,
    leadId: string,
    patch: Partial<CrmLead> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmLead> {
    return this.updateRecord("leads", "leadId", context, leadId, patch, validateCrmLead);
  }

  async createOpportunity(
    context: CrmTenantContext,
    opportunity: CrmOpportunity,
  ): Promise<CrmOpportunity> {
    assertValid(validateCrmOpportunity(opportunity));
    return this.createRecord(
      "opportunity",
      "opportunities",
      "opportunityId",
      context,
      opportunity,
    );
  }

  async getOpportunity(
    context: CrmTenantContext,
    opportunityId: string,
  ): Promise<CrmOpportunity | null> {
    return this.getRecord("opportunities", "opportunityId", context, opportunityId);
  }

  async listOpportunities(context: CrmTenantContext): Promise<CrmOpportunity[]> {
    const data = await this.load();
    return data.opportunities.filter((record) => record.tenantId === context.tenantId);
  }

  async updateOpportunity(
    context: CrmTenantContext,
    opportunityId: string,
    patch: Partial<CrmOpportunity> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmOpportunity> {
    return this.updateRecord(
      "opportunities",
      "opportunityId",
      context,
      opportunityId,
      patch,
      validateCrmOpportunity,
    );
  }

  private async load(): Promise<PersistentCrmStoreData> {
    const loaded = await readJSON<PersistentCrmStoreData>(this.filePath, {
      tolerateCorruption: true,
    });
    if (!loaded) return emptyStoreData();
    return {
      schemaVersion: CRM_SCHEMA_VERSION,
      contacts: Array.isArray(loaded.contacts) ? loaded.contacts : [],
      leads: Array.isArray(loaded.leads) ? loaded.leads : [],
      opportunities: Array.isArray(loaded.opportunities) ? loaded.opportunities : [],
      updatedAt: loaded.updatedAt ?? nowIso(),
    };
  }

  private async save(data: PersistentCrmStoreData): Promise<void> {
    await writeJSON(this.filePath, { ...data, updatedAt: nowIso() });
  }

  private async createRecord<
    TCollection extends "contacts" | "leads" | "opportunities",
    TRecord extends PersistentCrmStoreData[TCollection][number],
  >(
    recordType: string,
    collection: TCollection,
    idField: Extract<keyof TRecord, string>,
    context: CrmTenantContext,
    record: TRecord,
  ): Promise<TRecord> {
    assertTenantScopedRecord(context, record);
    const data = await this.load();
    const records = data[collection] as TRecord[];
    const id = record[idField];
    if (typeof id !== "string" || !id.trim()) {
      throw new CrmStoreValidationError([`${idField}: id is required`]);
    }
    if (records.some((existing) => sameTenantAndId(existing, idField, context.tenantId, id))) {
      throw new CrmDuplicateRecordError(recordType, id, context.tenantId);
    }
    records.push(record);
    await this.save(data);
    return record;
  }

  private async getRecord<
    TCollection extends "contacts" | "leads" | "opportunities",
    TRecord extends PersistentCrmStoreData[TCollection][number],
  >(
    collection: TCollection,
    idField: Extract<keyof TRecord, string>,
    context: CrmTenantContext,
    id: string,
  ): Promise<TRecord | null> {
    const data = await this.load();
    const records = data[collection] as TRecord[];
    return records.find((record) => sameTenantAndId(record, idField, context.tenantId, id)) ?? null;
  }

  private async updateRecord<
    TCollection extends "contacts" | "leads" | "opportunities",
    TRecord extends PersistentCrmStoreData[TCollection][number],
  >(
    collection: TCollection,
    idField: Extract<keyof TRecord, string>,
    context: CrmTenantContext,
    id: string,
    patch: Partial<TRecord> & Pick<CrmTenantScopedRecord, "tenantId">,
    validate: (record: unknown) => CrmSchemaValidationResult,
  ): Promise<TRecord> {
    assertTenantScopedRecord(context, patch);
    const data = await this.load();
    const records = data[collection] as TRecord[];
    const index = records.findIndex((record) => sameTenantAndId(record, idField, context.tenantId, id));
    if (index < 0) {
      throw new Error(`CRM record not found: ${id}`);
    }
    const existing = records[index]!;
    const updated = {
      ...existing,
      ...patch,
      tenantId: context.tenantId,
      updatedAt: patch.updatedAt ?? nowIso(),
    } as TRecord;
    assertValid(validate(updated));
    records[index] = updated;
    await this.save(data);
    return updated;
  }
}

export const defaultCrmStore = new PersistentCrmStore();
