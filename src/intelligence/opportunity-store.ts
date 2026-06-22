import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assertNoForbiddenGooglePersistence,
} from "./founder-opportunity-engine/compliance/persistence-guard.js";
import type { FounderOpportunity } from "./founder-opportunity-engine/types.js";
import type { OpportunityScore } from "./opportunity-scorer.js";

const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "opportunities.json");

export type StoredOpportunityRecord = OpportunityScore | FounderOpportunity;

export interface OpportunityStore {
  saveOpportunities(scores: OpportunityScore[]): Promise<void>;
  loadOpportunities(): Promise<OpportunityScore[]>;
  getOpportunityById(scoreId: string): Promise<OpportunityScore | undefined>;
  getTopOpportunities(limit: number): Promise<OpportunityScore[]>;
  saveFounderOpportunities(opportunities: FounderOpportunity[]): Promise<void>;
  loadFounderOpportunities(): Promise<FounderOpportunity[]>;
  getFounderOpportunityById(id: string): Promise<FounderOpportunity | undefined>;
  loadOpportunityRecords(): Promise<StoredOpportunityRecord[]>;
  saveOpportunityRecords(records: StoredOpportunityRecord[]): Promise<void>;
}

export function createOpportunityStore(storePath = STORE_PATH): OpportunityStore {
  async function loadOpportunityRecords(): Promise<StoredOpportunityRecord[]> {
    try {
      const content = await readFile(storePath, "utf-8");
      const records = JSON.parse(content) as unknown;
      if (!Array.isArray(records)) {
        return [];
      }
      return records.filter(isStoredOpportunityRecord);
    } catch {
      return [];
    }
  }

  async function saveOpportunityRecords(records: StoredOpportunityRecord[]): Promise<void> {
    assertNoForbiddenGooglePersistence(records);
    const dataDir = dirname(storePath);
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }
    await writeFile(storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async function saveOpportunities(scores: OpportunityScore[]): Promise<void> {
    const existing = await loadOpportunityRecords();
    const founderRecords = existing.filter(isFounderOpportunity);
    await saveOpportunityRecords([...founderRecords, ...scores]);
  }

  async function loadOpportunities(): Promise<OpportunityScore[]> {
    const all = await loadOpportunityRecords();
    return all.filter(isOpportunityScore);
  }

  async function getOpportunityById(scoreId: string): Promise<OpportunityScore | undefined> {
    const all = await loadOpportunities();
    return all.find((s) => s.scoreId === scoreId);
  }

  async function getTopOpportunities(limit: number): Promise<OpportunityScore[]> {
    const all = await loadOpportunities();
    return all.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async function saveFounderOpportunities(opportunities: FounderOpportunity[]): Promise<void> {
    const existing = await loadOpportunityRecords();
    const nonFounderRecords = existing.filter((record) => !isFounderOpportunity(record));
    await saveOpportunityRecords([...nonFounderRecords, ...opportunities]);
  }

  async function loadFounderOpportunities(): Promise<FounderOpportunity[]> {
    const all = await loadOpportunityRecords();
    return all.filter(isFounderOpportunity);
  }

  async function getFounderOpportunityById(id: string): Promise<FounderOpportunity | undefined> {
    const all = await loadFounderOpportunities();
    return all.find((opportunity) => opportunity.id === id);
  }

  return {
    saveOpportunities,
    loadOpportunities,
    getOpportunityById,
    getTopOpportunities,
    saveFounderOpportunities,
    loadFounderOpportunities,
    getFounderOpportunityById,
    loadOpportunityRecords,
    saveOpportunityRecords,
  };
}

const defaultOpportunityStore = createOpportunityStore();

export const saveOpportunities = defaultOpportunityStore.saveOpportunities;
export const loadOpportunities = defaultOpportunityStore.loadOpportunities;
export const getOpportunityById = defaultOpportunityStore.getOpportunityById;
export const getTopOpportunities = defaultOpportunityStore.getTopOpportunities;
export const saveFounderOpportunities = defaultOpportunityStore.saveFounderOpportunities;
export const loadFounderOpportunities = defaultOpportunityStore.loadFounderOpportunities;
export const getFounderOpportunityById = defaultOpportunityStore.getFounderOpportunityById;
export const loadOpportunityRecords = defaultOpportunityStore.loadOpportunityRecords;
export const saveOpportunityRecords = defaultOpportunityStore.saveOpportunityRecords;

function isStoredOpportunityRecord(value: unknown): value is StoredOpportunityRecord {
  return isOpportunityScore(value) || isFounderOpportunity(value);
}

function isOpportunityScore(value: unknown): value is OpportunityScore {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.scoreId === "string" &&
    typeof value.keyword === "string" &&
    typeof value.score === "number" &&
    typeof value.tier === "string" &&
    isRecord(value.signals)
  );
}

function isFounderOpportunity(value: unknown): value is FounderOpportunity {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kind === "founder-opportunity" &&
    typeof value.id === "string" &&
    typeof value.placeId === "string" &&
    typeof value.opportunityScore === "number" &&
    Array.isArray(value.firedSignals)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
