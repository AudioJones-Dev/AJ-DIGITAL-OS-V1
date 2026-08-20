# AJ Digital — Estate Inventory & Target-State Delta

**Date:** 2026-07-30 · **Mode:** READ-ONLY. **Zero mutations performed.**
**Operating model adopted:** secondary domains for email-enabled domains · user aliases for
personal sending identities · Groups for role addresses · Collaborative Inbox for shared
workflows · licensed users for Gmail-API-watched mailboxes · DNS/SEO-only otherwise.

---

## 0. Capability status — WAVE 0a COMPLETE ✅

Every scope tested by minting a live delegated token.

### Post-Wave-0a matrix (2026-07-30, after Admin console changes)
| Scope | Status |
|---|---|
| `admin.directory.domain` | ✅ AUTHORIZED |
| `admin.directory.user.readonly` | ✅ AUTHORIZED |
| `admin.directory.user.alias` | ✅ AUTHORIZED |
| `siteverification` | ✅ AUTHORIZED |
| **`admin.directory.group`** | ✅ **AUTHORIZED** *(new)* |
| **`apps.groups.settings`** | ✅ **AUTHORIZED** *(new)* |
| `admin.directory.user` (write) | ❌ withheld by design — Wave 2 only |
| `admin.reports.audit.readonly` | ❌ not requested |
| `gmail.settings.basic` | ❌ not requested |

`groupssettings.googleapis.com` enabled on `aj-digital-workspace`.
Custom role *AJ Digital Domain Automation* now carries Groups **Read / Create / Update**,
**Delete withheld** — deletion therefore requires a deliberate privilege change, not merely
human restraint. Good defence in depth.

**Wave 1 is now executable as designed.** The remaining Wave 2/3/4 blockers stand.

<details><summary>Pre-Wave-0a baseline (superseded)</summary>

`admin.directory.group`, `admin.directory.group.readonly`, `apps.groups.settings`,
`admin.directory.user`, `admin.reports.audit.readonly` and `gmail.settings.basic` all returned
`unauthorized_client`. `admin.directory.group.member` was dropped from the request set as
redundant — `admin.directory.group` covers Groups, Group aliases and members.
</details>

**Consequences — the new architecture is not currently executable:**

| Capability required by the model | Blocked by |
|---|---|
| Inventory Groups, Group aliases, members, owners | `admin.directory.group.readonly` |
| Create `contact@` / `dmarc@` Groups (Wave 1) | `admin.directory.group` |
| Create Group aliases `hello@`, `inquiries@`, `media@` | `admin.directory.group` |
| Collaborative Inboxes `invoices@`, `sales@` (Wave 2) | `admin.directory.group` |
| Create licensed user `intake@` (Wave 2) | `admin.directory.user` |
| Email Log Search evidence (alias deletion gate) | `admin.reports.audit.readonly` |
| Gmail filter/forwarding evidence (alias deletion gate) | `gmail.settings.basic` |

**What IS executable today:** add a secondary domain, verify it, and create/delete **user
aliases**. That is the entire current capability surface.

**Required to proceed** — add to domain-wide delegation for client ID `114586108349797695873`,
and grant matching privileges on the "AJ Digital Domain Automation" admin role:

```
https://www.googleapis.com/auth/admin.directory.group
https://www.googleapis.com/auth/admin.directory.group.member
https://www.googleapis.com/auth/admin.directory.user
https://www.googleapis.com/auth/admin.reports.audit.readonly
```

⚠️ `admin.directory.user` is a **broad, high-privilege** scope — it permits creating, modifying,
suspending and deleting users. It is required only for Wave 2 (`intake@` licensed mailbox).
**Recommend deferring it** until Wave 2 is actually approved, rather than granting it now.

---

## 1. Google Workspace — observed state

### 1.1 Domains
| Type | Domain | Verified |
|---|---|---|
| **Primary** | `ajdigital.app` | ✅ |
| **Secondary domains** | *(none)* | — |
| **User-alias domains** | `audiojones.com` → parent `ajdigital.app` | ✅ |
| | `weareajdigital.com` → parent `ajdigital.app` | ✅ |
| | `ajdigital.app.test-google-a.com` *(Google artifact)* | ✅ |

**There are zero secondary domains in this tenant.** `tyronenelms.com` would be the first.

### 1.2 Users — 2 total
| User | Admin | Suspended | Mailbox | Editable aliases | Non-editable |
|---|---|---|---|---|---|
| `audiojones@ajdigital.app` | ✅ | No | ✅ set up | **22** | 69 |
| `agent@ajdigital.app` | No | No | ✅ set up | **0** | 3 |

`agent@ajdigital.app` is a **second licensed mailbox** — the machine-mailbox pattern the model
prescribes for Wave 2 already exists here as precedent.

### 1.3 Alias reconciliation — authoritative, via Directory API
Supersedes all earlier arithmetic (the previous "73% / 19/30 / 26/30" figures are withdrawn).

```
audiojones@ajdigital.app
  editable aliases      : 22   <- these count against the 30-per-user limit
  non-editable aliases  : 69   <- domain-generated mirrors; do NOT count
  headroom              : 8
```

The 69 non-editable are arithmetic, not configuration: **23 addresses × 3 alias domains**
(22 aliases + 1 primary). Every alias is auto-mirrored onto `audiojones.com`,
`weareajdigital.com`, and the Google test domain.

**This is the concrete case against user-alias domains.** Live examples now in existence:
```
frlwalkthroughadmintest1@audiojones.com
frlwalkthroughplatformtest1@weareajdigital.com
sweatequityacademy@audiojones.com
```
FRL test fixtures are mirrored onto the personal creator brand and the agency public domain.
Nobody chose this; the alias-domain mode did.

**Confirmed:** `audio@audiojones.com` already exists as a non-editable mirror — **no action
required to obtain it.**

### 1.4 Groups — RESOLVED 2026-07-30 (post Wave 0a)

**The tenant contains ZERO Groups.** Confirmed three independent ways:

| Method | Result |
|---|---|
| `directory.groups.list?customer=my_customer` | no `groups` property returned — 0 |
| `directory.groups.list?domain=ajdigital.app` | 0 |
| `directory.groups.list?userKey=` for both users | `audiojones@` 0 · `agent@` 0 |

Consequently: **0 Groups · 0 Group aliases · 0 members · 0 owners/managers · 0 Group settings.**
Nothing to reconcile, nothing to migrate, no naming collisions.

> ⚠️ An intermediate run reported "total groups: 1". That was a PowerShell artifact —
> `@($null)` yields a one-element array. The raw HTTP body contains only `kind` and `etag`.
> The inventory script now counts via `@($g.groups | Where-Object { $_ }).Count`.

> Per-domain queries against `audiojones.com` and `weareajdigital.com` returned repeated 503s.
> Not a coverage gap: both are **user-alias domains**, which cannot host Groups independently,
> and the customer-wide query is authoritative across the whole tenant.

**Implications for Wave 1**
1. `contact@tyronenelms.com` and `dmarc@tyronenelms.com` will be the **first Groups ever created
   in this tenant** — mirroring tyronenelms.com being the first secondary domain.
2. There is **no Collaborative Inbox precedent** here; Wave 2's `invoices@` / `sales@` design is
   unvalidated against live behaviour.
3. `apps.groups.settings` is authorized but **has never been exercised** — there is no existing
   Group to read settings from. Its first real use is Wave 1 step D2 (external posting on
   `dmarc@`), which is precisely the step the DMARC `rua` depends on.

**Wave 1 now carries three simultaneous firsts: first secondary domain, first Group, first
Groups-settings write.** Each has its own gate in the dry run; none should be assumed.

---

## 2. Cloudflare — authoritative DNS inventory, all 12 zones

Account `Bookaudiojones@gmail.com's Account` (`aed31038e91e296cb7b644ec2afc68eb`).
All 12 registered at Cloudflare Registrar, all registrar-locked, all NS-delegated to Cloudflare.

| Zone | Recs | Mail | MX | SPF | DKIM | DMARC | GVerify | Web |
|---|---|---|---|---|---|---|---|---|
| abebelewis.com | 0 | none | 0 | 0 | 0 | 0 | 0 | 0 |
| ajdigital.app | 28 | google | 5 | 1 | 3 | **0** | 1 | 16 |
| audiojones.com | 18 | google | 5 | 1 | 4 | 1 | 1 | 3 |
| biggzound.com | 0 | none | 0 | 0 | 0 | 0 | 0 | 0 |
| eighteetwentysociety.com | 0 | none | 0 | 0 | 0 | 0 | 0 | 0 |
| floridaplatformliftpros.com | 6 | **zoho** | 3 | 1 | 1 | **0** | 0 | 0 |
| floridarampandliftops.com | 11 | none | 0 | **0** | 2* | 0 | 0 | 9 |
| lustresurface.com | 0 | none | 0 | 0 | 0 | 0 | 0 | 0 |
| parisaaliyah.com | 0 | none | 0 | 0 | 0 | 0 | 0 | 0 |
| **tyronenelms.com** | **0** | none | 0 | 0 | 0 | 0 | 0 | 0 |
| vladimirlaurent.com | 0 | none | 0 | 0 | 0 | 0 | 0 | 0 |
| weareajdigital.com | 17 | google | 5 | 1 | 1 | **0** | 2 | 6 |

### 2.1 Category reconciliation — CORRECTED

A prior summary reported "6 empty zones" while listing 7, and its categories summed to 11, not 12.
**That was an arithmetic error.** Corrected, with a machine-enforced assertion:

| Category | Count | Zones |
|---|---|---|
| Empty / greenfield (0 records) | **7** | abebelewis.com, biggzound.com, eighteetwentysociety.com, lustresurface.com, parisaaliyah.com, tyronenelms.com, vladimirlaurent.com |
| Google mail | **3** | ajdigital.app, audiojones.com, weareajdigital.com |
| Zoho mail | **1** | floridaplatformliftpros.com |
| Records but no mail | **1** | floridarampandliftops.com |
| **TOTAL** | **12** | = Cloudflare zone count ✅ |

Categories are mutually exclusive and exhaustive. The registry generator now asserts
`sum(categories) == zone_count` and fails the snapshot if it does not hold — this class of
error cannot recur silently.

**SPF uniqueness:** ✅ no zone has more than one SPF record.
**DMARC gap:** missing on `ajdigital.app`, `weareajdigital.com`, `floridaplatformliftpros.com`.
`audiojones.com` has one, but `rua=mailto:you@audiojones.com` is an uncustomised placeholder.

\* **Correction — `floridarampandliftops.com` has no Google or Resend mail infrastructure.**
Its 2 "DKIM" records are **Clerk** CNAMEs (`clk._domainkey`, `clk2._domainkey` →
`*.clerk.services`), plus `clkmail.`. The site runs on **Render** (`frl-ops-portal.onrender.com`)
across 6 subdomains, with Clerk auth. There is **no MX and no SPF at all**.

> **Wave 2 risk:** the zone has zero SPF today while Clerk sends mail. Publishing a Google-only
> SPF (`v=spf1 include:_spf.google.com ~all`) would create an SPF record that **fails Clerk's
> outbound**. Wave 2 must publish a merged policy including Clerk from the outset. The Wave 2
> premise of "Resend/Supabase transactional sending" is **not present in DNS** — it is
> aspirational, not existing state.

Per-zone JSON snapshots: `snapshots/dns-<zone>-2026-07-30.json` (12 files).
Workspace snapshot: `snapshots/workspace-estate-2026-07-30.json`.

---

## 3. Target-state delta

Legend: ✅ executable now · 🔒 blocked on §0 scopes · 🟠 manual · ⏳ multi-day wait

### Wave 1 — `tyronenelms.com` *(next mutation, and only this)*
| Object | Current | Target | Delta | Status |
|---|---|---|---|---|
| Workspace domain | absent | secondary domain | ADD | ✅ |
| `tyrone@` | — | user alias → `audiojones@ajdigital.app` | ADD | ✅ |
| `contact@` | — | **Group** (distribution) | ADD | 🔒 |
| `hello@`, `inquiries@`, `media@` | — | **Group aliases** of `contact@` | ADD ×3 | 🔒 |
| `dmarc@` | — | **Group**, external posting enabled | ADD | 🔒 |
| MX | 0 | 1 × `smtp.google.com` pri 1 | ADD | ✅ |
| SPF | absent | `v=spf1 include:_spf.google.com ~all` | ADD | ✅ |
| DKIM | absent | unique 2048-bit key | ADD | ⏳🟠 |
| DMARC | absent | `p=none; rua=mailto:dmarc@tyronenelms.com; adkim=r; aspf=r` | ADD | ✅ |
| Site verification | absent | `google-site-verification=…` | ADD | ✅ |

**Alias impact: +1 editable (`tyrone@`) → 23/30, headroom 7.** `contact@`/`dmarc@` as Groups
cost **zero** alias quota — this is exactly the scaling benefit the model is designed for.
**License impact: none** (no new user).

**Dependency:** DMARC (`rua=dmarc@`) must not be published before the `dmarc@` Group exists and
accepts external mail. Since the Group is 🔒, either grant Group scope first, or publish DMARC
without `rua` initially and add it later.

### Wave 2 — `floridarampandliftops.com`
| Object | Current | Target | Status |
|---|---|---|---|
| Workspace domain | absent | secondary domain | ✅ |
| `intake@` | — | **licensed user** (Gmail API `users.watch`) | 🔒 needs `admin.directory.user` **+ a license seat** |
| `workorders@`, `evaluations@`, `servicecalls@` | — | user aliases on `intake@` | ✅ once user exists |
| `invoices@`, `sales@` | — | Collaborative Inbox Groups | 🔒 |
| MX | **none** | Google | ✅ |
| SPF | **none** | **merged: Google + Clerk** | ⚠️ see §2 |

**License impact: +1 seat — the only wave with a billing consequence.**
Aliases attach to `intake@`, not `audiojones@`, so no quota pressure.

### Wave 3 — `floridaplatformliftpros.com` *(Zoho → Google migration)*
Current: Zoho MX ×3, `v=spf1 include:zohomail.com ~all`, DKIM `zmail._domainkey`,
`zoho-verification` TXT, no DMARC, no web records.
**Treat as a mailbox migration, not an MX swap.** Recipient inventory, IMAP historical migration,
delta sync, identity mapping, and cutover-with-rollback all precede any MX change.
**Blocked additionally by:** no Zoho admin credential is present in Doppler — the source-side
inventory cannot even begin from this control plane today.

### Wave 4 — convert `audiojones.com` + `weareajdigital.com`
Current: user-alias domains, live mail, 69 auto-generated addresses depending on them.
Target: secondary domains with selective identities.
**This is a migration with live-mail blast radius.** Removing a domain alias instantly destroys
all 23 mirrored addresses on that domain. Requires per-address delivery evidence
(🔒 Email Log Search) before any conversion. **Not scheduled.**

### Wave 5 — remaining domains
| Domain | Classification | Action now |
|---|---|---|
| `eighteetwentysociety.com` | owned-venture | DNS-only until identities defined |
| `biggzound.com` | owned-venture | DNS-only |
| `lustresurface.com` | owned-venture | DNS-only, pending operational review |
| `abebelewis.com` | prospect-reserved | **DNS-only. No identities.** authority `pending` |
| `parisaaliyah.com` | client-managed | **DNS-only.** authority `review` |
| `vladimirlaurent.com` | prospect-reserved | **DNS-only. No identities.** authority `pending` |

Named-person safeguard holds: registration ownership ≠ authority to represent. No email, no
Google Business Profile, no public identity until `representation_authority: approved`.

---

## 4. Risks

| # | Risk | Severity |
|---|---|---|
| R1 | Group scope missing — Wave 1 cannot be delivered as designed | **High** |
| R2 | Wave 2 SPF would break Clerk outbound if published Google-only | **High** |
| R3 | Wave 4 conversion destroys 23 live addresses per domain on removal | **High** |
| R4 | Deletion evidence (Email Log Search, Gmail filters) unobtainable | Medium |
| R5 | `admin.directory.user` is broad; granting early widens blast radius | Medium |
| R6 | 3 zones lack DMARC; `audiojones.com` DMARC reports go nowhere | Medium |
| R7 | Zoho admin access absent — Wave 3 not startable | Medium |
| R8 | ADC credentials stale (2026-05-25); ADC-based tooling would silently misauth | Low |
| R9 | Alias headroom 8 → 7 after Wave 1; Groups model prevents further erosion | Low |

---

## 5. Manual checkpoints (all waves)

| Checkpoint | Wave | Automatable? |
|---|---|---|
| Add Group + user scopes to DWD and admin role | pre-1 | ❌ console |
| Domain verification if API linkage fails (A6 gate) | 1 | ❌ conditional |
| Activate Gmail for each new secondary domain | 1,2,3 | ❌ console |
| Generate DKIM key + Start authentication | 1,2,3 | ❌ console, ⏳ 24–72h |
| Gmail "Send mail as" for `tyrone@` | 1 | ❌ user |
| Assign a license seat to `intake@` | 2 | ❌ console/billing |
| Configure Collaborative Inbox behaviour | 2 | partial |
| Zoho-side export + IMAP migration | 3 | ❌ external |
| Wave 4 conversion window | 4 | ❌ scheduled |

---

## 6. Execution waves — recommended order

```
Wave 0a  Grant admin.directory.group + group.member (NOT user write yet)   [manual, blocking]
Wave 0b  Re-run this inventory to capture Groups                           [read-only]
Wave 1   tyronenelms.com — secondary domain + tyrone@ + Groups + auth      [the only mutation]
         └── validate the secondary-domain + Group pattern end to end
Wave 2   floridarampandliftops.com  (needs user write scope + 1 seat)
Wave 3   floridaplatformliftpros.com  (Zoho migration, needs Zoho access)
Wave 4   audiojones.com / weareajdigital.com conversion  (needs delivery evidence)
Wave 5   remaining domains, only when identities are defined
```

**Nothing beyond Wave 1 should be scheduled until Wave 1 proves the pattern.**
