import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface VendorDomainConfig {
  booking: string[];
  chat: string[];
  aiReceptionist: string[];
}

export const DEFAULT_VENDOR_DOMAIN_CONFIG_PATH = join(
  process.cwd(),
  "config",
  "founder-opportunity-engine",
  "vendor-domains.json",
);

export async function loadVendorDomainConfig(
  filePath = DEFAULT_VENDOR_DOMAIN_CONFIG_PATH,
): Promise<VendorDomainConfig> {
  const raw = await readFile(filePath, "utf8");
  return normalizeVendorDomainConfig(JSON.parse(raw));
}

export function normalizeVendorDomainConfig(input: unknown): VendorDomainConfig {
  if (!isRecord(input)) {
    throw new Error("Vendor domain config must be an object.");
  }

  return {
    booking: normalizeDomainList(input.booking, "booking"),
    chat: normalizeDomainList(input.chat, "chat"),
    aiReceptionist: normalizeDomainList(input.aiReceptionist, "aiReceptionist"),
  };
}

export function hostnameMatchesDomain(hostname: string, configuredDomain: string): boolean {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedDomain = normalizeHostname(configuredDomain);
  return normalizedHostname === normalizedDomain || normalizedHostname.endsWith(`.${normalizedDomain}`);
}

export function anyHostnameMatches(hostnames: readonly string[], configuredDomains: readonly string[]): boolean {
  return hostnames.some((hostname) =>
    configuredDomains.some((configuredDomain) => hostnameMatchesDomain(hostname, configuredDomain)),
  );
}

export function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function normalizeDomainList(value: unknown, key: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Vendor domain config key "${key}" must be an array.`);
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => normalizeHostname(item));
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
