import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { OpportunityScore } from "./opportunity-scorer.js";

const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "opportunities.json");

export async function saveOpportunities(scores: OpportunityScore[]): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(STORE_PATH, JSON.stringify(scores, null, 2), "utf-8");
}

export async function loadOpportunities(): Promise<OpportunityScore[]> {
  try {
    const content = await readFile(STORE_PATH, "utf-8");
    return JSON.parse(content) as OpportunityScore[];
  } catch {
    return [];
  }
}

export async function getOpportunityById(scoreId: string): Promise<OpportunityScore | undefined> {
  const all = await loadOpportunities();
  return all.find((s) => s.scoreId === scoreId);
}

export async function getTopOpportunities(limit: number): Promise<OpportunityScore[]> {
  const all = await loadOpportunities();
  return all.sort((a, b) => b.score - a.score).slice(0, limit);
}
