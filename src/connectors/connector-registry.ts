import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { OSConnector } from "./connector-types.js";

function registryPath(): string {
  return process.env["AJ_CONNECTOR_REGISTRY_PATH"] ?? path.resolve("runtime", "connectors", "registry.json");
}

function ensureDir(): void {
  const dir = path.dirname(registryPath());
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function load(): OSConnector[] {
  ensureDir();
  const filePath = registryPath();
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as OSConnector[];
  } catch {
    return [];
  }
}

function save(connectors: OSConnector[]): void {
  ensureDir();
  writeFileSync(registryPath(), JSON.stringify(connectors, null, 2), "utf-8");
}

export function registerConnector(connector: OSConnector): void {
  const list = load();
  const idx = list.findIndex((c) => c.id === connector.id);
  if (idx === -1) {
    list.push(connector);
  } else {
    list[idx] = connector;
  }
  save(list);
}

export function getConnector(id: string): OSConnector | null {
  return load().find((c) => c.id === id) ?? null;
}

export function listConnectors(filter?: { enabled?: boolean; riskLevel?: string }): OSConnector[] {
  let list = load();
  if (filter?.enabled !== undefined) list = list.filter((c) => c.enabled === filter.enabled);
  if (filter?.riskLevel !== undefined) list = list.filter((c) => c.riskLevel === filter.riskLevel);
  return list;
}

export function enableConnector(id: string): void {
  const list = load();
  const c = list.find((x) => x.id === id);
  if (c) { c.enabled = true; save(list); }
}

export function disableConnector(id: string): void {
  const list = load();
  const c = list.find((x) => x.id === id);
  if (c) { c.enabled = false; save(list); }
}

/** Auto-register default connector definitions (disabled by default) */
export function initDefaultConnectors(defaults: OSConnector[]): void {
  const list = load();
  for (const def of defaults) {
    if (!list.find((c) => c.id === def.id)) {
      list.push(def);
    }
  }
  save(list);
}
