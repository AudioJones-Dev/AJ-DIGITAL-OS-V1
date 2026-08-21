import { getCrmPool } from "../db/crm-postgres-pool.js";
import { CrmService } from "./crm-service.js";
import { createCrmService } from "./crm-service-factory.js";
import { PostgresCrmStore, type PostgresCrmPool, type PostgresCrmClient } from "./postgres-crm-store.js";
import type { CrmStore } from "./crm-store.js";

/**
 * Live CRM runtime composition (go-live Phase A).
 *
 * Single seam that binds the CRM domain to the live Postgres pool. Every
 * surface (operator CLI now; HTTP/dashboard in a later phase) reuses the same
 * store instance:
 *  - writes go through `CrmService` (permission + approval + audit gating)
 *  - reads go through the `CrmStore` directly (`CrmService` exposes no reads)
 *
 * The pool is adapted to `PostgresCrmPool` here so the `pg` dependency stays in
 * the db layer; the store only ever sees the minimal `connect()` contract.
 */

function adaptPool(): PostgresCrmPool {
  const pool = getCrmPool();
  return {
    async connect(): Promise<PostgresCrmClient> {
      const client = await pool.connect();
      return {
        async query<T = unknown>(text: string, values?: readonly unknown[]) {
          const result = await client.query(text, values as unknown[] | undefined);
          return { rows: result.rows as T[], rowCount: result.rowCount };
        },
        release(): void {
          client.release();
        },
      };
    },
  };
}

let store: CrmStore | null = null;
let service: CrmService | null = null;

/** Returns the live Postgres-backed CRM store (used for reads). */
export function getLiveCrmStore(): CrmStore {
  if (!store) store = new PostgresCrmStore(adaptPool());
  return store;
}

/** Returns the live CRM service (used for create/update — gated + audited). */
export function getLiveCrmService(): CrmService {
  if (!service) service = createCrmService({ store: getLiveCrmStore() });
  return service;
}

/** Resets the cached singletons (tests / after closeCrmPool). */
export function resetLiveCrm(): void {
  store = null;
  service = null;
}
