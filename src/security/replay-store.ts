export interface ReplayCheckInput {
  nonce: string;
  webhookId: string;
  nowMs?: number;
}

export interface ReplayStore {
  checkAndStore(input: ReplayCheckInput): Promise<{ replay: boolean }>;
}

interface ReplayEntry {
  expiresAtMs: number;
}

export class InMemoryReplayStore implements ReplayStore {
  private readonly nonceEntries = new Map<string, ReplayEntry>();
  private readonly webhookIdEntries = new Map<string, ReplayEntry>();

  constructor(private readonly ttlSeconds: number) {}

  async checkAndStore(input: ReplayCheckInput): Promise<{ replay: boolean }> {
    const nowMs = input.nowMs ?? Date.now();
    this.cleanupExpired(nowMs);

    const nonceEntry = this.nonceEntries.get(input.nonce);
    if (nonceEntry && nonceEntry.expiresAtMs > nowMs) {
      return { replay: true };
    }

    const webhookIdEntry = this.webhookIdEntries.get(input.webhookId);
    if (webhookIdEntry && webhookIdEntry.expiresAtMs > nowMs) {
      return { replay: true };
    }

    const expiresAtMs = nowMs + this.ttlSeconds * 1000;

    this.nonceEntries.set(input.nonce, { expiresAtMs });
    this.webhookIdEntries.set(input.webhookId, { expiresAtMs });

    return { replay: false };
  }

  private cleanupExpired(nowMs: number): void {
    for (const [nonce, entry] of this.nonceEntries.entries()) {
      if (entry.expiresAtMs <= nowMs) {
        this.nonceEntries.delete(nonce);
      }
    }

    for (const [webhookId, entry] of this.webhookIdEntries.entries()) {
      if (entry.expiresAtMs <= nowMs) {
        this.webhookIdEntries.delete(webhookId);
      }
    }
  }
}
