/**
 * Auth + CORS gate for the Hermes status API.
 *
 * The gate sits in front of every route: bearer token required except for the
 * public allowlist (GET /status, GET /metrics, POST /api/stripe/webhook), and
 * CORS headers are only emitted for origins listed in HERMES_ALLOWED_ORIGINS.
 * Fail-closed: with no HERMES_STATUS_API_KEY configured, protected routes
 * return 503 instead of falling open.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startHermesApi, stopHermesApi } from "../../src/hermes/hermes-status-api.js";

const PORT = 17420;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = "test-hermes-status-key";

const ENV_KEYS = ["HERMES_STATUS_API_KEY", "HERMES_ALLOWED_ORIGINS"] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  stopHermesApi();
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

function start(env: Partial<Record<(typeof ENV_KEYS)[number], string>>): void {
  for (const k of ENV_KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  startHermesApi(PORT);
}

describe("hermes status API auth gate", () => {
  it("serves GET /status without a token (public allowlist)", async () => {
    start({ HERMES_STATUS_API_KEY: KEY });
    const res = await fetch(`${BASE}/status`);
    expect(res.status).toBe(200);
  });

  it("rejects a protected route without a token (401 when key configured)", async () => {
    start({ HERMES_STATUS_API_KEY: KEY });
    const res = await fetch(`${BASE}/mcp/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "anything" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong token with 401", async () => {
    start({ HERMES_STATUS_API_KEY: KEY });
    const res = await fetch(`${BASE}/approvals`, {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(res.status).toBe(401);
  });

  it("admits a correct bearer token past the gate", async () => {
    start({ HERMES_STATUS_API_KEY: KEY });
    const res = await fetch(`${BASE}/mcp/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({}),
    });
    // Gate passed: the route handler itself rejects the empty task with 400,
    // which proves we reached it rather than being stopped at the gate.
    expect(res.status).toBe(400);
  });

  it("fails closed with 503 when no key is configured", async () => {
    start({});
    const res = await fetch(`${BASE}/approvals`);
    expect(res.status).toBe(503);
  });

  it("treats the change-me placeholder as no key (503)", async () => {
    start({ HERMES_STATUS_API_KEY: "change-me" });
    const res = await fetch(`${BASE}/approvals`, {
      headers: { Authorization: "Bearer change-me" },
    });
    expect(res.status).toBe(503);
  });
});

describe("hermes status API CORS lockdown", () => {
  it("emits no CORS headers for an unlisted origin", async () => {
    start({ HERMES_STATUS_API_KEY: KEY, HERMES_ALLOWED_ORIGINS: "https://home.ajdigital.app" });
    const res = await fetch(`${BASE}/status`, { headers: { Origin: "https://evil.example" } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("echoes a listed origin with Vary: Origin", async () => {
    start({ HERMES_STATUS_API_KEY: KEY, HERMES_ALLOWED_ORIGINS: "https://home.ajdigital.app, http://localhost:5173" });
    const res = await fetch(`${BASE}/status`, { headers: { Origin: "http://localhost:5173" } });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("never emits wildcard CORS", async () => {
    start({ HERMES_STATUS_API_KEY: KEY, HERMES_ALLOWED_ORIGINS: "" });
    const res = await fetch(`${BASE}/status`, { headers: { Origin: "http://localhost:5173" } });
    expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
  });
});
