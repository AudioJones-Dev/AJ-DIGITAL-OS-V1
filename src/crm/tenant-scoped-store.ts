import type { CrmTenantContext, CrmTenantScopedRecord } from "./crm-types.js";
import { assertTenantScopedRecord } from "./tenant-context.js";

export class CrmRecordNotFoundError extends Error {
  constructor(id: string) {
    super(`CRM record not found: ${id}`);
    this.name = "CrmRecordNotFoundError";
  }
}

export class TenantScopedCollection<
  TRecord extends CrmTenantScopedRecord,
  TIdField extends Extract<keyof TRecord, string>,
> {
  private readonly records = new Map<string, TRecord>();

  constructor(
    private readonly idField: TIdField,
    initialRecords: readonly TRecord[] = [],
  ) {
    for (const record of initialRecords) {
      this.records.set(this.recordKey(record.tenantId, this.idOf(record)), record);
    }
  }

  create(context: CrmTenantContext, record: TRecord): TRecord {
    assertTenantScopedRecord(context, record);
    this.records.set(this.recordKey(context.tenantId, this.idOf(record)), record);
    return record;
  }

  get(context: CrmTenantContext, id: string): TRecord | undefined {
    return this.records.get(this.recordKey(context.tenantId, id));
  }

  require(context: CrmTenantContext, id: string): TRecord {
    const record = this.get(context, id);
    if (!record) throw new CrmRecordNotFoundError(id);
    return record;
  }

  update(
    context: CrmTenantContext,
    id: string,
    patch: Partial<TRecord> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): TRecord {
    assertTenantScopedRecord(context, patch);
    const existing = this.require(context, id);
    const updated: TRecord = {
      ...existing,
      ...patch,
      tenantId: context.tenantId,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    };
    this.records.set(this.recordKey(context.tenantId, id), updated);
    return updated;
  }

  list(context: CrmTenantContext): TRecord[] {
    return [...this.records.values()].filter((record) => record.tenantId === context.tenantId);
  }

  clear(): void {
    this.records.clear();
  }

  private idOf(record: TRecord): string {
    const value = record[this.idField];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`CRM record id field ${this.idField} must be a non-empty string.`);
    }
    return value;
  }

  private recordKey(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
