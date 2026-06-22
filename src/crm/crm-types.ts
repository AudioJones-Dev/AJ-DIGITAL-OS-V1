/**
 * AJ Digital Multi-Tenant CRM Module foundation types.
 *
 * These types are tenant-native by design. CRM records use tenantId as a
 * required field rather than adapting legacy clientId surfaces.
 */

export type CrmActorType = "platform_user" | "tenant_user" | "agent" | "system";

export type CrmRiskLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export type CrmApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export type CrmTenantRole = "platform_owner" | "tenant_admin" | "tenant_user" | "tenant_agent" | "system";

export type CrmTenantMembershipRole = "tenant_admin" | "tenant_user";

export type CrmMembershipStatus = "active" | "invited" | "disabled";

export interface CrmTenantScopedRecord {
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActionContext {
  tenantId: string;
  actorType: CrmActorType;
  actorId: string;
  riskLevel: CrmRiskLevel;
  approvalStatus?: CrmApprovalStatus | undefined;
}

export interface CrmTenantContext extends CrmActionContext {
  role: CrmTenantRole;
  permissions: string[];
}

export interface CrmTenantMembership extends CrmTenantScopedRecord {
  userId: string;
  role: CrmTenantMembershipRole;
  status: CrmMembershipStatus;
  permissions: string[];
}

export interface CrmTenant extends CrmTenantScopedRecord {
  name: string;
  status: "active" | "disabled" | "suspended" | "sandbox";
  ownerUserId: string;
  businessProfileId?: string | undefined;
  defaultPipelineId?: string | undefined;
}

export interface CrmContact extends CrmTenantScopedRecord {
  contactId: string;
  companyId?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  lifecycleStage: "new" | "lead" | "qualified" | "customer" | "inactive";
  ownerUserId?: string | undefined;
  source?: string | undefined;
  consentStatus?: "unknown" | "opted_in" | "opted_out" | undefined;
}

export interface CrmCompany extends CrmTenantScopedRecord {
  companyId: string;
  name: string;
  domain?: string | undefined;
  industry?: string | undefined;
  ownerUserId?: string | undefined;
}

export interface CrmLead extends CrmTenantScopedRecord {
  leadId: string;
  contactId?: string | undefined;
  companyId?: string | undefined;
  status: "new" | "working" | "qualified" | "unqualified" | "converted" | "lost";
  source?: string | undefined;
  score?: number | undefined;
  urgency?: "low" | "medium" | "high" | undefined;
  ownerUserId?: string | undefined;
}

export interface CrmOpportunity extends CrmTenantScopedRecord {
  opportunityId: string;
  pipelineId: string;
  stageId: string;
  contactId?: string | undefined;
  companyId?: string | undefined;
  value?: number | undefined;
  currency?: string | undefined;
  expectedCloseAt?: string | undefined;
  status: "open" | "won" | "lost";
}

export interface CrmPipelineStage {
  stageId: string;
  name: string;
  order: number;
  probability?: number | undefined;
  requiresApproval?: boolean | undefined;
}

export interface CrmPipeline extends CrmTenantScopedRecord {
  pipelineId: string;
  name: string;
  objectType: "lead" | "opportunity";
  stages: CrmPipelineStage[];
}

export interface CrmConversation extends CrmTenantScopedRecord {
  conversationId: string;
  channel: "phone" | "sms" | "email" | "chat" | "form" | "manual";
  contactId?: string | undefined;
  leadId?: string | undefined;
  opportunityId?: string | undefined;
  assignedUserId?: string | undefined;
  status: "open" | "pending" | "closed";
  summary?: string | undefined;
}

export interface CrmTask extends CrmTenantScopedRecord {
  taskId: string;
  title: string;
  status: "open" | "done" | "cancelled";
  dueAt?: string | undefined;
  assignedUserId?: string | undefined;
  relatedObjectType?: "contact" | "company" | "lead" | "opportunity" | "conversation" | undefined;
  relatedObjectId?: string | undefined;
  createdByActorId: string;
}

export interface CrmCommercialDocument extends CrmTenantScopedRecord {
  documentId: string;
  type: "quote" | "invoice";
  contactId?: string | undefined;
  companyId?: string | undefined;
  opportunityId?: string | undefined;
  status: "draft" | "sent" | "accepted" | "paid" | "void" | "expired";
  amount: number;
  currency: string;
  externalProvider?: string | undefined;
  externalId?: string | undefined;
}

export interface CrmTenantMemoryRecord extends CrmTenantScopedRecord {
  memoryId: string;
  namespace: "business_profile" | "knowledge_base" | "conversation" | "attribution" | "agent";
  sourceObjectType?: string | undefined;
  sourceObjectId?: string | undefined;
  classification: "public" | "internal" | "confidential" | "restricted";
}
