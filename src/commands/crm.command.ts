import type { CrmService } from "../crm/crm-service.js";
import type { CrmStore } from "../crm/crm-store.js";
import { getLiveCrmService, getLiveCrmStore } from "../crm/crm-runtime.js";
import {
  assertCrmTenantContext,
  CrmTenantAccessError,
  type CrmTenantContextRequest,
} from "../crm/tenant-context.js";
import {
  validateCrmContact,
  validateCrmLead,
  validateCrmOpportunity,
} from "../crm/crm-schemas.js";
import type {
  CrmActorType,
  CrmApprovalStatus,
  CrmContact,
  CrmLead,
  CrmOpportunity,
  CrmTenantContext,
  CrmTenantScopedRecord,
} from "../crm/crm-types.js";

const OBJECTS = ["contact", "lead", "opportunity"] as const;
const ACTIONS = ["create", "update", "get"] as const;
const ACTOR_TYPES: CrmActorType[] = ["platform_user", "tenant_user", "agent", "system"];
const APPROVAL_STATUSES: CrmApprovalStatus[] = ["not_required", "pending", "approved", "rejected"];

type CrmObject = (typeof OBJECTS)[number];
type CrmAction = (typeof ACTIONS)[number];

export interface CrmCommandInput {
  object?: string | undefined;
  action?: string | undefined;
  tenantId?: string | undefined;
  actorId?: string | undefined;
  actorType?: string | undefined;
  id?: string | undefined;
  payload?: string | undefined;
  approvalStatus?: string | undefined;
  json?: boolean | undefined;
}

export interface CrmCommandResult {
  ok: boolean;
  command: "crm";
  object?: CrmObject;
  action?: CrmAction;
  record?: unknown;
  errors: string[];
  warnings: string[];
}

export interface CrmCommandDeps {
  getService?: () => CrmService;
  getStore?: () => CrmStore;
}

/**
 * Operator-facing CLI for the live (Postgres-backed) CRM.
 *
 * Writes (create/update) run through `CrmService` so permission, approval, and
 * audit gating apply. Reads (get) run through the store directly. The live
 * service/store require `CRM_DATABASE_URL`; they are resolved lazily so `--help`
 * and validation errors never touch the database.
 */
export class CrmCommand {
  constructor(private readonly deps: CrmCommandDeps = {}) {}

  async run(input: CrmCommandInput = {}): Promise<CrmCommandResult> {
    const result: CrmCommandResult = { ok: false, command: "crm", errors: [], warnings: [] };

    const object = normalize(input.object, OBJECTS);
    if (!object) return this.fail(result, `--object must be one of: ${OBJECTS.join(", ")}.`, input.json);
    result.object = object;

    const action = normalize(input.action, ACTIONS);
    if (!action) return this.fail(result, `--action must be one of: ${ACTIONS.join(", ")}.`, input.json);
    result.action = action;

    const tenantId = input.tenantId?.trim();
    if (!tenantId) return this.fail(result, "--tenant is required.", input.json);

    const actorId = input.actorId?.trim();
    if (!actorId) return this.fail(result, "--actor is required.", input.json);

    const actorType = input.actorType ? normalize(input.actorType, ACTOR_TYPES) : "system";
    if (!actorType) return this.fail(result, `--actorType must be one of: ${ACTOR_TYPES.join(", ")}.`, input.json);

    let approvalStatus: CrmApprovalStatus | undefined;
    if (input.approvalStatus) {
      approvalStatus = normalize(input.approvalStatus, APPROVAL_STATUSES);
      if (!approvalStatus) {
        return this.fail(result, `--approvalStatus must be one of: ${APPROVAL_STATUSES.join(", ")}.`, input.json);
      }
    }

    // Resolve tenant context (throws CrmTenantAccessError on denial).
    let context: CrmTenantContext;
    try {
      context = assertCrmTenantContext(buildTenantRequest(actorType, tenantId, actorId, approvalStatus));
    } catch (error) {
      const reason = error instanceof CrmTenantAccessError ? error.message : describeError(error);
      return this.fail(result, `tenant context denied: ${reason}`, input.json);
    }

    try {
      if (action === "get") {
        const id = input.id?.trim();
        if (!id) return this.fail(result, "--id is required for get.", input.json);
        result.record = await this.read(object, context, id);
        if (result.record === null) result.warnings.push(`${object} ${id} not found for tenant ${tenantId}.`);
      } else if (action === "create") {
        const parsed = this.parsePayload(input.payload, result, input.json);
        if (parsed === undefined) return result;
        result.record = await this.create(object, context, withDefaults(parsed, tenantId));
      } else {
        const id = input.id?.trim();
        if (!id) return this.fail(result, "--id is required for update.", input.json);
        const parsed = this.parsePayload(input.payload, result, input.json);
        if (parsed === undefined) return result;
        result.record = await this.update(object, context, id, { ...parsed, tenantId });
      }
    } catch (error) {
      return this.fail(result, describeError(error), input.json);
    }

    result.ok = true;
    this.print(result, input.json);
    return result;
  }

  private service(): CrmService {
    return (this.deps.getService ?? getLiveCrmService)();
  }

  private store(): CrmStore {
    return (this.deps.getStore ?? getLiveCrmStore)();
  }

  private async read(object: CrmObject, context: CrmTenantContext, id: string): Promise<unknown> {
    const store = this.store();
    if (object === "contact") return store.getContact(context, id);
    if (object === "lead") return store.getLead(context, id);
    return store.getOpportunity(context, id);
  }

  private async create(object: CrmObject, context: CrmTenantContext, record: Record<string, unknown>): Promise<unknown> {
    const validation =
      object === "contact" ? validateCrmContact(record)
        : object === "lead" ? validateCrmLead(record)
          : validateCrmOpportunity(record);
    if (!validation.valid) {
      throw new Error(`invalid ${object} payload: ${validation.errors.join("; ")}`);
    }
    const service = this.service();
    if (object === "contact") return service.createContact(context, record as unknown as CrmContact);
    if (object === "lead") return service.createLead(context, record as unknown as CrmLead);
    return service.createOpportunity(context, record as unknown as CrmOpportunity);
  }

  private async update(
    object: CrmObject,
    context: CrmTenantContext,
    id: string,
    patch: Record<string, unknown> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<unknown> {
    const service = this.service();
    if (object === "contact") {
      return service.updateContact(context, id, patch as Partial<CrmContact> & Pick<CrmTenantScopedRecord, "tenantId">);
    }
    if (object === "lead") {
      return service.updateLead(context, id, patch as Partial<CrmLead> & Pick<CrmTenantScopedRecord, "tenantId">);
    }
    return service.updateOpportunity(
      context,
      id,
      patch as Partial<CrmOpportunity> & Pick<CrmTenantScopedRecord, "tenantId">,
    );
  }

  private parsePayload(
    raw: string | undefined,
    result: CrmCommandResult,
    json: boolean | undefined,
  ): Record<string, unknown> | undefined {
    if (!raw || raw.trim().length === 0) {
      this.fail(result, "--data JSON payload is required for create/update.", json);
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        this.fail(result, "--data payload must be a JSON object.", json);
        return undefined;
      }
      return parsed as Record<string, unknown>;
    } catch {
      this.fail(result, "--data payload is not valid JSON.", json);
      return undefined;
    }
  }

  private fail(result: CrmCommandResult, message: string, json: boolean | undefined): CrmCommandResult {
    result.ok = false;
    result.errors.push(message);
    this.print(result, json);
    return result;
  }

  private print(result: CrmCommandResult, json: boolean | undefined): void {
    if (json === true) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (result.ok) {
      console.log(`✓ crm ${result.object} ${result.action}`);
      if (result.record !== undefined) console.log(JSON.stringify(result.record, null, 2));
      for (const w of result.warnings) console.warn(`  warning: ${w}`);
    } else {
      for (const e of result.errors) console.error(`✗ ${e}`);
    }
  }
}

function normalize<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  const v = value?.trim().toLowerCase();
  return allowed.find((a) => a === v);
}

function buildTenantRequest(
  actorType: CrmActorType,
  tenantId: string,
  actorId: string,
  approvalStatus: CrmApprovalStatus | undefined,
): CrmTenantContextRequest {
  const base: CrmTenantContextRequest = {
    selectedTenantId: tenantId,
    actorId,
    actorType,
    ...(approvalStatus !== undefined ? { approvalStatus } : {}),
  };
  if (actorType === "platform_user") return { ...base, platformAccess: { canAccessAllTenants: true } };
  if (actorType === "agent") return { ...base, agentTenantId: tenantId };
  if (actorType === "tenant_user") return base; // requires memberships — not supported via CLI
  return { ...base, systemTenantId: tenantId };
}

function withDefaults(payload: Record<string, unknown>, tenantId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now,
    ...payload,
    // tenantId is operator-scoped and applied last so the payload can never cross tenants.
    tenantId,
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
