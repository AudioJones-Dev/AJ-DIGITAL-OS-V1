import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TAG = "[CRM-MIGRATION-CHECK]";
const MIGRATION_PATH = resolve("supabase", "migrations", "20260626150000_crm_multitenant_rls.sql");
const SEED_PATH = resolve("supabase", "seed.sql");

const APPEND_ONLY_TABLES = new Set(["crm_audit_events", "crm_attribution_events"]);
const FORBIDDEN_CREDENTIAL_COLUMNS = [
  "raw_secret",
  "secret_value",
  "access_token",
  "refresh_token",
  "api_key",
  "password",
  "private_key",
];

interface TableDefinition {
  name: string;
  body: string;
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractTables(sql: string): TableDefinition[] {
  const tables: TableDefinition[] = [];
  const tableRegex = /create\s+table\s+if\s+not\s+exists\s+(?:public\.)?(crm_[a-z0-9_]+)\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(sql)) !== null) {
    const name = match[1];
    if (!name) continue;

    const bodyStart = tableRegex.lastIndex;
    let depth = 1;
    let cursor = bodyStart;

    while (cursor < sql.length && depth > 0) {
      const char = sql[cursor];
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      cursor += 1;
    }

    if (depth !== 0) {
      throw new Error(`Could not parse CREATE TABLE body for ${name}.`);
    }

    tables.push({
      name,
      body: sql.slice(bodyStart, cursor - 1),
    });
  }

  return tables;
}

function assert(condition: boolean, message: string, errors: string[]): void {
  if (!condition) errors.push(message);
}

function tableHasTenantPrimaryKey(table: TableDefinition): boolean {
  const body = normalizeSql(table.body);
  if (table.name === "crm_tenants") {
    return /\btenant_id\s+text\s+primary\s+key\b/.test(body)
      || /primary\s+key\s*\(\s*tenant_id\s*\)/.test(body);
  }

  return /primary\s+key\s*\(\s*tenant_id\s*,/.test(body)
    || /unique\s*\(\s*tenant_id\s*,/.test(body);
}

function hasPolicy(sql: string, table: string, operation: "select" | "insert" | "update"): boolean {
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `create\\s+policy\\s+${escapedTable}_[a-z0-9_]+\\s+on\\s+(?:public\\.)?${escapedTable}\\s+for\\s+${operation}\\b`,
    "i",
  );
  return pattern.test(sql);
}

function validateMigration(sql: string): string[] {
  const errors: string[] = [];
  const normalized = normalizeSql(sql);
  const tables = extractTables(sql);

  assert(tables.length >= 20, `Expected at least 20 CRM tables, found ${tables.length}.`, errors);

  for (const table of tables) {
    const body = normalizeSql(table.body);
    assert(/\btenant_id\b/.test(body), `${table.name} is missing tenant_id.`, errors);
    assert(/\bcreated_at\b/.test(body), `${table.name} is missing created_at.`, errors);
    assert(/\bupdated_at\b/.test(body), `${table.name} is missing updated_at.`, errors);
    assert(tableHasTenantPrimaryKey(table), `${table.name} is missing a tenant-prefixed primary key or unique constraint.`, errors);
    assert(
      new RegExp(`alter\\s+table\\s+(?:public\\.)?${table.name}\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql),
      `${table.name} is missing ENABLE ROW LEVEL SECURITY.`,
      errors,
    );
    assert(hasPolicy(sql, table.name, "select"), `${table.name} is missing a tenant select policy.`, errors);
    assert(hasPolicy(sql, table.name, "insert"), `${table.name} is missing a tenant insert policy.`, errors);

    if (APPEND_ONLY_TABLES.has(table.name)) {
      assert(!hasPolicy(sql, table.name, "update"), `${table.name} must remain append-only for non-platform actors.`, errors);
    } else {
      assert(hasPolicy(sql, table.name, "update"), `${table.name} is missing a tenant update policy.`, errors);
    }
  }

  assert(/\bcrm_current_tenant_id\s*\(\s*\)/.test(normalized), "Missing crm_current_tenant_id helper.", errors);
  assert(/\bcrm_platform_admin_mode\s*\(\s*\)/.test(normalized), "Missing crm_platform_admin_mode helper.", errors);
  assert(/\bcrm_has_tenant_context\s*\(\s*\)/.test(normalized), "Missing crm_has_tenant_context helper.", errors);
  assert(!/\bfor\s+delete\b/i.test(sql), "Migration must not create tenant-user hard-delete policies.", errors);

  const credentialTable = tables.find((table) => table.name === "crm_connector_credentials");
  if (!credentialTable) {
    errors.push("Missing crm_connector_credentials table.");
  } else {
    const credentialBody = normalizeSql(credentialTable.body);
    for (const forbiddenColumn of FORBIDDEN_CREDENTIAL_COLUMNS) {
      assert(
        !new RegExp(`\\b${forbiddenColumn}\\b`).test(credentialBody),
        `crm_connector_credentials contains forbidden raw secret column ${forbiddenColumn}.`,
        errors,
      );
    }
    assert(/\bvault_reference\b/.test(credentialBody), "crm_connector_credentials is missing vault_reference.", errors);
  }

  return errors;
}

function validateSeed(sql: string): string[] {
  const errors: string[] = [];
  const normalized = normalizeSql(sql);
  const tenantMatches = [...normalized.matchAll(/'aj-[a-z0-9-]+'/g)].map((match) => match[0]);
  const tenants = new Set(tenantMatches.filter((value) => value.includes("client") || value.includes("sandbox") || value.includes("demo")));

  assert(tenants.size >= 2, "Seed must include at least two tenants.", errors);
  assert((normalized.match(/contact-shared-001/g) ?? []).length >= 2, "Seed must duplicate contact_id across tenants.", errors);
  assert((normalized.match(/lead-shared-001/g) ?? []).length >= 2, "Seed must duplicate lead_id across tenants.", errors);
  assert((normalized.match(/opportunity-shared-001/g) ?? []).length >= 2, "Seed must duplicate opportunity_id across tenants.", errors);
  assert(!/\b(access_token|refresh_token|api_key|password|private_key|secret_value)\b/.test(normalized), "Seed must not contain raw credential fields.", errors);
  assert(/\bvault:\/\/dev\//.test(normalized), "Seed should use vault-reference credential placeholders only.", errors);

  return errors;
}

function main(): void {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf-8");
  const seedSql = readFileSync(SEED_PATH, "utf-8");
  const errors = [
    ...validateMigration(migrationSql),
    ...validateSeed(seedSql),
  ];

  if (errors.length > 0) {
    console.error(`${TAG} CRM migration validation failed.`);
    for (const error of errors) {
      console.error(`${TAG} - ${error}`);
    }
    process.exit(1);
  }

  console.log(`${TAG} CRM migration structural validation passed.`);
}

main();
