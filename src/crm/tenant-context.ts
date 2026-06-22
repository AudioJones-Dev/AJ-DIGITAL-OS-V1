import type {
  CrmActionContext,
  CrmActorType,
  CrmApprovalStatus,
  CrmRiskLevel,
  CrmTenantContext,
  CrmTenantMembership,
  CrmTenantRole,
  CrmTenantScopedRecord,
} from "./crm-types.js";

export type CrmTenantAccessCode =
  | "tenant_context_required"
  | "actor_required"
  | "platform_access_denied"
  | "tenant_membership_required"
  | "agent_tenant_mismatch"
  | "system_tenant_mismatch"
  | "cross_tenant_record"
  | "invalid_action_context";

export interface CrmPlatformAccess {
  canAccessAllTenants?: boolean | undefined;
  allowedTenantIds?: string[] | undefined;
  permissions?: string[] | undefined;
}

export interface CrmTenantContextRequest {
  selectedTenantId?: string | null | undefined;
  actorType: CrmActorType;
  actorId: string;
  platformAccess?: CrmPlatformAccess | undefined;
  memberships?: CrmTenantMembership[] | undefined;
  agentTenantId?: string | null | undefined;
  systemTenantId?: string | null | undefined;
  riskLevel?: CrmRiskLevel | undefined;
  approvalStatus?: CrmApprovalStatus | undefined;
}

export type CrmTenantAccessDecision =
  | {
      ok: true;
      context: CrmTenantContext;
    }
  | {
      ok: false;
      code: CrmTenantAccessCode;
      reason: string;
    };

export interface CrmActionContextValidation {
  valid: boolean;
  errors: string[];
}

export class CrmTenantAccessError extends Error {
  readonly code: CrmTenantAccessCode;

  constructor(code: CrmTenantAccessCode, reason: string) {
    super(reason);
    this.name = "CrmTenantAccessError";
    this.code = code;
  }
}

function denied(code: CrmTenantAccessCode, reason: string): CrmTenantAccessDecision {
  return { ok: false, code, reason };
}

function cleanId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function activeMembershipFor(
  memberships: readonly CrmTenantMembership[] | undefined,
  tenantId: string,
  userId: string,
): CrmTenantMembership | undefined {
  return memberships?.find(
    (membership) =>
      membership.tenantId === tenantId
      && membership.userId === userId
      && membership.status === "active",
  );
}

function buildContext(input: {
  tenantId: string;
  actorType: CrmActorType;
  actorId: string;
  role: CrmTenantRole;
  permissions: string[];
  riskLevel?: CrmRiskLevel | undefined;
  approvalStatus?: CrmApprovalStatus | undefined;
}): CrmTenantContext {
  return {
    tenantId: input.tenantId,
    actorType: input.actorType,
    actorId: input.actorId,
    riskLevel: input.riskLevel ?? "L0",
    role: input.role,
    permissions: input.permissions,
    ...(input.approvalStatus !== undefined ? { approvalStatus: input.approvalStatus } : {}),
  };
}

export function resolveCrmTenantContext(
  request: CrmTenantContextRequest,
): CrmTenantAccessDecision {
  const tenantId = cleanId(request.selectedTenantId);
  if (!tenantId) {
    return denied("tenant_context_required", "CRM actions require an explicit selected tenantId.");
  }

  const actorId = cleanId(request.actorId);
  if (!actorId) {
    return denied("actor_required", "CRM actions require an actorId.");
  }

  if (request.actorType === "platform_user") {
    const access = request.platformAccess;
    const hasTenant =
      access?.canAccessAllTenants === true
      || access?.allowedTenantIds?.includes(tenantId) === true;
    if (!hasTenant) {
      return denied(
        "platform_access_denied",
        `Platform user ${actorId} is not allowed to access tenant ${tenantId}.`,
      );
    }
    return {
      ok: true,
      context: buildContext({
        tenantId,
        actorType: request.actorType,
        actorId,
        role: "platform_owner",
        permissions: access?.permissions ?? ["tenant:admin"],
        riskLevel: request.riskLevel,
        approvalStatus: request.approvalStatus,
      }),
    };
  }

  if (request.actorType === "tenant_user") {
    const membership = activeMembershipFor(request.memberships, tenantId, actorId);
    if (!membership) {
      return denied(
        "tenant_membership_required",
        `Tenant user ${actorId} does not have active access to tenant ${tenantId}.`,
      );
    }
    return {
      ok: true,
      context: buildContext({
        tenantId,
        actorType: request.actorType,
        actorId,
        role: membership.role,
        permissions: membership.permissions,
        riskLevel: request.riskLevel,
        approvalStatus: request.approvalStatus,
      }),
    };
  }

  if (request.actorType === "agent") {
    if (request.agentTenantId !== tenantId) {
      return denied(
        "agent_tenant_mismatch",
        `Agent ${actorId} cannot operate in tenant ${tenantId}.`,
      );
    }
    return {
      ok: true,
      context: buildContext({
        tenantId,
        actorType: request.actorType,
        actorId,
        role: "tenant_agent",
        permissions: ["agent:tenant"],
        riskLevel: request.riskLevel,
        approvalStatus: request.approvalStatus,
      }),
    };
  }

  if (request.systemTenantId !== tenantId) {
    return denied(
      "system_tenant_mismatch",
      `System actor ${actorId} cannot operate without matching tenant context ${tenantId}.`,
    );
  }

  return {
    ok: true,
    context: buildContext({
      tenantId,
      actorType: request.actorType,
      actorId,
      role: "system",
      permissions: ["system:tenant"],
      riskLevel: request.riskLevel,
      approvalStatus: request.approvalStatus,
    }),
  };
}

export function assertCrmTenantContext(request: CrmTenantContextRequest): CrmTenantContext {
  const decision = resolveCrmTenantContext(request);
  if (!decision.ok) {
    throw new CrmTenantAccessError(decision.code, decision.reason);
  }
  return decision.context;
}

export function assertTenantScopedRecord(
  context: Pick<CrmTenantContext, "tenantId">,
  record: Pick<CrmTenantScopedRecord, "tenantId">,
): void {
  if (record.tenantId !== context.tenantId) {
    throw new CrmTenantAccessError(
      "cross_tenant_record",
      `Record tenant ${record.tenantId} does not match active tenant ${context.tenantId}.`,
    );
  }
}

export function validateCrmActionContext(
  context: Partial<CrmActionContext> | null | undefined,
): CrmActionContextValidation {
  const errors: string[] = [];
  if (!context) {
    return { valid: false, errors: ["CRM action context is required."] };
  }

  if (!context.tenantId?.trim()) errors.push("tenantId is required.");
  if (!context.actorId?.trim()) errors.push("actorId is required.");
  if (!context.actorType) errors.push("actorType is required.");
  if (!context.riskLevel) errors.push("riskLevel is required.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
