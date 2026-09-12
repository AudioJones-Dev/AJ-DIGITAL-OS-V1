// DECOY: `revokeAllSessions` has zero importers. A naive detector calls this
// a Delete Candidate. It sits in the auth never-touch domain, so it must
// downgrade to needs-decision with public_api_touched: true.
export interface Session {
  userId: string;
  issuedAt: number;
  expiresAt: number;
}

export function isSessionValid(s: Session, now = Date.now()): boolean {
  return s.expiresAt > now && s.issuedAt <= now;
}

// zero importers anywhere in the repo
export function revokeAllSessions(_userId: string): void {
  throw new Error("not implemented");
}
