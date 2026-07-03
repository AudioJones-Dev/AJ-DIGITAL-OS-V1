# Approval Inbox — Build Status & Backend Handoff

Tracks the gap between [`APPROVAL_INBOX_SCREEN_SPEC.md`](APPROVAL_INBOX_SCREEN_SPEC.md) and the
shipped `ui/dashboard` implementation.

## Status

**Frontend: built & verified.** Backend read/decision endpoints: **pending (Codex lane).**

Delivered in `ui/dashboard`:

| File | Change |
|---|---|
| `src/lib/types.ts` | `ApprovalRequest` + related types (mirrors `src/security/approvals/approval-types.ts`) |
| `src/lib/queries.ts` | `fetchApprovals()` (fail-closed), `decideApproval()` |
| `src/components/ApprovalInbox.tsx` | Master–detail screen: queue, per-item tenant, risk/impact panel, rationale, decision actions, states, ARIA |
| `src/App.tsx` | `/approvals` route (operator-only; client view redirects) + operator nav entry |

Verified: `tsc -b` clean, `vite build` clean, rendered in-browser (routing, populated
master-detail, decision panel, fail-closed error state, ARIA landmarks/labels/live-region;
no console errors).

## Spec conformance

Met: tenant shown per item · risk visible at point of decision · Approve/Deny at equal
visual weight · inline two-step deny confirm · Request-clarification action · loading /
empty / error / decided states · keyboard-navigable request list · `aria-live` status
announcements · **fail-closed** (approvals-service error is visually distinct from "empty"
and warns "do not assume the queue is empty").

## Backend dependency (Codex — build off `main`)

Expose two routes on `hermes-status-api.ts` (port 7420), delegating to
`defaultApprovalService` (already used by CLI + Telegram):

```
GET  /approvals
  -> 200 { ok: true, data: ApprovalRequest[] }   // pending (+ optional ?status= filter)
  -> 5xx { ok: false, error }                     // UI fails closed on non-200

POST /approvals/:id/decision
  body: { decision: "approve" | "deny", actorId: string, channel: "dashboard" }
  -> 200 { ok: true, data: ApprovalRequest }      // updated record
  -> 4xx/5xx { ok: false, error }
```

`ApprovalRequest` shape = `src/security/approvals/approval-types.ts`. The dashboard is
already a declared `ApprovalChannel`.

## Deliberately deferred (YAGNI — build when the data/needs exist)

- **Agent-active state** — `ApprovalRequest` has no "agent-preparing" field; not faked. Add a
  `preparationStatus` field first, then surface it.
- **Multi-tenant fail-closed** — single `clientId` today can't express a cross-tenant span.
- **Global tenant-context header** — separate slice (Principle 3); the inbox shows tenant per item.
- **Audit-trail deep link** — no audit screen yet; `auditId` shown as text, no dead link.
- **Per-user auth** — decisions post `actorId: "dashboard-operator"`; real identity is backend auth.
- **Design tokens** — screen uses the existing inline-style palette; token migration is a cross-cutting slice.
