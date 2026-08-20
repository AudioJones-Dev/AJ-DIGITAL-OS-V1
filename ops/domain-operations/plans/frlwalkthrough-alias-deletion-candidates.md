# `frlwalkthrough*` Alias — Deletion-Candidate Report

**Date:** 2026-07-30 · **Status:** READ-ONLY investigation. **Nothing deleted.**
**Verdict:** ⛔ **DO NOT DELETE.** These are live authentication identities, not orphaned cruft.

---

## Correction to prior guidance

An earlier recommendation in this workstream said these aliases were "unreferenced" and safe to
clear. **That was wrong.** The search behind it covered only `C:\dev\AJ-DIGITAL-OS`. A wider
search found direct references in `C:\dev\frl-contractor-portal`.

---

## 1. The five aliases

All are **editable** aliases on `audiojones@ajdigital.app` (Directory API confirmed).

| # | Alias | Target user | Documented role |
|---|---|---|---|
| 1 | `frlwalkthroughplatformtest1@ajdigital.app` | `audiojones@ajdigital.app` | `platform_admin` |
| 2 | `frlwalkthroughadmintest1@ajdigital.app` | `audiojones@ajdigital.app` | `admin` |
| 3 | `frlwalkthroughcontractortest1@ajdigital.app` | `audiojones@ajdigital.app` | `lead` (contractor) |
| 4 | `frlwalkthroughclienttest1@ajdigital.app` | `audiojones@ajdigital.app` | `client` |
| 5 | `Mikefrlwalkthroughadmintest1@ajdigital.app` | `audiojones@ajdigital.app` | **undocumented** |

Each also has 3 non-editable mirrors (on `audiojones.com`, `weareajdigital.com`, and the Google
test domain) — **15 additional auto-generated addresses** that vanish with the aliases.

---

## 2. Evidence

### ✅ 2.1 Application reference — FOUND, load-bearing
`C:\dev\frl-contractor-portal\docs\WALKTHROUGH-ACCOUNTS.md` names four of the five as explicit
environment overrides for the Supabase walkthrough seeding script:

```
WALKTHROUGH_PLATFORM_EMAIL   = frlwalkthroughplatformtest1@ajdigital.app
WALKTHROUGH_ADMIN_EMAIL      = frlwalkthroughadmintest1@ajdigital.app
WALKTHROUGH_CONTRACTOR_EMAIL = frlwalkthroughcontractortest1@ajdigital.app
WALKTHROUGH_CLIENT_EMAIL     = frlwalkthroughclienttest1@ajdigital.app
```

Used by `npm run supabase:seed:walkthrough`, which creates **Supabase Auth users** and
`profiles` rows in the `frl-walkthrough` tenant. These addresses back real logins exercising
role-based access control and RLS.

### ✅ 2.2 Supabase reference — FOUND
`C:\dev\frl-contractor-portal\scripts\cleanup-test-data.sql` buckets them explicitly:

```sql
when u.email like 'frlwalkthrough%test1@ajdigital.app'     then 'walkthrough (@ajdigital.app)'
when u.email like 'mikefrlwalkthrough%test1@ajdigital.app' then 'walkthrough (@ajdigital.app)'
```

They map to rows in `auth.users` and `public.profiles`. That script is a **gated, unapplied
template** — the FRL go-live cleanup has not been run.

### ⚠️ 2.3 Delivery history — PARTIAL EVIDENCE OBTAINED (revised 2026-07-30)

Email Log Search remains unobtainable (`admin.reports.audit.readonly` → `unauthorized_client`).
However, the destination mailbox `audiojones@ajdigital.app` was searched directly via an
authenticated Gmail connector:

| Query | Scope | Result |
|---|---|---|
| `to:` each of the 5 aliases | `in:anywhere` (incl. spam/trash) | **0 messages** |
| `frlwalkthrough` free-text | `in:anywhere` | **0 messages** |

**These five aliases have never received mail.**

Explanation found in `WALKTHROUGH-ACCOUNTS.md`: the seeding script creates users through the
**Supabase Admin API using `SUPABASE_SERVICE_ROLE_KEY`** and *prints temporary passwords once*.
No magic link, no confirmation email, no password-reset mail is ever sent. The aliases were
created so the addresses would be *deliverable* — a capability that has never been exercised.

⚠️ **Caveat:** Gmail search is not the authoritative instrument. Email Log Search covers
tenant-wide routing including messages rejected or routed before mailbox delivery. This is
supporting evidence, not proof.

### ⛔ 2.4 Gmail filters / forwarding — UNOBTAINABLE
Requires `gmail.settings.basic`; delegation returns `unauthorized_client`.
**Cannot be produced via API.** Manual alternative: Gmail → Settings → Filters and Forwarding.

### ➖ 2.5 n8n reference — INCONCLUSIVE
`C:\dev\n8n-ajdigital` search timed out; n8n workflows live in a database, not the repo.
**Not cleared.**

### ✅ 2.6 Forms / transactional (Resend) — none found
No match in `AJ-DIGITAL-OS` or `florida-ramp-and-lift-ops`.

---

## 3. Why deletion breaks something

Workspace aliases and Supabase Auth users are **separate systems**. Deleting the aliases does
**not** delete the Supabase accounts — it removes their ability to *receive mail*.

Password resets, magic links, email confirmations and 2FA enrolment for those four walkthrough
logins would all be delivered to addresses that no longer exist. The accounts survive; they
become **unrecoverable**. The documented walkthrough — sign in as admin → dispatch → sign in as
lead → submit → approve → verify as client — would break at the first credential refresh.

The correct sequencing is the reverse of what was proposed: **retire the Supabase walkthrough
tenant first** (via the gated `cleanup-test-data.sql` §2/§4, with operator approval), **then**
remove the now-unused Workspace aliases.

---

## 4. Two inconsistencies found

1. **`frlwalkthroughassistanttest1@ajdigital.app` is documented but does not exist.**
   `WALKTHROUGH-ACCOUNTS.md` defines an `assistant` role env override; there is no matching
   alias. The assistant walkthrough account cannot receive mail today.
2. **`Mikefrlwalkthroughadmintest1@ajdigital.app` exists but is undocumented.**
   Matched only by the SQL wildcard, not named in any doc. Provenance unknown — the single
   strongest candidate for eventual removal, but still not evidenced as unused.

---

## 5. Alias-count projection

| Scenario | Editable aliases | Headroom (limit 30) |
|---|---|---|
| Current | 22 | 8 |
| After Wave 1 (`tyrone@` only; Groups carry the rest) | 23 | 7 |
| If all 5 were deleted (**not recommended**) | 17 | 13 |
| Wave 1 + hypothetical deletion | 18 | 12 |

**Quota is not the binding constraint.** Wave 1 needs one alias slot and eight are free. The
Groups model removes quota pressure structurally — deleting these aliases buys headroom that is
not needed, at the cost of breaking a live rehearsal environment.

---

## 6. Recommendation — REVISED 2026-07-30

**Do not delete. Not now, and not as a precondition for Wave 1.**
*The conclusion is unchanged; the reasoning is corrected and weaker than first stated.*

**What changed:** §2.3 found zero delivery ever, and the seeding flow sets passwords directly
rather than emailing them. The original claim — that deletion would "strand password-reset and
magic-link delivery" — **overstated the risk.** No such mail flows today.

**Why the verdict still holds** — it now rests on cost/benefit, not on imminent breakage:

| | |
|---|---|
| **Upside of deleting now** | +5 alias slots. Wave 1 needs **1**. **8 are already free.** Zero practical benefit. |
| **Downside** | The Supabase walkthrough tenant and its `auth.users` rows are **still live and unretired**. Any future password reset, 2FA enrolment (step 7 of the documented walkthrough), or Supabase-side confirmation mail would have nowhere to land. |
| **Reversibility** | Recreating an alias is trivial — but only if the exact strings survive. They are recorded in §1 of this document. |

Deleting buys headroom that is not needed, against a live-but-dormant dependency. **Correct order
remains: retire Supabase first, then the aliases.**

Revisit only when **all** hold:
1. FRL go-live completes and the walkthrough tenant is formally retired
2. `cleanup-test-data.sql` §2/§4 has been run with operator approval, removing the Supabase users
3. Email Log Search confirms no delivery in ≥90 days *(needs `admin.reports.audit.readonly`)*
4. Gmail filters/forwarding confirm no dependency *(needs `gmail.settings.basic`)*
5. n8n workflow store is searched directly
6. The `assistant` / `Mike` inconsistencies are resolved deliberately

Until then these are **in-use infrastructure**, and this report is the evidence record.
