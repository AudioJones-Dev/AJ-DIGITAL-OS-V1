import { describe, expect, it } from "vitest";
import { splitSqlStatements } from "../../src/db/sql-split.js";

describe("splitSqlStatements", () => {
  it("splits simple semicolon-separated statements", () => {
    const out = splitSqlStatements("SELECT 1; SELECT 2;\nSELECT 3");
    expect(out).toEqual(["SELECT 1", "SELECT 2", "SELECT 3"]);
  });

  it("ignores trailing empty statement after final semicolon", () => {
    expect(splitSqlStatements("CREATE TABLE t (id int);\n")).toEqual(["CREATE TABLE t (id int)"]);
  });

  it("does not split on semicolons inside a $$ dollar-quoted body", () => {
    const sql = `
CREATE FUNCTION f() RETURNS void AS $$
BEGIN
  PERFORM 1;
  PERFORM 2;
END;
$$ LANGUAGE plpgsql;
SELECT 1;`;
    const out = splitSqlStatements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("PERFORM 1;");
    expect(out[0]).toContain("PERFORM 2;");
    expect(out[1]).toBe("SELECT 1");
  });

  it("handles named dollar-quote tags ($body$)", () => {
    const sql = `DO $body$ BEGIN RAISE NOTICE 'a;b'; END $body$;\nSELECT 42;`;
    const out = splitSqlStatements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("$body$");
    expect(out[1]).toBe("SELECT 42");
  });

  it("ignores semicolons inside single-quoted strings", () => {
    const out = splitSqlStatements("INSERT INTO t VALUES ('a;b'); SELECT 1;");
    expect(out).toEqual(["INSERT INTO t VALUES ('a;b')", "SELECT 1"]);
  });

  it("handles escaped single quotes ('')", () => {
    const out = splitSqlStatements("SELECT 'it''s; fine'; SELECT 2;");
    expect(out).toEqual(["SELECT 'it''s; fine'", "SELECT 2"]);
  });

  it("ignores semicolons in line comments", () => {
    const out = splitSqlStatements("SELECT 1; -- comment; with semicolon\nSELECT 2;");
    expect(out).toEqual(["SELECT 1", "-- comment; with semicolon\nSELECT 2"]);
  });

  it("ignores semicolons in block comments", () => {
    const out = splitSqlStatements("SELECT 1; /* a; b; c */ SELECT 2;");
    expect(out).toEqual(["SELECT 1", "/* a; b; c */ SELECT 2"]);
  });

  it("drops comment-only statements", () => {
    const out = splitSqlStatements("-- just a comment\n;\nSELECT 1;");
    expect(out).toEqual(["SELECT 1"]);
  });

  it("returns empty array for whitespace/comment-only input", () => {
    expect(splitSqlStatements("  \n-- nothing\n  ")).toEqual([]);
  });

  it("does not treat $1 positional params as dollar-quote tags", () => {
    const out = splitSqlStatements("INSERT INTO t (a, b) VALUES ($1, $2); SELECT 1;");
    expect(out).toEqual(["INSERT INTO t (a, b) VALUES ($1, $2)", "SELECT 1"]);
  });
});
