# tyronenelms.com — Implementation Plan (REV 3)

**Date:** 2026-07-30 · **Revision:** 3
**Status:** Audit accepted. Reauth + T1 read-only gate authorized. **No Workspace or DNS writes.**

---

## Decision log

| Date | Decision | By | Status |
|---|---|---|---|
| 2026-07-30 | Workspace mode = **secondary domain** | Human | Approved |
| 2026-07-30 | Mirror `CLOUDFLARE_DNS_API_TOKEN` → `.../prd` | Human | **Applied & verified** |
| 2026-07-30 | REV 2: single modern MX · account-token verify · record recount · DMARC split out | Human | Incorporated |
| 2026-07-30 | REV 3: 8 sequencing/verification requirements (below) | Human | Incorporated |
| 2026-07-30 | Proceed with interactive reauth + T1 gate only | Human | **In progress** |

### REV 3 requirements incorporated
1. `dmarc@tyronenelms.com` alias created **before** the DMARC `rua` destination is published
2. DMARC value drops `fo=1` — no `ruf` destination is configured
3. **Activate Gmail** modelled as a manual Admin checkpoint after MX publication
4. **DKIM** modelled as a *potentially delayed* manual checkpoint — Google may require 24–72h after Gmail activation
5. Site Verification → Workspace domain verification treated as **unproven until observed live**; hard gate on `directory.domains.get`
6. Gmail **Send mail as** is a manual user step, never assumed automatic
7. Rollback extended to delete the Site Verification **webResource** after its DNS token
8. **Exact record count retired as an invariant** — replaced by a per-record managed manifest

**No DNS record, Workspace, IAM, billing, or domain change has been made.**
Only change to date: the Doppler secret mirror.
Rollback: `doppler secrets delete CLOUDFLARE_DNS_API_TOKEN --project aj-digital-infrastructure --config prd`

---

## 1. DNS change set

Zone `tyronenelms.com` · id `119fbdb4d2a04cbaeaa149596dadefdf` · current state **0 records**

### Values known now
| # | Type | Name | Content | Prio | TTL |
|---|---|---|---|---|---|
| R1 | MX | `tyronenelms.com` | `smtp.google.com` | 1 | 3600 |
| R2 | TXT | `tyronenelms.com` | `v=spf1 include:_spf.google.com ~all` | — | 3600 |
| R3 | TXT | `_dmarc.tyronenelms.com` | `v=DMARC1; p=none; rua=mailto:dmarc@tyronenelms.com; adkim=r; aspf=r` | — | 3600 |

**R3 (REV 3):** `fo=1` removed. `fo` governs *forensic/failure* reporting and is meaningful only
alongside a `ruf` destination. With no `ruf` configured it is inert at best and misleading at
worst — it implies a failure-reporting channel that does not exist.

### Values generated at apply
| # | Type | Name | Content | Source |
|---|---|---|---|---|
| G1 | TXT | `tyronenelms.com` | `google-site-verification=<TOKEN>` | Site Verification API |
| G2 | TXT | `google._domainkey.tyronenelms.com` | `v=DKIM1; k=rsa; p=<PUBKEY>` | Admin console, **new 2048-bit key** |

Two TXT records coexist at apex (R2 + G1) — valid. Exactly one SPF record.
**Never copy the `ajdigital.app` DKIM key.**

---

## 2. Execution sequence

Legend: 🔵 API-automated · 🟠 manual Admin/user step · 🔴 hard gate · ⏳ possible multi-day wait

### Phase A — Ownership & domain registration
| Step | Kind | Action |
|---|---|---|
| A1 | 🔵 | `directory.users.get` → confirm subject `isAdmin: true` |
| A2 | 🔵 | `siteVerification.webResource.getToken` (`DNS_TXT`) |
| A3 | 🔵 | Cloudflare `POST /dns_records` → publish **G1** |
| A4 | 🔵 | `siteVerification.webResource.insert` → site-verification ownership |
| A5 | 🔵 | `directory.domains.insert` → add **secondary domain** |
| **A6** | 🔴 | **`directory.domains.get` → GATE.** Continue **only if `verified: true`** |

**A6 — REV 3 requirement 5.** The relationship between Site Verification API ownership and
Workspace domain verification is **unproven**. Site Verification proves ownership of a *web
resource*; Workspace domain verification is a distinct state. They are widely assumed to be the
same transaction. **We do not assume it.**

If `verified: false` → **STOP.** Do not proceed to Phase B. Present the required manual step:
Admin console → Account → Domains → Manage domains → `tyronenelms.com` → **Verify domain**,
then re-run A6. Record the observed behaviour — this resolves the open question permanently for
every future domain in the control plane.

### Phase B — Mail exchange
| Step | Kind | Action |
|---|---|---|
| B1 | 🔵 | Cloudflare `POST /dns_records` → publish **R1** (MX) |

### Phase C — Activate Gmail 🟠
| Step | Kind | Action |
|---|---|---|
| C1 | 🟠 | **Admin console → Apps → Google Workspace → Gmail → activate Gmail for `tyronenelms.com`** |
| C2 | 🔵 | Re-read domain state; record activation timestamp — **starts the DKIM clock** |

**REV 3 requirement 3.** Gmail activation for a newly added secondary domain is a manual Admin
action that does not follow automatically from adding the domain. It gates DKIM availability.

### Phase D — Groups, SPF, DMARC *(REV 4 — Group architecture)*
| Step | Kind | Action | Scope |
|---|---|---|---|
| D1 | 🔵 | `directory.groups.insert` → **`dmarc@tyronenelms.com`** (technical-reporting) | `admin.directory.group` |
| D2 | 🔵 | `groupsSettings.update` on `dmarc@` → **allow external posting** | `apps.groups.settings` |
| D3 | 🔵 | `directory.members.insert` → add `audiojones@ajdigital.app` | `admin.directory.group` |
| D4 | 🔵 | Send a live external test to `dmarc@` and confirm delivery | — |
| D5 | 🔵 | `directory.groups.insert` → **`contact@tyronenelms.com`** (distribution) | `admin.directory.group` |
| D6 | 🔵 | `directory.groups.aliases.insert` ×3 → `hello@`, `inquiries@`, `media@` | `admin.directory.group` |
| D7 | 🔵 | `directory.members.insert` → add `audiojones@ajdigital.app` to `contact@` | `admin.directory.group` |
| D8 | 🔵 | Cloudflare `POST /dns_records` → publish **R2** (SPF) | Cloudflare |
| D9 | 🔵 | Cloudflare `POST /dns_records` → publish **R3** (DMARC) | Cloudflare |

**Ordering is mandatory (REV 3 requirement 1, extended for Groups).** `D1 → D2 → D3 → D4 → D9`.

A Group is a *stricter* precondition than a user alias was: Groups reject external senders by
default, and **DMARC aggregate reports arrive exclusively from external senders** (Google,
Microsoft, Yahoo…). Creating `dmarc@` without D2 produces a destination that exists and still
silently discards every report — a subtler version of the `audiojones.com` defect.

**D4 is a hard gate.** Do not publish R3 until a real external message has been observed arriving
at `dmarc@`. Group existence is not sufficient evidence of deliverability.

**Alias-quota impact: zero.** Groups and Group aliases do not consume the 30-per-user limit.

### Phase E — DKIM ⏳🟠
| Step | Kind | Action |
|---|---|---|
| E1 | ⏳🟠 | Admin console → Gmail → **Authenticate email** → select `tyronenelms.com` → Generate new record (2048-bit) |
| E2 | 🔵 | Cloudflare `POST /dns_records` → publish **G2** |
| E3 | 🟠 | Admin console → **Start authentication** |

**REV 3 requirement 4 — E1 may be unavailable for 24–72 hours after C1.** Google commonly
withholds DKIM key generation for a newly activated domain during this window. The domain may be
absent from the Authenticate-email selector, or generation may fail.

**This is an expected wait state, not a failure.** Do not retry in a tight loop, do not treat it
as a blocker requiring rollback, and do not work around it. Mail flows correctly on SPF alone
during the wait; DKIM and full DMARC alignment complete afterward. Model as:

```
E1 state: PENDING_GOOGLE_PROPAGATION
  earliest_retry: C1 + 24h
  escalate_if_unavailable_after: C1 + 72h
```

### Phase F — Personal sending identity
| Step | Kind | Action |
|---|---|---|
| F1 | 🔵 | `directory.users.aliases.insert` → **`tyrone@tyronenelms.com`** → `audiojones@ajdigital.app` |
| F2 | 🔵 | `directory.users.aliases.list` → confirm |

**`tyrone@` is the only user alias in Wave 1.** It is a user alias — not a Group — specifically
because Tyrone must *send from* it (Phase G). Everything inbound-only is a Group.

**Alias quota: 22 → 23 of 30. Headroom 7.** Under the old all-aliases design this phase would
have consumed 4 slots; the Group model costs 1.

### Wave 1 final object model
```
audiojones@ajdigital.app                    (existing user, unchanged)
└── tyrone@tyronenelms.com                  user alias      — personal sending identity

contact@tyronenelms.com                     Group           — distribution
├── hello@tyronenelms.com                   Group alias
├── inquiries@tyronenelms.com               Group alias
└── media@tyronenelms.com                   Group alias

dmarc@tyronenelms.com                       Group           — technical reporting,
                                                              external posting ENABLED
```
Licences consumed: **0.** User-alias slots consumed: **1.**

### Phase G — Send mail as 🟠
| Step | Kind | Action |
|---|---|---|
| G1s | 🟠 | Gmail → Settings → Accounts → **Send mail as** → confirm `tyrone@tyronenelms.com` present; add manually if absent |

**REV 3 requirement 6.** Not assumed automatic. Outbound-from-alias is unverified until a human
confirms this in Gmail. T4.3/T4.4 cannot run before it.

### Phase H — Validation
Run T2–T5 (§5).

### Unattended-execution reality
Manual checkpoints at **A6 (conditional), C1, E1, E3, G1s** — with a possible multi-day pause at
E1. This is a **human-in-the-loop workflow with a long-running wait state**, not a script.

---

## 3. Managed-record manifest (replaces the record-count invariant)

**REV 3 requirement 8.** An exact total (`records == 5`) is brittle: it breaks the moment a
website, a Search Console token, or any legitimate record is added, and it conflates "our records
are correct" with "nothing else exists." Retired.

Each managed record is validated **independently** by type + name + content predicate + the
Cloudflare record id recorded at creation:

| Key | Type | Name | Content predicate | ID |
|---|---|---|---|---|
| `mx.primary` | MX | `tyronenelms.com` | `== smtp.google.com` ∧ priority `== 1` | recorded at apply |
| `txt.spf` | TXT | `tyronenelms.com` | starts with `v=spf1` ∧ contains `include:_spf.google.com` | recorded at apply |
| `txt.dmarc` | TXT | `_dmarc.tyronenelms.com` | starts with `v=DMARC1` | recorded at apply |
| `txt.site_verification` | TXT | `tyronenelms.com` | starts with `google-site-verification=` | recorded at apply |
| `txt.dkim` | TXT | `google._domainkey.tyronenelms.com` | starts with `v=DKIM1` ∧ `p=` non-empty | recorded at apply |

**Validation semantics**
- **Managed record missing** → ❌ FAIL
- **Managed record content drift** → ❌ FAIL
- **Managed record id changed** → ⚠️ WARN (recreated out-of-band; re-record and continue)
- **Unexpected record present** → ℹ️ **REPORT, do not fail** — listed separately as unmanaged drift for human review
- **Global uniqueness assertion** → exactly one `v=spf1` TXT at apex ❌ if violated
  *(the one count-style check that is genuinely an invariant, because RFC 7208 makes >1 SPF record invalid)*

This generalises across all 12 domains and survives future website/SEO records.

---

## 4. Rollback

Zone began at **0 records** — nothing pre-existing is overwritten at any step.
**Prerequisite:** AFTER snapshot capturing every created record id.

| Order | Undo | Method | Reverses |
|---|---|---|---|
| 1 | Remove aliases (`tyrone@`, `hello@`, `contact@`) | `directory.users.aliases.delete` | F1–F2 |
| 2 | Stop DKIM signing | Admin console → Stop authentication | E3 |
| 3 | Delete G2 (DKIM TXT) | `DELETE /zones/{zid}/dns_records/{id}` | E2 |
| 4 | Delete R3 (DMARC) | `DELETE /zones/{zid}/dns_records/{id}` | D4 |
| 5 | Delete R2 (SPF) | `DELETE /zones/{zid}/dns_records/{id}` | D3 |
| 6 | Remove `dmarc@` alias | `directory.users.aliases.delete` | D1 |
| 7 | Deactivate Gmail for the domain | Admin console | C1 |
| 8 | Delete R1 (MX) | `DELETE /zones/{zid}/dns_records/{id}` | B1 |
| 9 | Remove secondary domain | `directory.domains.delete` — rollback-only, explicit approval still required | A5 |
| 10 | Delete G1 (verification TXT) | `DELETE /zones/{zid}/dns_records/{id}` | A3 |
| **11** | **Delete Site Verification webResource** | **`siteVerification.webResource.delete`** | **A4** |

**Step 11 is REV 3 requirement 7.** Deleting the DNS token alone leaves an orphaned verified
webResource in the Site Verification service — residual state that would not be reversed, and
that could mask a genuine re-verification failure on a later re-add. Order matters: **DNS token
first (10), then webResource (11)** — deleting the webResource while its proof record is still
published invites automatic re-verification.

**End state:** zone at 0 records matching the BEFORE snapshot; Workspace domain list restored;
no orphaned webResource. `audiojones@ajdigital.app` untouched throughout.

**Not reversed because never changed:** nameservers · registrar · registrar lock · billing · IAM ·
org policy · any other zone.

**Partial-failure rollback:** every phase independently reversible. Stopping at the A6 gate needs
only steps 10 → 11. Failing at E1 needs 4 → 11; mail was never fully live, nothing is lost.

**Reversibility: HIGH.**

---

## 5. Validation tests

### T1 — Pre-apply read-only gate *(authorized to run now)*
| ID | Test | Pass condition |
|---|---|---|
| T1.1 | `gcloud auth list` | active `audiojones@ajdigital.app`, no reauth error |
| T1.2 | `gcloud config get-value project` | `aj-digital-workspace` |
| T1.3 | `gcloud billing projects describe` | `billingEnabled: true` |
| T1.4 | `gcloud iam service-accounts describe` | exists, `disabled: false` |
| T1.5 | SA IAM policy | `roles/iam.serviceAccountTokenCreator` → `audiojones@ajdigital.app` |
| T1.6 | Keyless `directory.domains.list` | `ajdigital.app primary=True verified=True` |
| T1.7 | `directory.users.get` subject | `isAdmin: true` |
| T1.8 | `GET /accounts/{id}/tokens/verify` | `status: active` |
| T1.9 | `GET /zones` | 12 zones |
| T1.10 | `GET /zones/{tyronenelms}/dns_records` | still 0 — no drift since BEFORE snapshot |

#### T1 RESULTS — executed 2026-07-30 · **PASS (10/10)**
| ID | Observed | Result |
|---|---|---|
| T1.1 | `audiojones@ajdigital.app` active | ✅ |
| T1.2 | `aj-digital-workspace` | ✅ |
| T1.3 | `billingEnabled: True` · `billingAccounts/016CE3-060D0B-D79A9F` | ✅ |
| T1.4 | SA exists, not disabled, `oauth2ClientId 114586108349797695873` — matches handoff | ✅ |
| T1.5 | `roles/iam.serviceAccountTokenCreator` → `user:audiojones@ajdigital.app` | ✅ |
| T1.6 | Keyless signJwt → JWT-bearer exchange → `domains.list` returned `ajdigital.app primary=True verified=True` | ✅ |
| T1.7 | `isAdmin: True`, `suspended: False` | ✅ |
| T1.8 | CF account token `status: active` | ✅ |
| T1.9 | 12 zones | ✅ |
| T1.10 | tyronenelms.com `total_count: 0` — no drift | ✅ |

**Keyless DWD is confirmed working end-to-end.** No service-account key was created; org policy
`constraints/iam.disableServiceAccountKeyCreation` untouched.

**Environment defect (non-blocking):** `gcloud auth login` completed the OAuth flow but failed
writing `legacy_credentials\audiojones@ajdigital.app\adc.json` (Errno 13, permission denied). The
primary credential store wrote correctly and all API calls work. Both that legacy file and
`application_default_credentials.json` remain stale (2026-05-25). **Consequence:** any tooling
relying on ADC rather than `gcloud auth print-access-token` will use stale credentials. This plan
uses `print-access-token` throughout and is unaffected. Worth repairing separately.

#### T1.11 — NEW: alias quota (added post-T1)
| Item | Value |
|---|---|
| Current aliases on `audiojones@ajdigital.app` | **22** |
| Google per-user limit | 30 |
| This plan adds | 4 (`tyrone@`, `dmarc@`, `hello@`, `contact@`) |
| Post-apply | **26** — headroom **4** |

Aliases count against the per-user limit **across all domains**, so tyronenelms.com addresses
consume the same 30. The plan fits, but headroom is thin.

**5 slots are consumed by test cruft:** `frlwalkthroughcontractortest1@`, `frlwalkthroughadmintest1@`,
`frlwalkthroughclienttest1@`, `frlwalkthroughplatformtest1@`, `Mikefrlwalkthroughadmintest1@`.
Removing them would restore headroom to 9. **Recommended but not required** — separate change,
separate approval, and alias deletion is a mutation.

#### T1.12 — NEW: Workspace domain inventory (observed)
`directory.domains.list` returns **only `ajdigital.app`**. `directory.domainAliases.list` returns:

| Domain alias | Parent | Verified |
|---|---|---|
| `weareajdigital.com` | ajdigital.app | true |
| `audiojones.com` | ajdigital.app | true |
| `ajdigital.app.test-google-a.com` | ajdigital.app | true *(Google artifact)* |

**Architectural drift:** `weareajdigital.com` and `audiojones.com` are **user alias domains**, not
secondary domains — the exact pattern rejected for tyronenelms.com. They auto-mirror every user
and alias. Recorded in `../registry.yaml`; **out of scope here**, needs its own plan.

**Useful consequence:** `audio@audiojones.com` **already resolves** (mirrors `audio@ajdigital.app`).
No action needed to obtain it.

**Consequence for this plan:** tyronenelms.com will be the **first true secondary domain** in this
Workspace. The A6 gate is therefore genuinely unproven here — there is no precedent in this tenant.

### T2 — Domain registration gate
| T2.1 | `directory.domains.get` | `verified: true`, `isPrimary: false` — **hard gate A6** |

### T3 — DNS, per managed-record manifest (§3), resolved against `1.1.1.1` **and** `8.8.8.8`
| ID | Check | Expected |
|---|---|---|
| T3.1 | `mx.primary` | one MX `smtp.google.com` pri 1 |
| T3.2 | `txt.spf` | exactly one `v=spf1` string at apex |
| T3.3 | `txt.site_verification` | present |
| T3.4 | `txt.dkim` | `v=DKIM1`, `p=` non-empty, **≠ ajdigital.app's key** |
| T3.5 | `txt.dmarc` | `v=DMARC1; p=none; rua=…`, **no `fo=` tag** |
| T3.6 | `NS` | `desiree` + `kolton` unchanged |
| T3.7 | Unmanaged records | **reported, not failed** |

### T4 — Mail function
| ID | Test | Expected |
|---|---|---|
| T4.1 | Inbound → `dmarc@tyronenelms.com` | delivered to `audiojones@ajdigital.app` — **run before/at D4** |
| T4.2 | Inbound → `tyrone@tyronenelms.com` | delivered |
| T4.3 | Outbound **from** `tyrone@` | delivered, not spam-foldered *(requires G1s)* |
| T4.4 | T4.3 headers | `spf=pass` ∧ `dkim=pass` ∧ `dmarc=pass` *(after E3 completes)* |
| T4.5 | T4.3 DKIM `d=` tag | `d=tyronenelms.com` — **not** `d=ajdigital.app` |
| T4.6 | Regression: `audiojones@ajdigital.app` | unaffected |
| T4.7 | Regression: `MX ajdigital.app` | 5 legacy records unchanged |

**Interim state during the E1 wait:** T4.1–T4.3 and T4.6–T4.7 must pass. T4.4/T4.5 are
**expected to show `dkim=none`** until E3 completes — that is the correct interim result, not a
failure.

### T5 — Post-apply artifacts
AFTER snapshot with all record ids · manifest ids recorded · `registry.yaml` updated ·
rollback commands generated with real ids · A6 observed behaviour documented.

---

## 6. Blockers

| ID | Blocker | Status |
|---|---|---|
| B1 | gcloud auth expired | ✅ **CLEARED** — reauthed, T1 passed 10/10 |
| B2 | Super admin unconfirmed | ✅ **CLEARED** — T1.7 `isAdmin: True` |
| B3 | OAuth scopes for client `114586108349797695873` | ✅ **CLEARED for reads** — `admin.directory.domain` + `admin.directory.user.readonly` exercised successfully. `admin.directory.user.alias` and `siteverification` **still unexercised** — first proven at A2/F1 |
| B7 | Alias quota headroom only 4 post-apply (22/30 used, 5 slots on test cruft) | Open — non-blocking |
| B8 | ADC + legacy credential files stale (2026-05-25), ADC write permission-denied | Open — non-blocking, plan uses `print-access-token` |
| B9 | tyronenelms.com will be this tenant's **first** secondary domain — no precedent for the A6 linkage | Open — gated at A6 |
| B4 | Cloudflare token lacks Registrar:Read — auto-renew unverifiable estate-wide | Open |
| B5 | DKIM requires human at console, possibly delayed 24–72h | Accepted platform constraint |
| B6 | Site Verification → Workspace verification linkage unproven | Gated at A6 |
