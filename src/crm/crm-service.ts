import type { CrmAuditEventType, CrmAuditObjectType, PersistentCrmAuditLog } from "./crm-audit.js";
import { auditPayloadForContext, defaultCrmAuditLog } from "./crm-audit.js";
import { emitCrmAttribution } from "./crm-attribution.js";
import { evaluateCrmApproval, type CrmServiceAction } from "./crm-approval-policy.js";
import type {
  CrmContact,
  CrmLead,
  CrmOpportunity,
  CrmTenantContext,
  CrmTenantScopedRecord,
} from "./crm-types.js";
import { defaultCrmStore, PersistentCrmStore } from "./persistent-crm-store.js";

export class CrmApprovalRequiredError extends Error {
  constructor(action: CrmServiceAction, reason: string) {
    super(reason);
    this.name = "CrmApprovalRequiredError";
    this.action = action;
  }

  readonly action: CrmServiceAction;
}

export class CrmPermissionDeniedError extends Error {
  constructor(action: CrmServiceAction, reason: string) {
    super(reason);
    this.name = "CrmPermissionDeniedError";
    this.action = action;
  }

  readonly action: CrmServiceAction;
}

export interface CrmServiceOptions {
  store?: PersistentCrmStore | undefined;
  auditLog?: PersistentCrmAuditLog | undefined;
}

export class CrmService {
  private readonly store: PersistentCrmStore;
  private readonly auditLog: PersistentCrmAuditLog;

  constructor(options: CrmServiceOptions = {}) {
    this.store = options.store ?? defaultCrmStore;
    this.auditLog = options.auditLog ?? defaultCrmAuditLog;
  }

  async createContact(context: CrmTenantContext, contact: CrmContact): Promise<CrmContact> {
    await this.assertActionAllowed(context, "create_contact", "contact", contact.contactId);
    const created = await this.store.createContact(context, contact);
    await this.recordEvent("crm_contact_created", "contact", created.contactId, context, {
      lifecycleStage: created.lifecycleStage,
      source: created.source ?? null,
    });
    return created;
  }

  async updateContact(
    context: CrmTenantContext,
    contactId: string,
    patch: Partial<CrmContact> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmContact> {
    await this.assertActionAllowed(context, "update_contact", "contact", contactId);
    const updated = await this.store.updateContact(context, contactId, patch);
    await this.recordEvent("crm_contact_updated", "contact", contactId, context, {
      updatedFields: Object.keys(patch).sort(),
    });
    return updated;
  }

  async createLead(context: CrmTenantContext, lead: CrmLead): Promise<CrmLead> {
    await this.assertActionAllowed(context, "create_lead", "lead", lead.leadId);
    const created = await this.store.createLead(context, lead);
    await this.recordEvent("crm_lead_created", "lead", created.leadId, context, {
      status: created.status,
      source: created.source ?? null,
      score: created.score ?? null,
    });
    return created;
  }

  async updateLead(
    context: CrmTenantContext,
    leadId: string,
    patch: Partial<CrmLead> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmLead> {
    await this.assertActionAllowed(context, "update_lead", "lead", leadId);
    const updated = await this.store.updateLead(context, leadId, patch);
    await this.recordEvent("crm_lead_updated", "lead", leadId, context, {
      updatedFields: Object.keys(patch).sort(),
      status: updated.status,
    });
    return updated;
  }

  async createOpportunity(
    context: CrmTenantContext,
    opportunity: CrmOpportunity,
  ): Promise<CrmOpportunity> {
    await this.assertActionAllowed(context, "create_opportunity", "opportunity", opportunity.opportunityId);
    const created = await this.store.createOpportunity(context, opportunity);
    await this.recordEvent("crm_opportunity_created", "opportunity", created.opportunityId, context, {
      status: created.status,
      value: created.value ?? null,
      currency: created.currency ?? null,
    });
    return created;
  }

  async updateOpportunity(
    context: CrmTenantContext,
    opportunityId: string,
    patch: Partial<CrmOpportunity> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmOpportunity> {
    await this.assertActionAllowed(context, "update_opportunity", "opportunity", opportunityId);
    const updated = await this.store.updateOpportunity(context, opportunityId, patch);
    await this.recordEvent("crm_opportunity_updated", "opportunity", opportunityId, context, {
      updatedFields: Object.keys(patch).sort(),
      status: updated.status,
    });
    return updated;
  }

  private async assertActionAllowed(
    context: CrmTenantContext,
    action: CrmServiceAction,
    objectType: CrmAuditObjectType,
    objectId: string,
  ): Promise<void> {
    const permission = permissionForAction(action);
    if (!hasCrmPermission(context, permission)) {
      const reason = `CRM action ${action} requires permission ${permission}.`;
      try {
        await this.auditLog.append({
          ...auditPayloadForContext(context, {
            action,
            reason,
            requiredPermission: permission,
          }),
          eventType: "crm_action_blocked",
          objectType,
          objectId,
        });
      } catch {
        // audit must not mask the permission decision
      }

      throw new CrmPermissionDeniedError(action, reason);
    }

    const decision = evaluateCrmApproval(action, context.approvalStatus);
    if (decision.approved) return;

    try {
      await this.auditLog.append({
        ...auditPayloadForContext(context, {
          action,
          reason: decision.reason,
        }),
        eventType: "crm_approval_required",
        objectType,
        objectId,
      });
    } catch {
      // audit must not mask the approval decision
    }

    throw new CrmApprovalRequiredError(action, decision.reason);
  }

  private async recordEvent(
    eventType: CrmAuditEventType,
    objectType: CrmAuditObjectType,
    objectId: string,
    context: CrmTenantContext,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLog.append({
      ...auditPayloadForContext(context, payload),
      eventType,
      objectType,
      objectId,
    });

    emitCrmAttribution({
      crmEventType: eventType,
      objectType,
      objectId,
      context,
      metadata: payload,
    });
  }
}

export const defaultCrmService = new CrmService();

function permissionForAction(action: CrmServiceAction): string {
  return `crm:${action}`;
}

function hasCrmPermission(context: CrmTenantContext, permission: string): boolean {
  return context.permissions.some((candidate) =>
    candidate === permission
    || candidate === "crm:*"
    || candidate === "tenant:admin"
    || candidate === "system:tenant",
  );
}
