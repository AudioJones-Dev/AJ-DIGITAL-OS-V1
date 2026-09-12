# ajdigital.app — DMARC Remediation (SEPARATE PLAN)

**Status:** DEFERRED — not part of the tyronenelms.com change. Not approved. Not applied.
**Date:** 2026-07-30

Split out of the tyronenelms.com plan at human direction so the two changes stay independent.

---

## Finding

`ajdigital.app` has SPF and DKIM but **no DMARC record at all**.

| Control | State |
|---|---|
| SPF | ✅ `v=spf1 include:_spf.google.com ~all` |
| DKIM | ✅ `google._domainkey.ajdigital.app` present |
| DMARC | ❌ **`_dmarc.ajdigital.app` does not exist** |

Verified by direct resolution against `1.1.1.1` and by full zone read (28 records).

**Impact:** with no DMARC policy, receivers have no publishable instruction for handling
unauthenticated mail claiming to be from `ajdigital.app`, and no aggregate reporting exists —
so spoofing against the primary corporate domain is neither mitigated nor visible.

---

## Estate-wide DMARC posture

| Domain | Mail | SPF | DMARC |
|---|---|---|---|
| ajdigital.app | google | ✅ | ❌ **missing** |
| weareajdigital.com | google | ✅ | ❌ **missing** |
| audiojones.com | google | ✅ | ⚠️ present but defective |
| floridaplatformliftpros.com | zoho | ✅ | ❌ missing |

**`audiojones.com` defect:** `v=DMARC1; p=quarantine; rua=mailto:you@audiojones.com;`
The `you@` is an uncustomized template placeholder. Policy is enforcing at `p=quarantine` while
aggregate reports are very likely being sent to a non-existent mailbox — enforcement without
visibility, the worst combination. **Treat as higher priority than the missing records.**

---

## Proposed change set (NOT approved)

Staged rollout. One record per domain, monitor before enforcing.

### Phase 1 — establish reporting, enforce nothing
| Zone | Op | Type | Name | Content |
|---|---|---|---|---|
| ajdigital.app | ADD | TXT | `_dmarc.ajdigital.app` | `v=DMARC1; p=none; rua=mailto:dmarc@ajdigital.app; fo=1` |
| weareajdigital.com | ADD | TXT | `_dmarc.weareajdigital.com` | `v=DMARC1; p=none; rua=mailto:dmarc@weareajdigital.com; fo=1` |
| audiojones.com | **MODIFY** | TXT | `_dmarc.audiojones.com` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@audiojones.com; fo=1` |

Requires a `dmarc@` alias on each domain first, or reports go nowhere — the exact defect being
fixed on `audiojones.com`. **Aliases before records.**

Same-domain `rua` throughout, avoiding RFC 7489 external-destination authorization records.

### Phase 2 — after ≥30 days of clean reports
`p=none` → `p=quarantine` → `p=reject`, one step at a time, per domain.

⚠️ **`audiojones.com` is the only MODIFY in this plan** and the only place where prior state is
overwritten. Capture the exact current value before touching it:
`v=DMARC1; p=quarantine; rua=mailto:you@audiojones.com;`
Rollback = restore that string verbatim.

---

## Rollback

- **ajdigital.app / weareajdigital.com:** delete the added TXT by id. Returns to no-DMARC —
  the current state. Zero risk.
- **audiojones.com:** restore the original string above. Policy level is unchanged by the fix
  (`p=quarantine` before and after), so mail flow is unaffected either way — only the report
  destination changes.

## Validation

1. `TXT _dmarc.<domain>` resolves via `1.1.1.1` and `8.8.8.8`, exactly one `v=DMARC1` string
2. Send a test message; confirm `dmarc=pass` in received headers
3. Confirm an aggregate report actually arrives at the new `rua` mailbox within 24–48h —
   **this is the test `audiojones.com` would have failed**
4. Regression: mail flow on each domain unchanged

## Gate

Requires its own human approval. Must not be bundled into the tyronenelms.com apply.
