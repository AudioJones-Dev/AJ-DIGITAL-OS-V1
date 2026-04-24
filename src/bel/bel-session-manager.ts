/**
 * BEL Session Manager — maps agent → named browser sessions.
 *
 * Keeps an in-memory registry of active BEL sessions.  Sessions are
 * keyed by a composite of agentId + sessionName so agents can maintain
 * multiple named contexts simultaneously.
 */

import { randomUUID } from "node:crypto";
import type { BelSession } from "./bel-types.js";

const TAG = "[BEL-SESSION]";

const sessions = new Map<string, BelSession>();

function compositeKey(agentId: string, sessionName: string): string {
  return `${agentId}::${sessionName}`;
}

/**
 * Retrieve an existing session or create a new one.
 */
export function getOrCreateSession(agentId: string, sessionName: string): BelSession {
  const key = compositeKey(agentId, sessionName);
  const existing = sessions.get(key);
  if (existing) {
    existing.lastUsedAt = new Date().toISOString();
    return existing;
  }

  const session: BelSession = {
    sessionId: randomUUID(),
    agentId,
    sessionName,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  sessions.set(key, session);
  console.log(`${TAG} Created session ${session.sessionId} for agent=${agentId} name=${sessionName}`);
  return session;
}

/**
 * Update browser state blob stored inside a session.
 */
export function updateSessionBrowserState(agentId: string, sessionName: string, state: unknown): void {
  const key = compositeKey(agentId, sessionName);
  const session = sessions.get(key);
  if (session) {
    session.browserState = state;
    session.lastUsedAt = new Date().toISOString();
  }
}

/**
 * Retrieve a session by its sessionId (for cross-component lookup).
 */
export function getSessionById(sessionId: string): BelSession | undefined {
  for (const s of sessions.values()) {
    if (s.sessionId === sessionId) return s;
  }
  return undefined;
}

/**
 * Remove a session and release its browser state.
 */
export function destroySession(agentId: string, sessionName: string): boolean {
  const key = compositeKey(agentId, sessionName);
  const removed = sessions.delete(key);
  if (removed) {
    console.log(`${TAG} Destroyed session agent=${agentId} name=${sessionName}`);
  }
  return removed;
}

/**
 * List all active sessions (for status / debugging).
 */
export function listSessions(): BelSession[] {
  return Array.from(sessions.values());
}
