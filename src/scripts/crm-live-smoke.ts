import { randomUUID } from "node:crypto";

import { closeCrmPool, getCrmPool } from "../db/crm-postgres-pool.js";
import { getLiveCrmService, getLiveCrmStore, resetLiveCrm } from "../crm/crm-runtime.js";
import { assertCrmTenantContext } from "../crm/tenant-context.js";
import type { CrmContact, CrmTenantContext } from "../crm/crm-types.js";

/**
 * Live CRM smoke proof (go-live Phase A).
 *
 * Run AFTER the migration is applied and CRM_DATABASE_URL is provisioned:
 *   npm run smoke:crm-live
 *
 * Proves, against the live database:
 *  - connectivity + the CRM schema is present (migration applied)
 *  - a tenant-scoped contact create → read round-trip succeeds
 *  - the store's tenant-leading isolation: a different tenant cannot read the row
 *
 * NOTE: DB-level RLS enforcement is proven separately by `npm run test:crm-rls`
 * through a NON-superuser app role. A live Supabase connection is typically a
 * BYPASSRLS role, so this script verifies application-level tenant isolation
 * (the store's `where tenant_id = $1`), not the RLS policy layer.
 *
 * Skips cleanly (exit 0) when CRM_DATABASE_URL is unset.
 */

function systemContext(tenantId: string): CrmTenantContext {
  return assertCrmTenantContext({
    selectedTenantId: tenantId,
    actorId: "crm-live-smoke",
    actorType: "system",
    systemTenantId: tenantId,
  });
}

async function cleanup(tenantId: string, contactId: string): Promise<string> {
  // No DELETE RLS policy exists for crm_contacts; this only succeeds on a
  // BYPASSRLS connection. If it cannot remove the row, the operator is warned.
  try {
    const pool = getCrmPool();
    const res = await pool.query("delete from public.crm_contacts where tenant_id = $1 and contact_id = $2", [
      tenantId,
      contactId,
    ]);
    return (res.rowCount ?? 0) > 0 ? "removed" : "not-removed";
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function main(): Promise<number> {
  if (!process.env["CRM_DATABASE_URL"]?.trim()) {
    console.log("[skip] CRM_DATABASE_URL not set — live CRM smoke skipped.");
    return 0;
  }

  const suffix = randomUUID().slice(0, 8);
  const tenantA = `smoke-${suffix}`;
  const tenantB = `smoke-other-${suffix}`;
  const contactId = `smoke-contact-${suffix}`;
  const email = `smoke.${suffix}@ajdigital.test`;

  const failures: string[] = [];

  try {
    const service = getLiveCrmService();
    const store = getLiveCrmStore();

    const contact: CrmContact = {
      tenantId: tenantA,
      contactId,
      firstName: "Smoke",
      lastName: "Test",
      email,
      lifecycleStage: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Create under tenant A
    const created = await service.createContact(systemContext(tenantA), contact);
    if (created.contactId !== contactId) failures.push(`create returned unexpected id: ${created.contactId}`);

    // 2. Read back under tenant A
    const readback = await store.getContact(systemContext(tenantA), contactId);
    if (!readback) failures.push("tenant A could not read its own contact");
    else if (readback.email !== email) failures.push(`read-back email mismatch: ${readback.email}`);

    // 3. Cross-tenant read under tenant B must be empty
    const crossTenant = await store.getContact(systemContext(tenantB), contactId);
    if (crossTenant !== null) failures.push("tenant B was able to read tenant A's contact (isolation breach)");
  } catch (error) {
    failures.push(`unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    const cleanupResult = await cleanup(tenantA, contactId);
    if (cleanupResult !== "removed") {
      console.warn(
        `[warn] smoke cleanup ${cleanupResult} — manually remove contact ${contactId} for tenant ${tenantA} if it persists.`,
      );
    }
    resetLiveCrm();
    await closeCrmPool();
  }

  if (failures.length === 0) {
    console.log(`PASS — live CRM round-trip + tenant isolation verified (tenant ${tenantA}).`);
    return 0;
  }
  console.error("FAIL — live CRM smoke found issues:");
  for (const f of failures) console.error(`  - ${f}`);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("FAIL — crm-live-smoke crashed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
