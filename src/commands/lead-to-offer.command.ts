import { runLeadToOfferWorkflow } from "../workflows/lead-to-offer.workflow.js";
import type { LeadToOfferInput, LeadToOfferResult } from "../workflows/lead-to-offer.types.js";

export interface LeadToOfferCommandInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  source?: string;
  offerType?: string;
  offerTitle?: string;
  tenantId?: string;
  airtableRecordId?: string;
  json?: boolean;
}

export interface LeadToOfferCommandResult {
  ok: boolean;
  data?: LeadToOfferResult;
  error?: string;
}

export class LeadToOfferCommand {
  async run(input: LeadToOfferCommandInput = {}): Promise<LeadToOfferCommandResult> {
    const workflowInput: LeadToOfferInput = {
      ...(input.airtableRecordId !== undefined ? { airtableRecordId: input.airtableRecordId } : {}),
      leadData: {
        firstName: input.firstName ?? "Demo",
        lastName: input.lastName ?? "Lead",
        email: input.email ?? "demo@example.com",
        ...(input.company !== undefined ? { company: input.company } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
      },
      ...(input.offerType !== undefined && (input.offerType === "audit" || input.offerType === "retainer" || input.offerType === "consulting") ? { offerType: input.offerType } : {}),
      ...(input.offerTitle !== undefined ? { offerTitle: input.offerTitle } : {}),
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      createdBy: "cli-operator",
    };

    try {
      const result = await runLeadToOfferWorkflow(workflowInput);
      if (input.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const icon = result.ok ? "✓" : "⚠";
        console.log(`${icon} Lead-to-Offer workflow complete [${result.durationMs}ms]`);
        console.log(`  DAG: ${result.dagRunId.slice(0, 14)}… status: ${result.dagStatus}`);
        console.log(`  Stages:`);
        for (const [k, v] of Object.entries(result.stages)) {
          console.log(`    ${v ? "✓" : "✗"} ${k}`);
        }
        if (result.lead) {
          console.log(`  Lead: ${result.lead.firstName} ${result.lead.lastName} <${result.lead.email}>`);
        }
        if (result.offer?.offer) {
          console.log(`  Offer: "${result.offer.offer.title}" — ${result.offer.offer.currency} ${result.offer.offer.price}`);
        }
        if (result.errors?.length) {
          console.log(`  Errors: ${result.errors.join("; ")}`);
        }
      }
      return { ok: result.ok, data: result };
    } catch (err) {
      const error = err instanceof Error ? err.message : "workflow failed";
      if (input.json) console.log(JSON.stringify({ ok: false, error }));
      else console.error(`✗ Workflow failed: ${error}`);
      return { ok: false, error };
    }
  }
}
