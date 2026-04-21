import { describe, expect, it } from "vitest";

import { InMemoryReplayStore } from "../../src/security/replay-store.js";

describe("in-memory replay store", () => {
  it("accepts first nonce and webhook id combination", async () => {
    const store = new InMemoryReplayStore(600);

    const result = await store.checkAndStore({
      nonce: "nonce-1",
      webhookId: "wh-1",
    });

    expect(result.replay).toBe(false);
  });

  it("rejects duplicate nonce", async () => {
    const store = new InMemoryReplayStore(600);

    await store.checkAndStore({ nonce: "nonce-1", webhookId: "wh-1" });
    const duplicate = await store.checkAndStore({ nonce: "nonce-1", webhookId: "wh-2" });

    expect(duplicate.replay).toBe(true);
  });

  it("rejects duplicate webhook id", async () => {
    const store = new InMemoryReplayStore(600);

    await store.checkAndStore({ nonce: "nonce-1", webhookId: "wh-1" });
    const duplicate = await store.checkAndStore({ nonce: "nonce-2", webhookId: "wh-1" });

    expect(duplicate.replay).toBe(true);
  });

  it("accepts entries again after ttl expiration", async () => {
    const store = new InMemoryReplayStore(60);

    const startMs = Date.now();

    await store.checkAndStore({ nonce: "nonce-1", webhookId: "wh-1", nowMs: startMs });

    const afterTtl = await store.checkAndStore({
      nonce: "nonce-1",
      webhookId: "wh-1",
      nowMs: startMs + 61_000,
    });

    expect(afterTtl.replay).toBe(false);
  });
});
