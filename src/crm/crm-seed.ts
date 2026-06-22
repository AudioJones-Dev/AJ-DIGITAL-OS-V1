import type {
  CrmContact,
  CrmLead,
  CrmOpportunity,
  CrmTenant,
  CrmTenantMembership,
} from "./crm-types.js";

export interface CrmSeedData {
  tenants: [CrmTenant, CrmTenant];
  memberships: [CrmTenantMembership, CrmTenantMembership];
  contacts: [CrmContact, CrmContact];
  leads: [CrmLead, CrmLead];
  opportunities: [CrmOpportunity, CrmOpportunity];
}

export function createTwoTenantCrmSeedData(now = "2026-06-15T00:00:00.000Z"): CrmSeedData {
  const tenantA: CrmTenant = {
    tenantId: "tenant-alpha",
    name: "Alpha Services",
    status: "active",
    ownerUserId: "owner-alpha",
    defaultPipelineId: "pipeline-alpha",
    createdAt: now,
    updatedAt: now,
  };

  const tenantB: CrmTenant = {
    tenantId: "tenant-bravo",
    name: "Bravo Home Services",
    status: "active",
    ownerUserId: "owner-bravo",
    defaultPipelineId: "pipeline-bravo",
    createdAt: now,
    updatedAt: now,
  };

  return {
    tenants: [tenantA, tenantB],
    memberships: [
      {
        tenantId: tenantA.tenantId,
        userId: tenantA.ownerUserId,
        role: "tenant_admin",
        status: "active",
        permissions: ["crm:*"],
        createdAt: now,
        updatedAt: now,
      },
      {
        tenantId: tenantB.tenantId,
        userId: tenantB.ownerUserId,
        role: "tenant_admin",
        status: "active",
        permissions: ["crm:*"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    contacts: [
      {
        tenantId: tenantA.tenantId,
        contactId: "contact-shared",
        firstName: "Avery",
        lastName: "Alpha",
        email: "avery.alpha@example.test",
        lifecycleStage: "lead",
        source: "form",
        consentStatus: "opted_in",
        createdAt: now,
        updatedAt: now,
      },
      {
        tenantId: tenantB.tenantId,
        contactId: "contact-shared",
        firstName: "Blake",
        lastName: "Bravo",
        email: "blake.bravo@example.test",
        lifecycleStage: "lead",
        source: "phone",
        consentStatus: "unknown",
        createdAt: now,
        updatedAt: now,
      },
    ],
    leads: [
      {
        tenantId: tenantA.tenantId,
        leadId: "lead-shared",
        contactId: "contact-shared",
        status: "new",
        source: "form",
        score: 72,
        urgency: "medium",
        ownerUserId: tenantA.ownerUserId,
        createdAt: now,
        updatedAt: now,
      },
      {
        tenantId: tenantB.tenantId,
        leadId: "lead-shared",
        contactId: "contact-shared",
        status: "working",
        source: "phone",
        score: 88,
        urgency: "high",
        ownerUserId: tenantB.ownerUserId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    opportunities: [
      {
        tenantId: tenantA.tenantId,
        opportunityId: "opportunity-shared",
        pipelineId: "pipeline-alpha",
        stageId: "stage-new",
        contactId: "contact-shared",
        value: 7500,
        currency: "USD",
        status: "open",
        createdAt: now,
        updatedAt: now,
      },
      {
        tenantId: tenantB.tenantId,
        opportunityId: "opportunity-shared",
        pipelineId: "pipeline-bravo",
        stageId: "stage-quote",
        contactId: "contact-shared",
        value: 12500,
        currency: "USD",
        status: "open",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
