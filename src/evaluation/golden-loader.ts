/**
 * L15 Evaluate step — golden-set loader.
 *
 * Golden cases live file-backed at runtime/evaluation/golden/<engine>.json and
 * are validated on load via Zod (GoldenSetSchema). A malformed file throws —
 * loudly failing CI is the intended behavior.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { EVAL_PATHS } from "./eval-store.js";
import { GoldenSetSchema } from "./eval-types.js";
import type { GoldenCase } from "./eval-types.js";

function goldenFilePath(engine: string): string {
  return join(EVAL_PATHS.goldenDir, `${engine}.json`);
}

export function loadGoldenSet(engine: string): GoldenCase[] {
  const path = goldenFilePath(engine);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  return GoldenSetSchema.parse(parsed);
}

export function listGoldenEngines(): string[] {
  if (!existsSync(EVAL_PATHS.goldenDir)) return [];
  return readdirSync(EVAL_PATHS.goldenDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

export function countGoldenCases(engine: string): number {
  return loadGoldenSet(engine).length;
}
