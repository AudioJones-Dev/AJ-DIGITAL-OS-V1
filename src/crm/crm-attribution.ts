import { emitEvent } from "../attribution/attribution-tracker.js";
import type { AttributionEventType } from "../attribution/attribution-types.js";
import type { CrmAuditEventType, CrmAuditObjectType } from "./crm-audit.js";
import type { CrmTenantContext } from "./crm-types.js";

const TAG = "[CRM-ATTR]";
const CRM_AGENT_ID = "crm-module";

export interface CrmAttributionInput {
  crmEventType: CrmAuditEventType;
  objectType: CrmAuditObjectType;
  objectId: string;
  context: CrmTenantContext;
  metadata?: Record<string, unknown> | undefined;
}

function attributionTypeFor(crmEventType: CrmAuditEventType): AttributionEventType {
  if (crmEventType.endsWith("_updated")) return "entity_updated";
  return "entity_normalized";
}

export function emitCrmAttribution(input: CrmAttributionInput): void {
  try {
    void emitEvent({
      eventType: attributionTypeFor(input.crmEventType),
      runId: input.objectId,
      agentId: CRM_AGENT_ID,
      channel: "unknown",
      clientId: input.context.tenantId,
      metadata: {
        crmEventType: input.crmEventType,
        objectType: input.objectType,
        objectId: input.objectId,
        tenantId: input.context.tenantId,
        actorType: input.context.actorType,
        actorId: input.context.actorId,
        riskLevel: input.context.riskLevel,
        approvalStatus: input.context.approvalStatus ?? "not_required",
        ...input.metadata,
      },
    }).catch((err: unknown) => {
      console.warn(`${TAG} attribution emit failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  } catch (err) {
    console.warn(`${TAG} attribution emit threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}
