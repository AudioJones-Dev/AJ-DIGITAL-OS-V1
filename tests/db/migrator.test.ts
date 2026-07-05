import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations, type SqlExecResult, type SqlExecutor } from "../../src/db/migrator.js";

/**
 * In-memory fake of the Neon executor. Records applied statements and maintains
 * a minimal schema_migrations table so the engine's skip/hash logic is exercised
 * without a real database.
 */
function makeFakeDb(opts: { failOn?: RegExp } = {}) {
  const ledger = new Map<string, string>(); // name -> hash
  const statements: string[] = [];

  const exec: SqlExecutor = async (sql, params = []): Promise<SqlExecResult> => {
    if (opts.failOn && opts.failOn.test(sql)) {
      return { ok: false, rows: [], error: "simulated failure" };
    }
    if (/CREATE TABLE IF NOT EXISTS schema_migrations/i.test(sql)) {
      return { ok: true, rows: [] };
    }
    if (/^SELECT name, hash FROM schema_migrations/i.test(sql.trim())) {
      return {
        ok: true,
        rows: [...ledger.entries()].map(([name, hash]) => ({ name, hash })),
      };
    }
    if (/^INSERT INTO schema_migrations/i.test(sql.trim())) {
      const [name, hash] = params as [string, string];
      ledger.set(name, hash);
      return { ok: true, rows: [] };
    }
    statements.push(sql);
    return { ok: true, rows: [] };
  };

  return { exec, ledger, statements };
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "migrator-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeMigration(name: string, sql: string): void {
  writeFileSync(join(dir, name), sql, "utf8");
}

describe("runMigrations", () => {
  it("applies pending migrations in manifest order and records them", async () => {
    writeMigration("001.sql", "CREATE TABLE a (id int);");
    writeMigration("002.sql", "CREATE TABLE b (id int);");
    const db = makeFakeDb();

    const res = await runMigrations(db.exec, { sqlDir: dir, manifest: ["001.sql", "002.sql"] });

    expect(res.ok).toBe(true);
    expect(res.applied).toBe(2);
    expect(res.skipped).toBe(0);
    expect(db.ledger.has("001.sql")).toBe(true);
    expect(db.ledger.has("002.sql")).toBe(true);
    expect(res.files.map((f) => f.status)).toEqual(["applied", "applied"]);
  });

  it("is idempotent: a second run skips everything", async () => {
    writeMigration("001.sql", "CREATE TABLE a (id int);");
    const db = makeFakeDb();
    const manifest = ["001.sql"];

    await runMigrations(db.exec, { sqlDir: dir, manifest });
    const second = await runMigrations(db.exec, { sqlDir: dir, manifest });

    expect(second.ok).toBe(true);
    expect(second.applied).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.files[0]?.status).toBe("skipped");
  });

  it("only applies the new file when one is added later", async () => {
    writeMigration("001.sql", "CREATE TABLE a (id int);");
    const db = makeFakeDb();

    await runMigrations(db.exec, { sqlDir: dir, manifest: ["001.sql"] });
    writeMigration("002.sql", "CREATE TABLE b (id int);");
    const res = await runMigrations(db.exec, { sqlDir: dir, manifest: ["001.sql", "002.sql"] });

    expect(res.applied).toBe(1);
    expect(res.skipped).toBe(1);
    expect(res.files.find((f) => f.name === "002.sql")?.status).toBe("applied");
  });

  it("fails if an already-applied migration's content changed", async () => {
    writeMigration("001.sql", "CREATE TABLE a (id int);");
    const db = makeFakeDb();
    await runMigrations(db.exec, { sqlDir: dir, manifest: ["001.sql"] });

    writeMigration("001.sql", "CREATE TABLE a (id int, extra text);"); // tampered
    const res = await runMigrations(db.exec, { sqlDir: dir, manifest: ["001.sql"] });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/modified after the fact/i);
    expect(res.files[0]?.status).toBe("failed");
  });

  it("stops and reports when a statement fails, recording nothing for that file", async () => {
    writeMigration("001.sql", "CREATE TABLE a (id int); BOOM;");
    const db = makeFakeDb({ failOn: /BOOM/ });

    const res = await runMigrations(db.exec, { sqlDir: dir, manifest: ["001.sql"] });

    expect(res.ok).toBe(false);
    expect(res.applied).toBe(0);
    expect(db.ledger.has("001.sql")).toBe(false); // not recorded — safe to retry
    expect(res.files[0]?.status).toBe("failed");
  });

  it("fails clearly when a manifest file is missing from disk", async () => {
    const db = makeFakeDb();
    const res = await runMigrations(db.exec, { sqlDir: dir, manifest: ["nope.sql"] });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/missing/i);
  });

  it("surfaces a ledger-creation failure", async () => {
    writeMigration("001.sql", "SELECT 1;");
    const db = makeFakeDb({ failOn: /CREATE TABLE IF NOT EXISTS schema_migrations/ });

    const res = await runMigrations(db.exec, { sqlDir: dir, manifest: ["001.sql"] });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ledger/i);
  });
});
