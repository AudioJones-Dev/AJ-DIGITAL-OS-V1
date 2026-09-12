import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";
import { Client } from "pg";

import {
  endQuietly,
  guardConnectionErrors,
  isShutdownError,
  waitForBackendsToExit,
} from "./pg-teardown.js";

const ADMIN_DATABASE_URL = process.env.CRM_TEST_DATABASE_URL?.trim();
const runIfDatabase = ADMIN_DATABASE_URL ? describe : describe.skip;

function pgError(code: string, message = "boom"): Error {
  return Object.assign(new Error(message), { code });
}

describe("isShutdownError", () => {
  it("classifies connection-teardown codes as shutdown noise", () => {
    expect(isShutdownError(pgError("57P01"))).toBe(true);
    expect(isShutdownError(pgError("57P02"))).toBe(true);
    expect(isShutdownError(pgError("57P03"))).toBe(true);
    expect(isShutdownError(pgError("ECONNRESET"))).toBe(true);
  });

  it("classifies by message when no code is present", () => {
    expect(isShutdownError(new Error("terminating connection due to administrator command"))).toBe(true);
    expect(isShutdownError(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("does not swallow real errors", () => {
    expect(isShutdownError(pgError("42501", "permission denied for table crm_contacts"))).toBe(false);
    expect(isShutdownError(new Error("new row violates row-level security policy"))).toBe(false);
    expect(isShutdownError("not an error")).toBe(false);
  });
});

describe("guardConnectionErrors", () => {
  it("prevents an 'error' event from becoming an uncaught exception", () => {
    const emitter = new EventEmitter();
    const readErrors = guardConnectionErrors(emitter as unknown as Client);

    // Without a listener this throws; the guard is what keeps a green suite green.
    expect(() => emitter.emit("error", pgError("57P01", "terminating connection"))).not.toThrow();
    expect(readErrors()).toEqual([]);
  });

  it("still surfaces non-shutdown errors to the caller", () => {
    const emitter = new EventEmitter();
    const readErrors = guardConnectionErrors(emitter as unknown as Client);

    emitter.emit("error", pgError("42501", "permission denied"));

    expect(readErrors().map((error) => error.message)).toEqual(["permission denied"]);
  });
});

describe("endQuietly", () => {
  it("absorbs a shutdown-class failure", async () => {
    const resource = { end: async () => { throw pgError("57P01"); } };
    await expect(endQuietly(resource as unknown as Client)).resolves.toBeUndefined();
  });

  it("rethrows anything else", async () => {
    const resource = { end: async () => { throw pgError("42501", "permission denied"); } };
    await expect(endQuietly(resource as unknown as Client)).rejects.toThrow("permission denied");
  });

  it("tolerates an undefined resource", async () => {
    await expect(endQuietly(undefined)).resolves.toBeUndefined();
  });
});

runIfDatabase("waitForBackendsToExit", () => {
  it("reports drained for a database with no other backends", async () => {
    const admin = new Client({ connectionString: ADMIN_DATABASE_URL as string });
    guardConnectionErrors(admin);
    await admin.connect();

    try {
      // Only this admin connection is attached, and it excludes its own pid.
      expect(await waitForBackendsToExit(admin, "definitely_no_such_database")).toBe(true);
    } finally {
      await endQuietly(admin);
    }
  }, 30_000);
});
