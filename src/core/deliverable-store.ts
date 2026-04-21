import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DeliverableSchema } from "../schemas/deliverable.schema.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

export interface ListDeliverablesInput {
  limit?: number;
  brandId?: string;
  status?: DeliverableRecord["status"];
}

const VALID_TRANSITIONS: Readonly<Record<DeliverableRecord["status"], DeliverableRecord["status"][]>> = {
  draft: ["pending_approval"],
  pending_approval: ["approved"],
  approved: ["published"],
  published: [],
  failed: [],
  archived: [],
};

export class DeliverableStore {
  private readonly registryDirectory: string;

  constructor(registryDirectory = path.resolve("data", "deliverables", "registry")) {
    this.registryDirectory = registryDirectory;
  }

  async save(deliverable: DeliverableRecord): Promise<DeliverableRecord> {
    const parsedDeliverable = DeliverableSchema.parse(deliverable);
    await mkdir(this.registryDirectory, { recursive: true });
    await writeFile(
      this.getDeliverablePath(parsedDeliverable.createdAt, parsedDeliverable.deliverableId),
      `${JSON.stringify(parsedDeliverable, null, 2)}\n`,
      "utf-8",
    );
    return parsedDeliverable;
  }

  async getLatestByRunId(runId: string): Promise<DeliverableRecord | undefined> {
    const matching = await this.listAll();
    return matching
      .filter((entry) => entry.runId === runId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  }

  async update(
    deliverableId: string,
    updater: (current: DeliverableRecord) => DeliverableRecord,
  ): Promise<DeliverableRecord> {
    const existing = await this.getById(deliverableId);
    if (!existing) {
      throw new Error(`Deliverable "${deliverableId}" was not found.`);
    }

    return this.save(updater(existing));
  }

  async transition(
    deliverableId: string,
    nextStatus: DeliverableRecord["status"],
    updater?: (current: DeliverableRecord) => DeliverableRecord,
  ): Promise<DeliverableRecord> {
    const existing = await this.getById(deliverableId);
    if (!existing) {
      throw new Error(`Deliverable "${deliverableId}" was not found.`);
    }

    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Deliverable "${deliverableId}" cannot transition from "${existing.status}" to "${nextStatus}".`,
      );
    }

    const updated = updater
      ? updater(existing)
      : {
          ...existing,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          ...(nextStatus === "published" ? { publishedAt: new Date().toISOString() } : {}),
        };

    return this.save(updated);
  }

  async getById(deliverableId: string): Promise<DeliverableRecord | undefined> {
    const entries = await this.listAll();
    return entries.find((entry) => entry.deliverableId === deliverableId);
  }

  async list(input: ListDeliverablesInput = {}): Promise<DeliverableRecord[]> {
    let entries = await this.listAll();

    if (input.brandId && input.brandId.trim().length > 0) {
      entries = entries.filter((entry) => entry.brandId === input.brandId?.trim());
    }

    if (input.status) {
      entries = entries.filter((entry) => entry.status === input.status);
    }

    if (typeof input.limit === "number" && input.limit > 0) {
      entries = entries.slice(0, input.limit);
    }

    return entries;
  }

  private async listAll(): Promise<DeliverableRecord[]> {
    await mkdir(this.registryDirectory, { recursive: true });
    const entries = await readdir(this.registryDirectory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));

    const deliverables = await Promise.all(
      files.map(async (fileName) => {
        const raw = await readFile(path.join(this.registryDirectory, fileName), "utf-8");
        return DeliverableSchema.parse(JSON.parse(raw));
      }),
    );

    return deliverables.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  private getDeliverablePath(createdAt: string, deliverableId: string): string {
    return path.join(
      this.registryDirectory,
      `${sanitizeTimestamp(createdAt)}-${sanitizeId(deliverableId)}.json`,
    );
  }
}

const sanitizeTimestamp = (timestamp: string): string => timestamp.replace(/[^0-9TZ-]/g, "_");
const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, "_");
