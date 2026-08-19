---
title: Client Folder Schema v0.3 Reconciliation Proposal — Founder Authority and Conversion System
document_type: schema_reconciliation_proposal
version: 0.1
status: proposal
canonical: false
authority: operator-ratification-required
created: 2026-07-19
decision_basis: OPERATOR_RULINGS_2026-07-19.md
schema_authority: "G:\\AJ-CLIENTS\\_GLOBAL_SCHEMA (client-folder-schema-v0.2) — remains authoritative until formally amended (Ruling 2)"
related_documents:
  - docs/specs/prospect-brand-website-system/OPERATOR_RULINGS_2026-07-19.md
  - docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md
  - docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md
pending_governance_context:
  - "G:\\AJ-INTERNAL\\AJ-DIGITAL-VAULT\\00-CONTROL\\GOVERNANCE\\PROPOSED_AMENDMENT-2026-07-10.md (unresolved)"
  - "G:\\AJ-INTERNAL\\AJ-DIGITAL-VAULT\\00-CONTROL\\GOVERNANCE\\PROPOSED_AMENDMENT-2026-07-18.md (unresolved)"
---

# Client Folder Schema v0.3 Reconciliation Proposal

## 0. Purpose, Authority, and Hard Boundaries

This document reconciles the client-folder requirements of the imported project charter
(`docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md`, Workstream F and §15) against the
existing, authoritative client-folder schema at `G:\AJ-CLIENTS\_GLOBAL_SCHEMA`, and proposes the
**minimum** additions required for the Founder Authority and Conversion System — an adjacent,
productized service of AJ Digital's core category (Founder Intelligence Systems and operational
intelligence consultancy for founder-led service businesses; Ruling 3).

Binding boundaries (Ruling 2, restated as controlling for this entire document):

1. `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` (`client-folder-schema-v0.2`) **remains authoritative until
   formally amended.** Nothing in this document changes that.
2. This document is a **proposal only.** It creates no folders, mutates no live client folder, and
   authorizes no writes to `G:` — neither now nor as a side effect of this proposal being accepted.
   Implementation, if ratified, is a separate governed change with its own approval.
3. The proposal **extends** the existing `00_ADMIN … 08_ARCHIVE` model. It does not replace it and
   does not introduce a parallel folder architecture.
4. Ruling 4 ownership boundaries apply: the Founder Opportunity Engine owns
   discovery/leak-analysis/qualification/scoring; the Multi-Tenant CRM owns canonical
   prospect/company/opportunity/communication/lifecycle records. Client folders under this schema
   hold **working assets and deliverables**, never a canonical prospect database, pipeline, or
   client identity system. Per the v0.2 truth ladder, folder existence is "weak evidence only."

Every claim in §1–§2 is VERIFIED CURRENT STATE, based on the read-only inventory of
`G:\AJ-CLIENTS\_GLOBAL_SCHEMA` performed 2026-07-19 (no writes performed). Where that inventory is
silent, the item is marked **unknown — verify before ratification**. §4 onward is PROPOSED FUTURE
STATE unless labeled otherwise.

---

## 1. VERIFIED CURRENT STATE — v0.2 Inventory

### 1.1 Schema identity

| Item | Value | Source |
|---|---|---|
| Active version | `client-folder-schema-v0.2` | `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\README.md` ("Status: active staging schema") |
| Owner | AJ Digital LLC / Audio Jones | same README |
| Created | 2026-06-20 | same README |
| Root | `G:\AJ-CLIENTS` | `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\client-folder-schema-v0.2.json` |
| Core pattern | client → project → session → service lane → data stage | README |
| Doctrine note | Obsidian `08-KNOWLEDGE/DOCTRINE/Standards/CLIENT_FOLDER_SCHEMA_AND_AGENT_DIRECTIVE.md` (referenced by README; existence in vault **unknown — verify before ratification**) | README |

### 1.2 Schema JSON (v0.2)

Path: `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\client-folder-schema-v0.2.json`

- **Service lanes (5):** `ai-consultancy`, `marketing`, `photography`, `video-production`,
  `music-production`
- **Data stages (6):** `02_RAW`, `03_WORKING`, `04_STRUCTURED`, `05_EDITED`, `06_DELIVERY`,
  `07_REPORTING`
- **Truth ladder (highest first):** `crm_client_account_record` →
  `obsidian_client_registry_or_onboarding_note` (current interim truth) → `client_manifest` →
  `project_manifest` → `session_manifest` → `folder_existence` (weak evidence only)
- **Default policy:** `raw_immutable: true`, `copy_based_outputs: true`,
  `destructive_actions_allowed: false`, `folder_existence_is_onboarding_truth: false`
- **Delta from v0.1** (`client-folder-schema-v0.1.json`, same directory): single functional change —
  `marketing` lane added. Everything else byte-identical. This is the governing precedent for what a
  minimal schema version increment looks like.
- The schema JSONs define lanes, stages, truth ladder, and policy; **the folder tree itself is
  defined by the reference tree** at `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\`.

### 1.3 Reference tree (canonical v0.2 shape)

Path: `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\` (all empty directories, no files):

```
client-root\
├── 00_ADMIN
├── 01_INTAKE
├── 08_ARCHIVE
└── projects\
    └── _PROJECT_TEMPLATE\
        ├── 00_ADMIN
        ├── 01_INTAKE
        ├── project-level\   (5 lanes × 6 stages: 02_RAW..07_REPORTING per lane)
        └── sessions\
            └── _SESSION_TEMPLATE\  (5 lanes × 6 stages; photography lane carries
                                     specialized sub-stages, e.g. 02_RAW\camera-originals,
                                     05_EDITED\retouched, 06_DELIVERY\final)
```

Canonical client root = `00_ADMIN`, `01_INTAKE`, `08_ARCHIVE`, `projects\` only. **No stage folders
exist at client level; stages live only under lane folders** inside `project-level\` or session
folders. The photography session lane's sub-stage specialization is the governing precedent for
lane-specific sub-folders.

### 1.4 Manifest templates

All in `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\`:

| Template | Own version string | Key fields |
|---|---|---|
| `_client.template.json` | `client-folder-v0.1` | `client_slug`, `display_name`, `truth_owner: "obsidian_interim"`, `crm_record_id: null`, `vault_note: null`, `status: "draft"`, `service_lanes: []`, timestamps |
| `_project.template.json` | `client-project-v0.1` | `project_slug`, `client_slug`, plus same truth/CRM/vault linkage fields |
| `_session.template.json` | `client-session-v0.1` | `session_slug` (dated `YYYY-MM-DD-slug` pattern), `project_slug`, `client_slug`, embedded `source_policy` (raw immutable, copy-based, non-destructive) |

Note (verified): the manifest templates were **not** bumped when the folder schema moved to v0.2;
they still carry the `*-v0.1` family of version strings.

### 1.5 Rollout directive

Path: `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\docs\agent-rollout-directive.md`

- CRM is not yet the complete source of truth; Obsidian/KOS is interim control-room authority;
  `G:\AJ-CLIENTS` is the operational storage root.
- Required 10-step agent sequence (identify client/project/session/lane → search Obsidian → inspect
  existing folders → propose exact paths → create only missing additive folders → safe local
  manifests only → stop before any move/destructive/CRM-write/delivery/production action).
- Lane rule: project-level folders for ongoing strategy/consulting/architecture; session folders
  for dated capture/production work.
- `02_RAW` immutable source; `05_EDITED` derivative output; "Agents must never collapse these
  stages."
- Marketing lane definition: campaign strategy, channel/content planning, SEO/AEO, paid/organic
  ops, analytics, deliverables; sources in `02_RAW`, generated outputs in `05_EDITED`.

### 1.6 Known deviations already present on disk (verified)

| Item | Deviation |
|---|---|
| `G:\AJ-CLIENTS\_TEMPLATE\` | Legacy April-era top level: client-level stage folders `02_RAW..07_REPORTING` including **`05_OUTPUT`** (not a v0.2 stage; schema says `05_EDITED`); its `sessions\_SESSION_TEMPLATE\marketing\` has only `02_RAW` and `07_REPORTING` (4 of 6 stages missing); its `projects\` subtree otherwise matches the reference tree |
| `G:\AJ-CLIENTS\FLORIDA RAMP AND LIFT\` | Divergent — triple-nested Obsidian vault (with misspelled intermediate dir "Flroida"), no v0.2 structure, no manifests |
| `G:\AJ-CLIENTS\Paris Nelms\` | Divergent — `photos\SESSION-6-20-26\RAWS\` (~500+ Sony `.ARW`), pre-schema layout, no manifests |
| `G:\AJ-CLIENTS\TEST-E2E\` | Partial — matches the legacy `_TEMPLATE` top level (client-level stages, `05_OUTPUT`), not v0.2; embedded stray `_TEMPLATE\` copy; no manifests |
| Manifest adoption | Zero `_client.json` / `_project.json` / `_session.json` files exist under any of the three live client folders (verified by recursive search) |

**Bottom line of the verified state:** v0.2 is real, versioned, and authoritative — but adoption is
schema-and-template-only. No live client folder conforms, and the legacy `_TEMPLATE` tree is an
active source of divergence (TEST-E2E demonstrates it).

---

## 2. Mapping — Charter Requirements → v0.2

The charter's Workstream F proposes a 13-directory client tree (`00-CONTROL … 99-ARCHIVE`,
`PROJECT_CHARTER.md` §Workstream F) and §15 defines source-of-truth and path-discovery rules. The
charter itself concedes: "This is a proposed logical template, not an authorization to impose these
paths." Ruling 2 settles the direction of reconciliation: charter content maps **into** v0.2, never
the reverse.

Mapping principle: a Founder Authority and Conversion System engagement is a **project** under an
existing or new client folder (`<client>\projects\<project-slug>\`), executed through a service
lane. Charter folders map to lane × stage locations, to existing admin folders, or to systems that
own the content per Ruling 4.

| Charter path (Workstream F) | v0.2 destination | Mapping type |
|---|---|---|
| `00-CONTROL\` (PROJECT_INDEX, STATUS, APPROVALS, DECISION_LOG, RISK_REGISTER) | Project `00_ADMIN\` (existing). Recommended file names become template guidance, not new folders | Direct — existing folder |
| `00-CONTROL\SOURCE_REGISTER.md` | Lane `04_STRUCTURED\` (structured registry data) | Relocated by data stage |
| `01-INTAKE\` (PROSPECT_INTAKE, COMMUNICATION_NOTES, CLIENT_PROVIDED_FACTS, OPEN_QUESTIONS) | Client/project `01_INTAKE\` (existing). Caveat: the canonical prospect record and communications log are CRM-owned (Ruling 4); intake files here are working copies referencing `crm_record_id` | Direct — existing folder, ownership-constrained |
| `02-RESEARCH\` (SOURCE_INVENTORY, DIGITAL_FOOTPRINT, EVIDENCE_CLAIM_LEDGER, …) | Lane `02_RAW\` (captured sources), `03_WORKING\` (analysis in progress), `04_STRUCTURED\` (registries, ledgers, manifests) | Decomposed by data stage |
| `03-STRATEGY\` (POSITIONING, AUTHORITY_STRATEGY, CONTENT_PILLARS, …) | Lane `03_WORKING\` (drafts) → `05_EDITED\` (authored strategy assets) | Decomposed by data stage |
| `04-BRAND\` (BRAND_SPINE, VERBAL_IDENTITY, VISUAL_DIRECTION, BRAND_GUIDELINES, …) | Lane `03_WORKING\` → `05_EDITED\` | Decomposed by data stage |
| `05-DIAGNOSTICS\` (DIGITAL_PRESENCE_DIAGNOSTIC, OPPORTUNITY_MATRIX, …) | Lane `07_REPORTING\` (reports) and `06_DELIVERY\` (client-facing report deliverables). Caveat: leak-analysis/qualification/scoring methodology is Founder Opportunity Engine-owned (Ruling 4); this folder stores FOE-origin **outputs received via the governed CRM-mediated handoff**, not a competing diagnostic engine | Relocated by data stage, ownership-constrained |
| `06-WEBSITE\` (WEBSITE_BRIEF, SITEMAP, COPY_DECK, STRUCTURED_DATA_PLAN, …) | Lane `03_WORKING\` → `05_EDITED\` | Decomposed by data stage |
| `07-DESIGN\` (MOODBOARD, WIREFRAMES/, MOCKUPS/, DESIGN_SYSTEM) | Lane `03_WORKING\` (explorations) → `05_EDITED\` (approved design assets) | Decomposed by data stage |
| `08-BUILD\` (BUILD_PLAN, TECHNICAL_ARCHITECTURE, DEPLOYMENT_PLAN, QA_PLAN, CHANGELOG) | Website source is Git-resident per charter §15.1's own provisional model; client folder holds pointers/exports only (lane `04_STRUCTURED\` for build manifests, `06_DELIVERY\` for exported builds) | Mapped out of folder scope |
| `09-SALES\` (PITCH_BRIEF, CONSULTATION_AGENDA, SCOPE_OPTIONS, PRICING_WORKSHEET, PROPOSAL_INPUTS) | Authored sales **assets**: lane `05_EDITED\` → `06_DELIVERY\`. Pipeline/opportunity **state**: CRM-owned (Ruling 4) — never canonical in the folder | Split by ownership |
| `10-DELIVERABLES\` (REPORTS/, BRAND/, WEBSITE/, EXPORTS/) | Lane `06_DELIVERY\` (existing stage) | Direct — existing stage |
| `11-OPERATIONS\DOMAIN_RECORD.md` | Copy in project `00_ADMIN\`; canonical domain-ledger location is undecided (charter §23.4–6) — **unknown — verify before ratification** | Deferred — open decision |
| `11-OPERATIONS\ACCESS_REGISTER.md` | Project `00_ADMIN\` for non-secret access notes; secrets must use the approved secret-management pattern (charter §16), never plain files in client folders | Ownership-constrained |
| `11-OPERATIONS\ANALYTICS.md`, `MAINTENANCE.md`, `RUNBOOK.md` | Lane `07_REPORTING\` (analytics), project `00_ADMIN\` (runbook/maintenance) | Relocated |
| `99-ARCHIVE\` | Client/project `08_ARCHIVE\` (existing) | Direct — existing folder, different number |

Charter §15 requirements, mapped:

| §15 requirement | Disposition |
|---|---|
| §15.1 source-of-truth model (Vault = knowledge/indexes; external drive = working assets/deliverables; Git = schemas/templates/site source) | Consistent with v0.2 truth ladder and root. Adopted as-is; no schema change needed. See Open Contradiction SC-1 regarding `06_DELIVERY` vs `G:\AJ-DELIVERY` |
| §15.2 no blind duplication — one canonical location, others are links/exports | Already enforced conceptually by the truth ladder and `copy_based_outputs: true`. Adopted; no schema change needed |
| §15.3 path discovery — no guessed paths, read-only inspection, propose-before-create, approval before move/rename | Already mandated by `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\docs\agent-rollout-directive.md` steps 5–10. Adopted; no schema change needed |

**Mapping conclusion:** every semantic responsibility in the charter tree lands cleanly in the
existing v0.2 model except one — there is **no service lane whose definition covers authority
strategy, messaging/positioning assets, website planning and production, content architecture, and
trust/conversion assets.** That single gap drives the entire proposal in §4.

---

## 3. Conflicts and Redundancies

### 3.1 Structural conflicts (charter tree vs v0.2)

| # | Conflict | Detail |
|---|---|---|
| C1 | Colliding number semantics | Charter assigns `02` = RESEARCH, `05` = DIAGNOSTICS, `08` = BUILD; v0.2 assigns `02` = RAW, `05` = EDITED, `08` = ARCHIVE. The two numbering systems cannot coexist at the same tree level without corrupting the meaning of every numbered folder |
| C2 | Separator convention | Charter uses `NN-NAME` (hyphen); v0.2 uses `NN_NAME` (underscore) |
| C3 | Function-first vs stage-first architecture | Charter organizes by business function at client root; v0.2 organizes by project → lane → data stage. Adopting the charter tree would be exactly the "parallel folder architecture" Ruling 2 prohibits |
| C4 | Missing lane/session concepts | The charter tree has no service-lane layer and no dated-session model, discarding the v0.2 core pattern (`client -> project -> session -> service lane -> data stage`, per `_GLOBAL_SCHEMA\README.md`) |
| C5 | Archive numbering | Charter `99-ARCHIVE` duplicates v0.2 `08_ARCHIVE` |

### 3.2 Redundancies (charter folders already provided by v0.2)

| Charter folder | Already exists in v0.2 as |
|---|---|
| `00-CONTROL` | `00_ADMIN` (client and project level) |
| `01-INTAKE` | `01_INTAKE` (client and project level) |
| `10-DELIVERABLES` | `06_DELIVERY` stage per lane |
| `99-ARCHIVE` | `08_ARCHIVE` |

### 3.3 Ownership conflicts (charter content vs Ruling 4)

| Charter content | Owning system per Ruling 4 | Folder role |
|---|---|---|
| `PROSPECT_INTAKE.md`, prospect records, prospect status/state machine (charter §9.2, §12.1) | Multi-Tenant CRM (canonical prospect/company/opportunity/lifecycle records) | Working copies only, keyed by `crm_record_id` |
| Qualification, opportunity scoring, leak/gap diagnostics as methodology (charter §12.4, Workstream D overlap) | Founder Opportunity Engine (`docs/specs/founder-opportunity-engine-v1.md`) | Store CRM-mediated handoff outputs, not a competing engine |
| `09-SALES` pipeline state, proposal lifecycle | Multi-Tenant CRM | Authored sales assets only |
| Client identity (slugs as canonical identity) | Multi-Tenant CRM (canonical client identity system) | `_client.json` stays a manifest below CRM/Obsidian in the truth ladder — never promoted to identity authority |

### 3.4 Pre-existing v0.2-internal conflicts this proposal must not worsen (verified)

1. **Two competing template trees:** canonical `_GLOBAL_SCHEMA\client-root\` vs legacy
   `G:\AJ-CLIENTS\_TEMPLATE\` (client-level stages, `05_OUTPUT`, incomplete marketing session
   lane). Agents cloning `_TEMPLATE` reproduce the divergence — TEST-E2E proves it already
   happened.
2. **Manifest version-string mismatch:** folder schema is v0.2 while manifest templates remain
   `client-folder-v0.1` / `client-project-v0.1` / `client-session-v0.1`.
3. **Incomplete marketing retrofit:** `_TEMPLATE\projects\_PROJECT_TEMPLATE\sessions\_SESSION_TEMPLATE\marketing\`
   is missing `03_WORKING`, `04_STRUCTURED`, `05_EDITED`, `06_DELIVERY`.

v0.3 must resolve (2) by explicit version-family policy (§6.3) and must state a disposition for (1)
and (3) as ratification items (§9), because repeating the marketing rollout pattern against a
diverged template base would create a third generation of drift.

---

## 4. PROPOSED FUTURE STATE — Minimum Necessary Additions (v0.3)

Design rule: follow the v0.1 → v0.2 precedent (one lane added, everything else byte-identical), the
smallest change class this schema has already absorbed successfully.

### 4.1 Addition A — one new service lane (the only structural change)

Add a sixth service lane to `service_lanes` in a new
`G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\client-folder-schema-v0.3.json`:

- **Primary name candidate:** `founder-authority`
- **Alternative candidates:** `authority-conversion`, `founder-authority-conversion`
- **Final lane name is an operator ratification item** (naming convention is a reserved operator
  decision, charter §23.21).

Proposed lane definition (to be added to `docs\agent-rollout-directive.md` at implementation time,
mirroring how the marketing lane definition was added in v0.2):

> `founder-authority` — Founder Authority and Conversion System engagements: authority strategy,
> messaging and positioning assets, website planning and production working assets, content
> architecture, trust assets, conversion assets, and approved handoff artifacts exchanged through
> the governed CRM-mediated boundary (inbound commercial handoffs arrive via the Multi-Tenant CRM;
> no direct FOE-to-FACS artifact channel is established; outbound FACS-to-FOE interaction is
> advisory-only where specified in `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`). Sources and received
> handoff outputs in `02_RAW`,
> structured registries/ledgers/manifests in `04_STRUCTURED`, authored assets in `05_EDITED`,
> client-facing deliverables in `06_DELIVERY`, analytics and outcome reporting in `07_REPORTING`.
> This lane stores no canonical prospect, pipeline, scoring, or identity records, and it
> establishes no new persistence boundary. Any text from this definition inserted into the
> rollout directive or another directive carries these same limitations.

Lane rule classification: primarily **project-level** work (ongoing strategy/architecture per the
rollout directive's lane rule), with dated **sessions** used for capture/production events (e.g.,
founder photo/video capture days remain in their own lanes; a website copy sprint may be a
session).

Tree impact (implementation-time, post-ratification only): add the lane's six stage folders under
`_GLOBAL_SCHEMA\client-root\projects\_PROJECT_TEMPLATE\project-level\` and
`...\sessions\_SESSION_TEMPLATE\`, exactly as the five existing lanes are laid out.

### 4.2 Addition B — optional sub-stage guidance for the new lane (no new required folders)

Following the verified photography-lane precedent (specialized sub-stages under session stages),
propose **optional, documented** sub-folders for the `founder-authority` lane:

| Stage | Optional sub-folders |
|---|---|
| `02_RAW\` | `handoff-inbound\` (CRM-mediated handoff records received; no direct FOE channel), `source-captures\` |
| `04_STRUCTURED\` | `source-registry\`, `evidence-claim-ledger\`, `manifests\` |
| `05_EDITED\` | `strategy\`, `messaging\`, `brand-assets\`, `website\`, `sales-assets\` |
| `06_DELIVERY\` | `review\`, `final\` (mirrors photography's delivery split) |

These are naming guidance, not schema-required structure. Agents create them additively only when
content exists, per the rollout directive's additive-only rule.

### 4.3 Addition C — recommended admin file set (documentation only, zero folders)

Document (in v0.3 rollout notes, not in the schema JSON) the recommended file names inside the
existing project `00_ADMIN\`: `PROJECT_INDEX.md`, `STATUS.md`, `APPROVALS.md`, `DECISION_LOG.md`,
`RISK_REGISTER.md`. This satisfies the charter's `00-CONTROL` intent with no structural change.

### 4.4 Explicitly NOT changed in v0.3

- **No new data stages.** The six-stage model covers the full charter lifecycle.
- **No changes to existing lanes**, including photography sub-stages.
- **No client-level stage folders** (the legacy `_TEMPLATE`/TEST-E2E pattern is not legitimized).
- **No manifest schema field changes.** `crm_record_id` (already present in all three manifest
  templates) is the designated CRM linkage per Ruling 4; FOE handoff references belong in the
  integration contract (`SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`), not in the folder schema.
- **No change to truth ladder, root, or default policy.**
- **No prospect-folder provisioning policy change.** Whether pre-conversion prospects get folders
  under `G:\AJ-CLIENTS` at all is a reserved operator decision (charter §23.10); if they do, the
  existing `_client.json` `status: "draft"` value already models it.

---

## 5. Rejected Charter Paths

| Rejected path | Reason |
|---|---|
| Entire `00-CONTROL … 99-ARCHIVE` 13-folder top level | Parallel folder architecture — prohibited outright by Ruling 2; every semantic need maps into v0.2 (§2) |
| `02-RESEARCH\` as a top-level folder | Research artifacts are lane × stage data (`02_RAW`/`03_WORKING`/`04_STRUCTURED`); a function-named top-level folder collides with v0.2 stage numbering (C1) |
| `05-DIAGNOSTICS\` as a diagnostic-engine home | Diagnostic/leak-analysis methodology is FOE-owned (Ruling 4); folders store CRM-mediated received outputs in `07_REPORTING`/`06_DELIVERY` only |
| `08-BUILD\` | Website source is Git-resident per charter §15.1's own model; duplicating source trees onto an exFAT USB drive also defeats versioning. Folder receives exports and build manifests only |
| `09-SALES\` as pipeline location | Opportunity lifecycle and pipeline state are CRM-owned (Ruling 4). Authored sales assets live in lane `05_EDITED`/`06_DELIVERY` |
| `10-DELIVERABLES\` | Redundant with the existing `06_DELIVERY` stage (and see SC-1 on `G:\AJ-DELIVERY`) |
| `11-OPERATIONS\ACCESS_REGISTER.md` as-is | Secrets/credentials in plain client-folder files violate charter §16; only non-secret access notes permitted in `00_ADMIN` |
| `11-OPERATIONS\DOMAIN_RECORD.md` as canonical domain ledger | Canonical domain-ledger location is an unratified operator decision (charter §23.4–6, Workstream G); folder holds a copy at most |
| `99-ARCHIVE\` | Redundant with `08_ARCHIVE`; introduces a second archive numbering convention (C5) |
| Per-prospect Obsidian vaults inside client folders | Charter §7 already excludes vault-per-prospect; `FLORIDA RAMP AND LIFT` is the live demonstration of this anti-pattern (nested vault, no schema conformance) |
| Charter `NN-NAME` hyphen-numbered convention generally | Conflicts with v0.2 `NN_NAME` convention (C2); adopting both would make conformance unverifiable |

---

## 6. Backward-Compatibility Strategy

### 6.1 Strict superset guarantee

v0.3 = v0.2 + one lane (+ optional documented sub-stages). Therefore:

- Every v0.2-conformant folder tree is v0.3-conformant with zero changes.
- Every v0.2 lane, stage, manifest, and policy value is unchanged.
- A v0.3-aware validator accepts `client-folder-schema-v0.2` and `client-folder-schema-v0.3`
  trees; folders created before ratification are never retroactively non-conformant beyond their
  existing v0.2 status.

### 6.2 Authority sequencing

1. Until ratification: v0.2 remains authoritative; **no folder may be created under v0.3 naming.**
2. At ratification: v0.3 JSON, README version bump, reference-tree lane folders, and rollout
   directive lane definition are added **in one governed change** (the v0.2 rollout's split between
   schema and `_TEMPLATE` shows what happens when they diverge).
3. v0.2 JSON remains in place untouched (as v0.1's JSON did after v0.2), preserving the version
   history.

### 6.3 Manifest version-family policy (resolves verified mismatch §3.4-2)

Declare explicitly in v0.3 docs: the manifest family `client-folder-v0.1` / `client-project-v0.1` /
`client-session-v0.1` remains the valid manifest schema under folder-schema v0.2 **and** v0.3.
Validators must key folder conformance on the folder `schema_version` and manifest conformance on
the manifest `schema_version`, accepting both families. No manifest re-versioning is required for
v0.3 (minimum-change principle); a future manifest v0.2 is out of scope here.

### 6.4 Agent-behavior compatibility

All rollout-directive constraints carry forward unchanged: additive-only creation,
propose-paths-first, safe local manifests only, stop before move/destructive/CRM-write/delivery
actions. The new lane adds a vocabulary entry, not a new permission.

---

## 7. Migration Impact Assessment — Three Existing Client Folders

Headline finding: **v0.3 introduces zero new migration burden.** None of the three live folders
conforms to v0.2 today (verified §1.6), so all migration debt is pre-existing v0.2 debt. v0.3
neither increases nor retires it. Per Ruling 2 and the rollout directive, **no migration below is
authorized by this proposal**; each requires its own operator-approved plan.

### 7.1 `G:\AJ-CLIENTS\FLORIDA RAMP AND LIFT\`

- **Current:** triple-nested Obsidian knowledge/spec vault (`FLORIDA RAMP AND LIFT\Flroida Ramp and
  Lift\FLORIDA RAMP AND LIFT\`, note the "Flroida" misspelling), no v0.2 structure, no manifests.
- **v0.3 impact:** none. Unchanged from its v0.2 non-conformance.
- **Pre-existing decisions needed (operator):** whether client Obsidian vaults belong inside
  `G:\AJ-CLIENTS` at all — the schema has no vault slot and the doctrine note lives in the main
  vault; correcting the misspelled directory (a rename = destructive-class action requiring
  explicit approval).
- **Risk if migrated:** whether other tooling or vault links reference the nested vault's current
  path is **unknown — verify before ratification** of any migration plan.

### 7.2 `G:\AJ-CLIENTS\Paris Nelms\`

- **Current:** `photos\SESSION-6-20-26\RAWS\` (~500+ `.ARW` files). Exactly the work v0.2 was built
  for, stored pre-schema: non-lane folder name, non-stage `RAWS`, non-conforming session name.
- **v0.3 impact:** none — this is photography-lane work; the new lane is irrelevant to it.
- **Conformance path (pre-existing, v0.2-only):** copy-based additive move to
  `Paris Nelms\projects\<project>\sessions\2026-06-20-<slug>\photography\02_RAW\camera-originals\`
  plus manifests. RAW-only content makes this the cheapest conformance win, but any move requires
  operator approval per the directive. The apparent session date (2026-06-20) is inferred from the
  folder name `SESSION-6-20-26` — actual capture date **unknown — verify before ratification** of a
  migration plan.

### 7.3 `G:\AJ-CLIENTS\TEST-E2E\`

- **Current:** matches the legacy April-era `_TEMPLATE` top level (client-level stages,
  `05_OUTPUT`, embedded stray `_TEMPLATE\` copy); contains test fixtures
  (`02_RAW\test-audio-440hz.wav`, structured/delivery/reporting JSONs).
- **v0.3 impact:** none.
- **Disposition (operator decision):** it mostly documents the legacy layout. Options: archive
  as-is into `08_ARCHIVE` semantics, retain as a frozen test artifact, or delete (destructive —
  requires explicit approval). Whether any pipeline or test harness still reads these fixture
  paths is **unknown — verify before ratification** of any disposition.

### 7.4 Systemic note

`_TEMPLATE`'s divergent top level is the reproduction vector for the TEST-E2E layout. The v0.3
ratification should therefore include a disposition ruling for `G:\AJ-CLIENTS\_TEMPLATE\`
(deprecate in favor of `client-root\`, retrofit, or freeze) — as a **separate governed change**,
since it touches `G:`.

---

## 8. Acceptance Criteria (for v0.3 as a ratifiable amendment)

v0.3 is acceptable for ratification only if all of the following hold:

1. **Superset check:** the v0.2 reference tree (`_GLOBAL_SCHEMA\client-root\`) validates unchanged
   under the v0.3 definition.
2. **Single structural delta:** diffing `client-folder-schema-v0.2.json` against the proposed
   `client-folder-schema-v0.3.json` shows exactly one change — the added service lane — mirroring
   the verified v0.1→v0.2 delta discipline.
3. **No removals, no renames:** no existing lane, stage, folder, template, or policy value is
   removed or renamed.
4. **Atomic artifact set:** schema JSON, README version bump, reference-tree lane folders, and
   rollout-directive lane definition are specified as one implementation change unit.
5. **Manifest policy declared:** the v0.1 manifest family is explicitly declared valid under v0.3
   (§6.3).
6. **Ruling 4 clean:** the lane definition text contains the "no canonical prospect, pipeline,
   scoring, or identity records" clause; no schema artifact defines a prospect database, scoring
   engine, qualification methodology, CRM object model, pipeline, or client identity system.
7. **Ruling 3 clean:** lane definition frames the work as the Founder Authority and Conversion
   System (adjacent productized service), with no personal-brand-agency / web-design-company
   framing.
8. **Zero live mutation:** ratification of this proposal performs no writes to `G:` and modifies no
   live client folder; implementation is scheduled as its own governed change.
9. **Naming ruled:** the operator has selected the final lane name.
10. **Open contradictions dispositioned:** each item in §10 (SC-1 … SC-3) has an operator ruling
    or an explicit deferral recorded.

---

## 9. Ratification Requirements

1. **Approval authority:** Human operator approval is required. Per the AJ Digital OS governance
   kernel (`G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\` — `_GOVERNANCE_INDEX.md`,
   `HUMAN_APPROVAL_MATRIX.md`, `GLOBAL_MERGE_CRITERIA.md`), schema/doctrine amendment is above
   L1 draft/recommend and agents may not edit registries or doctrine without explicit human
   approval. **Pending context:** `PROPOSED_AMENDMENT-2026-07-10.md` and
   `PROPOSED_AMENDMENT-2026-07-18.md` in the same governance directory are unresolved; if either
   changes approval classifications, the stricter interpretation applies until the operator rules.
2. **Decisions the operator must make at ratification:**
   - Final lane name (§4.1).
   - Disposition of `G:\AJ-CLIENTS\_TEMPLATE\` (§7.4).
   - Disposition of `TEST-E2E` (§7.3).
   - Whether client Obsidian vaults belong inside `G:\AJ-CLIENTS` (§7.1).
   - Canonical domain-ledger location (§5; charter §23.4–6).
   - Whether pre-conversion prospects receive draft client folders (§4.4; charter §23.10).
   - Adoption or rejection of the optional sub-stage guidance (§4.2).
   - Disposition of each Open Contradiction (SC-1 … SC-3, §10).
3. **Implementation gate:** upon ratification, implementation (writing
   `client-folder-schema-v0.3.json`, updating `README.md`, `agent-rollout-directive.md`, and
   `client-root\` lane folders under `G:\AJ-CLIENTS\_GLOBAL_SCHEMA`) proceeds **only** as a
   separate, operator-approved governed change with its own change unit, evidence, and review. This
   document confers no write authority.
4. **Sequencing:** ratification of this proposal must not be bundled with any live-client migration
   approval; §7 migrations are independent decisions.

---

## 10. Open Contradictions

Newly identified during this reconciliation (recorded per the operator constraint: report, do not
resolve by assumption).

Identifier namespace: items here are numbered **SC-1 … SC-3** (Schema-reconciliation
Contradiction) rather than OC-*, because the OC-* series is already assigned — with different
meanings — in `docs/specs/prospect-brand-website-system/PATH_MAPPING_AND_RECONCILIATION_REPORT.md`
Part VII (OC-1 … OC-5). Since the operator must disposition each open contradiction by ID at
ratification (§9.2), identifiers are kept globally unique across the Phase 1 document set.

- **SC-1 — Two deliverable roots.** The v0.2 schema defines a per-lane `06_DELIVERY` stage inside
  client folders (`client-folder-schema-v0.2.json`), while
  `docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md` §3 records `G:\AJ-DELIVERY`
  as a separate canonical deliverables root (containing RESPONSE OS, TEST-E2E). Which location is
  canonical for a delivered artifact — and whether one must be a copy/export of the other per
  charter §15.2 — is undecided. **Unknown — verify before ratification.**
- **SC-2 — Doctrine note existence unverified.** `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\README.md`
  references Obsidian `08-KNOWLEDGE/DOCTRINE/Standards/CLIENT_FOLDER_SCHEMA_AND_AGENT_DIRECTIVE.md`
  as the doctrine note, but this inventory did not verify that note exists, and
  `CURRENT_STATE_DIAGNOSTIC.md` §3 records duplicated top-level vault numbering (02/04/07 prefixes
  each used twice), so the vault path may be ambiguous. If the note is missing or diverges from
  `_GLOBAL_SCHEMA`, the truth ladder's second rung (Obsidian registry as interim truth) is
  weakened. **Unknown — verify before ratification.**
- **SC-3 — Truth-ladder top rung vs CRM reality.** The v0.2 truth ladder names
  `crm_client_account_record` as highest truth ("future"), and Ruling 4 assigns canonical
  client identity to the Multi-Tenant CRM — but whether the CRM (specs at
  `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, per `CURRENT_STATE_DIAGNOSTIC.md` §5) is deployed
  enough to hold any live `crm_record_id` values is unverified. Until the operator declares CRM
  cutover, `truth_owner: "obsidian_interim"` stands, and v0.3 manifests may carry null
  `crm_record_id` indefinitely. **Unknown — verify before ratification.**

Contradictions already on record elsewhere (not restated as new): charter tree vs v0.2 numbering
(`CURRENT_STATE_DIAGNOSTIC.md` §6.2, resolved by this proposal's direction of mapping), template-tree
divergence and manifest version mismatch (§1.6/§3.4 above, verified in the 2026-07-19 inventory),
positioning conflict (resolved by Ruling 3), and qualification/CRM overlap (resolved by Ruling 4).

---

## 11. Summary

| Question | Answer |
|---|---|
| What does v0.3 add? | One service lane (`founder-authority`, name pending operator ruling) + optional sub-stage guidance + recommended `00_ADMIN` file set |
| What does v0.3 change or remove? | Nothing — strict superset of v0.2 |
| What happens to the charter's 13-folder tree? | Fully mapped into the existing model (§2) or rejected with reasons (§5); not adopted |
| What happens to the three live client folders? | Nothing, under this proposal — their (pre-existing) v0.2 non-conformance is unchanged; migrations are separate operator decisions |
| When can any of this touch `G:`? | Only after operator ratification, as a separate governed change |
