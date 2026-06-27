import type {
  CrmContact,
  CrmLead,
  CrmOpportunity,
  CrmTenantContext,
  CrmTenantScopedRecord,
} from "./crm-types.js";

export interface CrmStore {
  createContact(context: CrmTenantContext, contact: CrmContact): Promise<CrmContact>;
  getContact(context: CrmTenantContext, contactId: string): Promise<CrmContact | null>;
  listContacts(context: CrmTenantContext): Promise<CrmContact[]>;
  updateContact(
    context: CrmTenantContext,
    contactId: string,
    patch: Partial<CrmContact> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmContact>;

  createLead(context: CrmTenantContext, lead: CrmLead): Promise<CrmLead>;
  getLead(context: CrmTenantContext, leadId: string): Promise<CrmLead | null>;
  listLeads(context: CrmTenantContext): Promise<CrmLead[]>;
  updateLead(
    context: CrmTenantContext,
    leadId: string,
    patch: Partial<CrmLead> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmLead>;

  createOpportunity(context: CrmTenantContext, opportunity: CrmOpportunity): Promise<CrmOpportunity>;
  getOpportunity(context: CrmTenantContext, opportunityId: string): Promise<CrmOpportunity | null>;
  listOpportunities(context: CrmTenantContext): Promise<CrmOpportunity[]>;
  updateOpportunity(
    context: CrmTenantContext,
    opportunityId: string,
    patch: Partial<CrmOpportunity> & Pick<CrmTenantScopedRecord, "tenantId">,
  ): Promise<CrmOpportunity>;
}
