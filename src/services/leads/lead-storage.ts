/**
 * Lead Storage Provider
 *
 * Abstraction over lead persistence with two modes:
 *   - neon:  Stores leads in Neon/Postgres (production)
 *   - mock:  In-memory only (development / testing)
 *
 * Provider selection:
 *   LEAD_STORAGE_PROVIDER=mock  → mock provider
 *   LEAD_STORAGE_PROVIDER=neon  → Neon (default when DATABASE_URL present)
 *
 * Production safety gate:
 *   If NODE_ENV=production and LEAD_STORAGE_PROVIDER=mock → throws immediately.
 */

import type { DbLead, InsertLead, LeadUpdateInput, QueryResult, LeadStats } from "../../db/db-types.js";
import {
  createLead as neonCreateLead,
  updateLead as neonUpdateLead,
  getLeadById as neonGetLeadById,
  listLeads as neonListLeads,
  getLeadStats as neonGetLeadStats,
} from "../../db/leads-neon.js";

const TAG = "[LEAD-STORAGE]";

// ── Provider Resolution ────────────────────────────────────────────

export type LeadStorageProvider = "neon" | "mock";

export function resolveLeadStorageProvider(): LeadStorageProvider {
  const raw = process.env.LEAD_STORAGE_PROVIDER?.trim().toLowerCase();
  if (raw === "mock") return "mock";
  return "neon";
}

/**
 * Production safety gate.
 * Call once at server startup to fail fast on misconfiguration.
 * @throws Error if mock storage is attempted in production.
 */
export function assertLeadStorageSafe(): void {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.AJ_OS_ENV === "production";
  const provider = resolveLeadStorageProvider();

  if (isProduction && provider === "mock") {
    throw new Error(
      "Mock lead storage is not allowed in production. " +
      "Set LEAD_STORAGE_PROVIDER=neon and configure DATABASE_URL.",
    );
  }
}

// ── Mock Provider ──────────────────────────────────────────────────

const mockStore: DbLead[] = [];

function mockId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mockNow(): string {
  return new Date().toISOString();
}

async function mockCreate(lead: InsertLead): Promise<QueryResult<DbLead>> {
  const now = mockNow();
  const row: DbLead = {
    id: mockId(),
    created_at: now,
    updated_at: now,
    ...lead,
  };
  mockStore.unshift(row);
  console.log(`${TAG} [MOCK] lead stored — id=${row.id} email=${row.email}`);
  return { ok: true, data: row, error: null, count: 1 };
}

async function mockUpdate(id: string, updates: LeadUpdateInput): Promise<QueryResult<DbLead>> {
  const idx = mockStore.findIndex((l) => l.id === id);
  if (idx === -1) {
    return { ok: false, data: null, error: `Lead not found: ${id}`, count: null };
  }
  const existing = mockStore[idx]!;
  const updated: DbLead = {
    ...existing,
    updated_at: mockNow(),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    ...(updates.assigned_to !== undefined ? { assigned_to: updates.assigned_to } : {}),
  };
  mockStore[idx] = updated;
  return { ok: true, data: updated, error: null, count: 1 };
}

async function mockGetById(id: string): Promise<QueryResult<DbLead>> {
  const row = mockStore.find((l) => l.id === id) ?? null;
  return { ok: true, data: row, error: row ? null : `Lead not found: ${id}`, count: row ? 1 : 0 };
}

async function mockList(limit: number): Promise<QueryResult<DbLead[]>> {
  return { ok: true, data: mockStore.slice(0, limit), error: null, count: mockStore.length };
}

async function mockStats(): Promise<QueryResult<LeadStats>> {
  return {
    ok: true,
    data: {
      total: mockStore.length,
      new_leads: mockStore.filter((l) => l.status === "new").length,
      urgent_leads: mockStore.filter((l) => l.priority === "urgent").length,
    },
    error: null,
    count: 1,
  };
}

// ── Public API ─────────────────────────────────────────────────────

export async function storeLead(lead: InsertLead): Promise<QueryResult<DbLead>> {
  const provider = resolveLeadStorageProvider();
  if (provider === "mock") return mockCreate(lead);
  return neonCreateLead(lead);
}

export async function patchLead(
  id: string,
  updates: LeadUpdateInput,
): Promise<QueryResult<DbLead>> {
  const provider = resolveLeadStorageProvider();
  if (provider === "mock") return mockUpdate(id, updates);
  return neonUpdateLead(id, updates);
}

export async function fetchLead(id: string): Promise<QueryResult<DbLead>> {
  const provider = resolveLeadStorageProvider();
  if (provider === "mock") return mockGetById(id);
  return neonGetLeadById(id);
}

export async function fetchLeads(limit = 100): Promise<QueryResult<DbLead[]>> {
  const provider = resolveLeadStorageProvider();
  if (provider === "mock") return mockList(limit);
  return neonListLeads(limit);
}

export async function fetchLeadStats(): Promise<QueryResult<LeadStats>> {
  const provider = resolveLeadStorageProvider();
  if (provider === "mock") return mockStats();
  return neonGetLeadStats();
}
