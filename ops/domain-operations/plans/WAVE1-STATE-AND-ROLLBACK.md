# Wave 1 — Live State & Rollback Register

**Last updated:** 2026-08-01 15:58 UTC
**Status:** ⏸ **PAUSED — Phases A–G complete. H and I blocked on human-only steps.**

> ⚠️ **DATING CORRECTION.** Artifacts in this workstream carry `2026-07-30` in their filenames
> and some body text. **The correct date of execution is 2026-08-01** (verified against the system
> clock: `2026-08-01 15:58 UTC`). The error came from reading RDAP's *"last update of RDAP
> database"* field — which reports when the registry's own mirror refreshed, **not** today's date —
> and propagating it as the capture date.
> Filenames are left unchanged because they are cross-referenced throughout; treat every
> `-2026-07-30` suffix as **"Wave 0/1 execution set, produced 2026-08-01."**
> Machine-generated timestamps inside the snapshots (`captured_at_utc`) are accurate — only
> hand-written date labels were wrong.

---

## 1. Manual checkpoints completed (human-observed)

| # | Checkpoint | Recorded | Evidence |
|---|---|---|---|
| M1 | Domain verification via Admin console | 2026-07-30 | `domains.get → verified: true` (API-confirmed, not screenshot) |
| M2 | **Activate Gmail for tyronenelms.com** | 2026-07-30 | Human-observed: "Gmail activated / ready". Google warns routing propagation may take **up to 24 h**. **This started the DKIM clock.** |

---

## 2. Resource register — everything created

### Cloudflare · zone `119fbdb4d2a04cbaeaa149596dadefdf` — 3 records
| Key | Record ID | Type | Name | Content | Prio | TTL |
|---|---|---|---|---|---|---|
| `txt.site_verification` | `0b4fcbff5036a8919a34617dd1aad597` | TXT | tyronenelms.com | `google-site-verification=ERtQVkqsgpGwid89wrV7hJOSECII5VVWu-c6jqArWgA` | — | 3600 |
| `mx.primary` | `0b7bf9856736f858a26487bea56f97f7` | MX | tyronenelms.com | `smtp.google.com` | 1 | 3600 |
| `txt.spf` | `35c64df290bdf8a0cab4d21e1ee366f6` | TXT | tyronenelms.com | `v=spf1 include:_spf.google.com ~all` | — | 3600 |

Propagation confirmed on `1.1.1.1` **and** `8.8.8.8`. **Exactly one SPF record** — RFC 7208 invariant holds.

### Google Workspace
| Object | Identifier | Detail |
|---|---|---|
| Secondary domain | `tyronenelms.com` | `isPrimary=false`, `verified=true` — tenant's **first** secondary domain |
| Site Verification webResource | `dns://tyronenelms.com` | owner `audiojones@ajdigital.app` |
| User alias | `tyrone@tyronenelms.com` | → `audiojones@ajdigital.app`. Count **22 → 23 / 30**, headroom 7 |

### Groups — tenant's first two
| | contact@ | dmarc@ |
|---|---|---|
| **Immutable groupId** | **`01ksv4uv1kr2knl`** | **`02et92p012o3rwv`** |
| Primary address | `contact@tyronenelms.com` | `dmarc@tyronenelms.com` |
| Name | Tyrone Nelms - Inquiries | tyronenelms.com - DMARC reports |
| Group aliases | `hello@`, `inquiries@`, `media@` | (none) |
| OWNER | `audiojones@ajdigital.app` | `audiojones@ajdigital.app` |
| **Owner memberId** | `118184388204138434849` | `118184388204138434849` |

**Verified Groups Settings state**

| Setting | contact@ | dmarc@ |
|---|---|---|
| whoCanPostMessage | ANYONE_CAN_POST | ANYONE_CAN_POST |
| allowExternalMembers | false | false |
| whoCanJoin | INVITED_CAN_JOIN | INVITED_CAN_JOIN |
| showInGroupDirectory | false | false |
| whoCanDiscoverGroup | **ALL_MEMBERS_CAN_DISCOVER** | **ALL_MEMBERS_CAN_DISCOVER** |
| whoCanViewGroup | ALL_MEMBERS_CAN_VIEW | ALL_MEMBERS_CAN_VIEW |
| whoCanViewMembership | ALL_MANAGERS_CAN_VIEW | ALL_MANAGERS_CAN_VIEW |
| messageModerationLevel | MODERATE_NONE | MODERATE_NONE |
| spamModerationLevel | MODERATE | **ALLOW** |
| enableCollaborativeInbox | false | false |

**`spamModerationLevel=ALLOW` on dmarc@ is deliberate.** DMARC aggregate reports arrive from
unfamiliar automated senders and are exactly the traffic a spam filter mishandles. `MODERATE`
would route them to a queue nobody reads — reproducing the `audiojones.com` failure mode by a
different mechanism. `contact@` keeps `MODERATE` (human correspondence, spam protection wanted).

---

## 3. Two tooling defects found and corrected

**D1 — Groups Settings API returns Atom XML by default.**
`GET /groups/v1/groups/{email}` without `alt=json` returns `application/atom+xml` with
namespaced elements (`apps:whoCanPostMessage`). Property lookups silently yielded empty values,
making correctly-applied settings *look* unset. **Every settings read/write must use `?alt=json`.**
The settings were correct throughout; only the readback was blind.

**D2 — `directory.groups.list` is eventually consistent.**
Immediately after creation it reported 1 group with 1 alias. Direct `GET` on each resource
proved 2 groups with all 3 aliases present. **Verify newly created Groups by direct GET, never by
list.** List is safe only after propagation.

Neither defect caused a wrong write. Both would have caused a **false failure verdict** — and
under the approved stop conditions ("stop on Group-setting failures") that would have halted a
correct deployment and risked an unnecessary rollback of working infrastructure.

---

## 4. Discoverability — CLOSED 2026-08-01

Both Groups were created with Google's default `whoCanDiscoverGroup = ALL_IN_DOMAIN_CAN_DISCOVER`.
`dmarc@` was tightened first; `contact@` tightened on human instruction.

| Group | Before | After | Verified |
|---|---|---|---|
| `dmarc@tyronenelms.com` | ALL_IN_DOMAIN_CAN_DISCOVER | **ALL_MEMBERS_CAN_DISCOVER** | ✅ re-read |
| `contact@tyronenelms.com` | ALL_IN_DOMAIN_CAN_DISCOVER | **ALL_MEMBERS_CAN_DISCOVER** | ✅ re-read |

Note for the control plane: `showInGroupDirectory=false` was set at creation and is **not
sufficient on its own** — `whoCanDiscoverGroup` is the setting that actually governs discovery on
modern Workspace tenants, and it defaults to domain-wide regardless. **Any future Group template
must set `whoCanDiscoverGroup` explicitly**, or it silently inherits a laxer posture than the
adjacent `showInGroupDirectory=false` implies.

---

## 4a. Operational blocker — credentials cannot sustain unattended runs

`gcloud` demanded interactive reauthentication **twice** during this workstream. Both times the
browser flow completed but the final write failed:

```
ERROR: (gcloud.auth.login) Error saving Application Default Credentials:
Unable to create private file [...\legacy_credentials\audiojones@ajdigital.app\adc.json]:
[Errno 13] Permission denied
```

Diagnosis: `adc.json` is **locked or ACL-denied** — an exclusive open fails, and even `Get-Acl`
returns *"Attempted to perform an unauthorized operation."* The file is stale at 2026-05-25 and
cannot be replaced. `credentials.db` **does** update (2026-08-01 11:56), which is why the primary
credential path recovers each time while ADC stays stale.

**Two distinct consequences:**
1. Any tooling that authenticates via **ADC** rather than `gcloud auth print-access-token` will
   silently use credentials from 2026-05-25. This plan avoids ADC entirely.
2. The reauth prompt itself is a **hard blocker for unattended operation**. A scheduled DNS drift
   check or estate audit would die waiting for a browser.

**Recommended fix:** stop borrowing a human identity to impersonate the service account. The
reauth policy that governs an admin user should not gate a machine process. Options, in order of
preference: workload identity federation, a GCE/Cloud Run service identity, or a scheduled job
running as the service account directly. Repairing `adc.json` permissions addresses only
consequence 1, not 2.

---

## 5. BLOCKED — human-only steps

### H-gate — external delivery proof (blocks DMARC publication)
No send capability is available from this control plane. A human must send **from an external
mailbox** (not `@ajdigital.app` / `@audiojones.com` / `@weareajdigital.com`):

| # | To | Content | Must show |
|---|---|---|---|
| 1 | `dmarc@tyronenelms.com` | plain text | arrives, not moderated |
| 2 | `dmarc@tyronenelms.com` | **XML attachment** | arrives, attachment intact |
| 3 | `dmarc@tyronenelms.com` | **ZIP attachment** | arrives, attachment intact |
| 4 | `tyrone@tyronenelms.com` | plain text | arrives |
| 5 | `contact@` · `hello@` · `inquiries@` · `media@` | plain text | all four arrive, none moderated |

⚠️ Mail routing may need **up to 24 h** from M2. A non-delivery before then is
**`awaiting_mail_routing`**, *not* a deployment failure — do not roll back on it.

I can verify arrival, attachment integrity and moderation state by inspecting the destination
mailbox once sent.

### I-gate — DKIM
Console-only; no API exists. Check Admin console → Apps → Google Workspace → Gmail →
**Authenticate email** → is `tyronenelms.com` selectable?
If not: record **`awaiting_dkim_generation_window`** — expected for 24–72 h after M2. Not a
failure. Do not roll back working mail.

### Phase H — DMARC (must NOT be published yet)
```
TXT  _dmarc.tyronenelms.com  v=DMARC1; p=none; rua=mailto:dmarc@tyronenelms.com; adkim=r; aspf=r  TTL 3600
```
Publish **only** after tests 1–3 pass.

---

## 6. Rollback — exact, in dependency order

```
 1. DELETE /zones/119fbdb4d2a04cbaeaa149596dadefdf/dns_records/35c64df290bdf8a0cab4d21e1ee366f6   (SPF)
 2. DELETE /zones/119fbdb4d2a04cbaeaa149596dadefdf/dns_records/0b7bf9856736f858a26487bea56f97f7   (MX)
 3. DELETE /admin/directory/v1/groups/01ksv4uv1kr2knl/aliases/hello@tyronenelms.com
    DELETE /admin/directory/v1/groups/01ksv4uv1kr2knl/aliases/inquiries@tyronenelms.com
    DELETE /admin/directory/v1/groups/01ksv4uv1kr2knl/aliases/media@tyronenelms.com
 4. DELETE /admin/directory/v1/groups/01ksv4uv1kr2knl                      (contact@)  ** see note
 5. DELETE /admin/directory/v1/groups/02et92p012o3rwv                      (dmarc@)    ** see note
 6. DELETE /admin/directory/v1/users/audiojones@ajdigital.app/aliases/tyrone@tyronenelms.com
 7. Deactivate Gmail for tyronenelms.com                                   (manual, Admin console)
 8. DELETE /admin/directory/v1/customer/my_customer/domains/tyronenelms.com
 9. DELETE /zones/119fbdb4d2a04cbaeaa149596dadefdf/dns_records/0b4fcbff5036a8919a34617dd1aad597   (verification TXT)
10. DELETE /siteVerification/v1/webResource/dns%3A%2F%2Ftyronenelms.com
```

** **Group deletion is not currently possible via this service account** — the custom role
carries Groups Read/Create/Update with **Delete withheld** by design. Steps 4–5 require either a
deliberate privilege grant or manual console action. That is the intended safety property, not a
defect.

**Ordering rationale:** SPF and MX first so the domain stops accepting mail before identities are
removed; verification TXT (9) before webResource (10) so re-verification cannot auto-trigger.

**End state:** zone → 0 records matching `../snapshots/tyronenelms.com-BEFORE-2026-07-30.json`;
Workspace domain list → `ajdigital.app` only; alias count → 22/30.

---

## 7. Governance confirmations

- ✅ All 5 `frlwalkthrough*` aliases preserved — re-verified post-Phase-D (5 of 5)
- ✅ No change to `audiojones.com`, `weareajdigital.com`, `floridarampandliftops.com`, `floridaplatformliftpros.com`
- ✅ Every Cloudflare record ID recorded
- ✅ Before snapshot retained; after snapshot written each phase
- ✅ No service-account key created; org policy untouched
- ✅ `admin.directory.user` write scope still withheld
