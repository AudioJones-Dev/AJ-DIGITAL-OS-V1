import type { PersistentCrmAuditLog } from "./crm-audit.js";
import { CrmService } from "./crm-service.js";
import type { CrmStore } from "./crm-store.js";
import { defaultCrmStore } from "./persistent-crm-store.js";
import { PostgresCrmStore, type PostgresCrmPool } from "./postgres-crm-store.js";

export interface CrmServiceFactoryOptions {
  auditLog?: PersistentCrmAuditLog | undefined;
  store?: CrmStore | undefined;
  postgresPool?: PostgresCrmPool | undefined;
}

export interface PostgresCrmServiceOptions {
  auditLog?: PersistentCrmAuditLog | undefined;
}

export class CrmServiceFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmServiceFactoryError";
  }
}

export function createCrmService(options: CrmServiceFactoryOptions = {}): CrmService {
  const store = resolveCrmStore(options);
  return new CrmService({
    store,
    ...(options.auditLog !== undefined ? { auditLog: options.auditLog } : {}),
  });
}

export function createPostgresCrmService(
  postgresPool: PostgresCrmPool,
  options: PostgresCrmServiceOptions = {},
): CrmService {
  return createCrmService({
    postgresPool,
    ...(options.auditLog !== undefined ? { auditLog: options.auditLog } : {}),
  });
}

function resolveCrmStore(options: CrmServiceFactoryOptions): CrmStore {
  if (options.store && options.postgresPool) {
    throw new CrmServiceFactoryError(
      "CRM service factory accepts either a store or a postgresPool, not both.",
    );
  }

  if (options.store) return options.store;
  if (options.postgresPool) return new PostgresCrmStore(options.postgresPool);
  return defaultCrmStore;
}
