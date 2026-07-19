---
title: Path Mapping and Reconciliation Report — Founder Authority and Conversion System (Phase 1)
document_type: path_mapping_and_reconciliation_report
version: 0.1
status: proposal
canonical: false
authority: operator-ratification-required
created: 2026-07-19
decision_basis: OPERATOR_RULINGS_2026-07-19.md
---

# Path Mapping and Reconciliation Report

Phase 1 deliverable 1 of 6 for the **Founder Authority and Conversion System** (provisional name), an adjacent productized service of AJ Digital's core category — Founder Intelligence Systems and operational intelligence consultancy for founder-led service businesses (Ruling 3, `OPERATOR_RULINGS_2026-07-19.md`).

**Scope.** This report maps every path the imported charter assumed against the verified filesystem, repository, vault, and drive reality; records conflicts, missing paths, canonical destinations, and proposed destinations; states the canonical-versus-draft status of every path; and restates existing-system ownership boundaries. It is documentation only.

**Evidence base.** All drive, vault, and client-folder facts are cited from two read-only Phase 0 sources:

1. `docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md` (read-only inspection of repo, worktrees, vault, and G:/H:/J: drives; nothing moved, staged, or committed).
2. The client-folder schema inventory of `G:\AJ-CLIENTS\_GLOBAL_SCHEMA`, inventoried 2026-07-19 read-only, reproduced in Appendix A.

Repository and branch facts for the current worktree were re-verified in this session with read-only `git branch --show-current` and `git status` only. **No G:, H:, or J: drive was read or written while producing this report.**

---

## 0. No-Mutation Statement

**No live mutations were made by this report, and none are proposed by it.**

- No file outside this single document was created, moved, renamed, edited, staged, committed, or deleted.
- No vault folder, client folder, drive, schema file, or template was touched.
- Every "proposed destination" in Part V is a **proposal requiring operator ratification**; nothing in this report authorizes creating, moving, or migrating anything.
- Remediation of divergent client folders (Appendix A) additionally requires explicit operator approval under `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\docs\agent-rollout-directive.md` (additive-only, propose-paths-first, stop-before-destructive).

---

## Part I — VERIFIED CURRENT STATE

Status legend: **canonical** (ratified/authoritative), **draft** (exists, not ratified), **proposal** (this project's unratified output), **legacy** (pre-schema, unaligned), **divergent** (exists but violates the canonical standard), **missing** (assumed or required but absent), **incomplete** (exists, unused or partial), **unverified** (referenced by another artifact; existence not confirmed either way).

### I.1 Repository paths

Source: `CURRENT_STATE_DIAGNOSTIC.md` §1–§2, §5; this session's read-only git checks.

| Path | Role | Status |
|---|---|---|
| `C:\dev\AJ-DIGITAL-OS` | Repository root | canonical |
| `C:\dev\AJ-DIGITAL-OS` branch `codex/featuredoclientautomation` | Prior branch; 1 ahead / 1 behind main; carries 3 staged, uncommitted governance docs (`docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md`, `docs/system/AGENT_OPERATIONS_CONTROL_PLANE_SPEC.md`, `docs/system/WORKFLOW_CONSTITUTION_TEMPLATE.md`) unrelated to this project | draft — **must remain untouched per Ruling 1** |
| `C:\dev\AJ-DIGITAL-OS-prospect-brand-website-system` | Fresh worktree for this project, branch `docs/prospect-brand-website-system`, cut from governed `origin/main` at `9f14d48` (verified active this session). Per the operator Correction Ruling 2026-07-19 §2, "current, verified main" (Ruling 1) means governed `origin/main` at `9f14d48` for this change unit. Divergence recorded: at cut time local `main` (tip `e5d2041`, "docs: add business memory pilot kpis", unpushed, committed outside the PR gate) and `origin/main` (`9f14d48`, merged via PR #70) had diverged, merge-base `0e46eda`; reconciliation of local `main` is a separate governance change unit and is not performed in this project | canonical branch decision; contents are proposal |
| `C:\dev\AJ-DIGITAL-OS-prospect-brand-website-system\docs\specs\prospect-brand-website-system\` | Sole authorized Phase 1 write location (Rulings, "Phase 1 Required Deliverables") | proposal (untracked; nothing staged) |
| `C:\dev\AJ-DIGITAL-OS-knowledge-substrate-phase1` (branch `codex/knowledge-substrate-phase1`) | Unrelated worktree | draft — out of scope |
| `.claude/worktrees/charming-gauss-93e4fa`, `.claude/worktrees/jolly-hopper-8c04e8` | Detached worktrees of unknown purpose | incomplete — out of scope |
| `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` | Branch naming + worktree doctrine (workstream-descriptive names) | canonical |
| `docs/system/DOX_REPO_CONTEXT_STANDARD.md` | Repo context standard | canonical |
| `AGENTS.md`, `docs/AGENTS.md` | Agent instructions | canonical |
| `docs/dmaic-gate.md` | DMAIC gate | canonical |
| `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md` | Layer model (charter §11 mapping target) | canonical |
| `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` | Layer coverage index | canonical but **stale** (lags main; verify against live code before scoping) |
| `docs/specs/founder-opportunity-engine-v1.md` | Upstream prospect discovery/qualification engine | canonical — integration boundary per Ruling 4 |
| `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`, branch `origin/codex/add-qualification-engine-v1` | Multi-tenant CRM layer | canonical — integration boundary per Ruling 4 |
| `docs/knowledge/wiki/business-memory/*` | Records positioning move away from personal-brand consulting | draft (working) — the entire corpus is `status: working`, confidence 2, explicitly not ratified (`SERVICE_OFFER_ARCHITECTURE.md` §1; `POSITIONING_DECISION_RECORD.md` §5 evidence-status caveat). The positioning conflict was resolved by Ruling 3, but whether Ruling 3 partially ratified this corpus is itself an open contradiction (`POSITIONING_DECISION_RECORD.md` §7.1); it is not canonical under this report's legend |
| `src/retrieval/*` (`client_docs` namespace) | Existing client-docs retrieval namespace | canonical — memory layer should target it, not duplicate it |

### I.2 Vault paths

Source: `CURRENT_STATE_DIAGNOSTIC.md` §2–§3; Appendix A (source README doctrine reference).

| Path | Role | Status |
|---|---|---|
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\` | AJ Digital operating vault (Obsidian) | canonical |
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\` | Governance kernel: `_GOVERNANCE_INDEX.md`, `HUMAN_APPROVAL_MATRIX.md`, `GLOBAL_MERGE_CRITERIA.md` + 12 further governance docs; reachable at Phase 0 | canonical |
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\PROPOSED_AMENDMENT-2026-07-10.md`, `...\PROPOSED_AMENDMENT-2026-07-18.md` | Pending governance amendments | draft — **unresolved context**; any approval rule cited in Phase 1 must note them (see Part VIII) |
| Vault top-level numbering | Prefixes 02, 04, 07 each used twice (e.g. `02-OPERATING-SYSTEM` and `02-PROJECTS`) | **conflicts** — unresolved; vault restructuring is prohibited in Phase 1 (Rulings, Constraints) |
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\02-PROJECTS\` | Flat per-project notes; only FLORIDA-RAMP-LIFT has a directory | incomplete — vault-side per-client architecture is genuinely greenfield |
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\07-MEETINGS\CLIENTS\` | Exists, empty | incomplete |
| `08-KNOWLEDGE/DOCTRINE/Standards/CLIENT_FOLDER_SCHEMA_AND_AGENT_DIRECTIVE.md` (vault-relative; referenced by `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\README.md`) | Client-folder doctrine note | unverified/unknown — existence is asserted only by the schema README and was not re-verified in this session or the 2026-07-19 inventory; classified "unknown — verify before ratification" by `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §1.1 and §10 SC-2, which also notes the duplicated vault top-level numbering (C-5) makes the vault-relative path ambiguous |

### I.3 Drive topology

Source: `CURRENT_STATE_DIAGNOSTIC.md` §4.

| Drive | Hardware / FS | Label | Free | Verified role | Status |
|---|---|---|---|---|---|
| C: | Internal NVMe, NTFS | OS | 32.2 GB (~7%) — **low** | System, repos, worktrees | canonical; free space is an operational risk |
| G: | External USB (WD My Passport), **exFAT** | AJ DIGITAL | 650 GB | Business ops root: vault (`AJ-INTERNAL`), clients (`AJ-CLIENTS`), delivery (`AJ-DELIVERY`), brands, projects | canonical; **exFAT caveat: no NTFS ACLs, no journaling on the drive holding the governance kernel and client folders** |
| H: | External USB (LaCie), NTFS | AUDIOJONES | 233 GB | Media/music production | canonical for media; `H:\CLIENTS` empty |
| J: | External USB (WD Elements), NTFS | AJ AUXILIARY | 1,827 GB | Backups, legacy client storage, media | legacy for client data |

An internal 130.7 GB NTFS volume has no drive letter assigned (unused capacity) — noted, no action proposed.

### I.4 Client roots

Source: `CURRENT_STATE_DIAGNOSTIC.md` §3; Appendix A.

| Path | Verified contents | Status |
|---|---|---|
| `G:\AJ-CLIENTS\` | Operational client storage root | **canonical per Ruling 2** |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\` | Active staging schema, version `client-folder-schema-v0.2` (README, `templates\client-folder-schema-v0.1.json`, `...v0.2.json`, `_client/_project/_session` manifest templates, `docs\agent-rollout-directive.md`, `client-root\` reference tree) | **canonical client-folder standard per Ruling 2** — authoritative until formally amended; Phase 1 must produce a v0.3 reconciliation proposal, not a parallel architecture |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\` | Pure v0.2 reference tree (`00_ADMIN`, `01_INTAKE`, `08_ARCHIVE`, `projects\` → 5 lanes × 6 stages at project-level and session level) | canonical reference tree |
| `G:\AJ-CLIENTS\_TEMPLATE\` | April 2026-era template; adds client-level stage folders `02_RAW..07_REPORTING` incl. non-schema `05_OUTPUT`; `sessions\_SESSION_TEMPLATE\marketing\` missing 4 of 6 stages | **divergent** — see Open Contradiction OC-1 |
| `G:\AJ-CLIENTS\FLORIDA RAMP AND LIFT\` | Triple-nested client Obsidian vault (incl. misspelled `Flroida Ramp and Lift` directory); no v0.2 structure, no manifests | divergent (Appendix A) |
| `G:\AJ-CLIENTS\Paris Nelms\` | `photos\SESSION-6-20-26\RAWS\` (~500+ Sony .ARW) — pre-schema dated photography session | divergent (Appendix A); cheapest conformance win, copy-based only, operator approval required |
| `G:\AJ-CLIENTS\TEST-E2E\` | Numbered stage folders at client root incl. `05_OUTPUT`; embedded `_TEMPLATE\` copy; no lanes, no `projects\`, no manifests | divergent/partial — matches legacy `_TEMPLATE`, not v0.2 |
| `G:\AJ-DELIVERY\` | Deliverables root (RESPONSE OS, TEST-E2E) | canonical role observed, not ruled — authority is diagnostic observation only (`CURRENT_STATE_DIAGNOSTIC.md` §3); whether `G:\AJ-DELIVERY` or the per-lane `06_DELIVERY` stage inside client folders is canonical for a delivered artifact is undecided (`CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §10 SC-1) |
| `J:\CLIENT\` | Legacy per-client bulk storage: 1CH1LIFE, AKP RECORDS X DEALMAKERS, HITMAKA, HOUND, MIKE KEEGAN, OFF LABEL PODCAST, POTENTIAL, YIRA (8 folders) | legacy/duplicated — migration explicitly out of scope until an approved plan exists (charter §7; Rulings, Constraints) |
| `H:\CLIENTS\` | Empty | incomplete (exists, unused) |

---

## Part II — Charter-Assumed Paths Mapped to Verified Reality

The imported charter (`docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md`) is `status: proposal, canonical: false`. Its filesystem-dependent assumptions were ruled non-authoritative; verified state supersedes them (`OPERATOR_RULINGS_2026-07-19.md`, preamble).

| # | Charter assumption (clause) | Verified reality | Ruled destination / disposition |
|---|---|---|---|
| 1 | Branch `feature/client-doc-automation` exists (§25) | **Missing** — does not exist locally or on origin (`CURRENT_STATE_DIAGNOSTIC.md` §1) | Ruling 1: fresh worktree branch `docs/prospect-brand-website-system` from governed `origin/main` at `9f14d48` (verified active; divergence from local `main` recorded in Part I.1); `codex/featuredoclientautomation` and its staged files left untouched |
| 2 | Naming convention `<change-type>/<primary-architecture-scope>/<capability>-<goal-id>` and candidate `docs/applications/prospect-brand-bootstrap-<goal-id>` (§25) | **Missing from doctrine** — no GOAL-based convention exists; actual standard is workstream-descriptive names per `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` §11 | Rejected by Ruling 1: "Do not introduce a GOAL-based branch convention that is absent from current doctrine" |
| 3 | Workstream F client tree `00-CONTROL … 99-ARCHIVE` (13 top-level dirs, §Workstream F) | Not implemented anywhere; **conflicts** with canonical v0.2 model (`00_ADMIN…08_ARCHIVE`, client → project → session → lane → stage; `CURRENT_STATE_DIAGNOSTIC.md` §3, Appendix A) | Ruling 2: charter tree is **input** to `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md`; it may extend the `00_ADMIN…08_ARCHIVE` model but may not replace it or mutate live client folders. It does not become a folder structure |
| 4 | Charter §15.1 provisional source-of-truth table (Vault = canonical operating knowledge; external drive = working assets; Git = versioned schemas/templates; cloud = sharing; deployment platform = runtime) | Partially validated. The v0.2 truth ladder (`G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\client-folder-schema-v0.2.json`) places a **future CRM record** at the top, Obsidian as **interim** truth, then `_client/_project/_session` manifests, with folder existence "weak evidence only" | Charter table survives only as a working hypothesis subordinate to the v0.2 truth ladder and Ruling 4 (CRM owns canonical prospect/client records). Finalization venue: `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` alone — its §2 adopts §15.1 as consistent with the v0.2 truth ladder (no schema change), subject to its §10 SC-1 (delivered-artifact location). `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md` maps system-object ownership and contains no treatment of the vault/drive/Git/cloud location model, so it is not a finalization venue for this table |
| 5 | "External client drive" as a single location needing discovery (§15.1, §15.3) | Three distinct realities: canonical `G:\AJ-CLIENTS` + `G:\AJ-DELIVERY`; legacy `J:\CLIENT` (8 clients); empty `H:\CLIENTS` | Ruling 2 fixes the canonical client root at `G:\AJ-CLIENTS`. `J:\CLIENT` migration remains out of scope pending an approved plan; `H:\CLIENTS` has no assigned role — no action proposed |
| 6 | "Codex must not guess local Windows or external-drive paths" — discovery-first (§15.3) | Satisfied by Phase 0 (`CURRENT_STATE_DIAGNOSTIC.md`) and the 2026-07-19 schema inventory (Appendix A) | Discharged; this report is the required path map |
| 7 | Deliverables written "using actual canonical paths discovered during inspection" (§24.4) — ~22 docs, 7 YAML schemas, 12 templates | Ruled Phase 1 output is **six documents only**, all under `docs/specs/prospect-brand-website-system/` | Rulings, "Phase 1 Required Deliverables". The charter's larger catalog (e.g. `RESEARCH_SOP.md`, `CLOUDFLARE_DOMAIN_OPERATIONS_CAPABILITY_MATRIX.md`, `PRICING_STRATEGY.md`, schema YAMLs, templates) is deferred, not authorized for Phase 1 |
| 8 | `CLIENT_PROJECT_DOCUMENTATION_TEMPLATE_PROPOSAL.md` as a Workstream F output | Not in the ruled six-deliverable list | Superseded: its reconciliation function is absorbed by `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` (Ruling 2); any residual template work is deferred |
| 9 | Prospect record / state machine / qualification models (§9.2, §12.1) implying new storage | Founder Opportunity Engine and multi-tenant CRM already occupy these layers (`CURRENT_STATE_DIAGNOSTIC.md` §5) | Ruling 4: integrate, never duplicate — see Part VI |
| 10 | Per-prospect Obsidian project index (§4, §15) | Vault-side per-client architecture is greenfield (`02-PROJECTS` flat); vault numbering conflict blocks new numbered folders | Deferred: vault restructuring prohibited in Phase 1; destination unresolved (see Part V, row P-6) |
| 11 | Personal-brand website service thesis (§1.1, §3.2) | `docs/knowledge/wiki/business-memory/*` records a move **away** from personal-brand consulting | Ruling 3: core category unchanged (Founder Intelligence Systems); capability approved only as the adjacent, productized **Founder Authority and Conversion System** |

---

## Part III — Conflicts (verified at Phase 0, with ruling dispositions)

From `CURRENT_STATE_DIAGNOSTIC.md` §6:

| # | Conflict | Disposition |
|---|---|---|
| C-1 | Charter §25 branch/convention vs repo reality | **Resolved** by Ruling 1 (new branch cut; convention rejected) |
| C-2 | Charter Workstream F tree vs `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` v0.2 | **Resolved in principle** by Ruling 2; substantive reconciliation deferred to the v0.3 proposal document |
| C-3 | Charter service thesis vs business-memory positioning record | **Resolved** by Ruling 3; to be recorded in `POSITIONING_DECISION_RECORD.md` |
| C-4 | Charter greenfield assumption vs existing Founder Opportunity Engine + CRM | **Resolved** by Ruling 4; boundaries in Part VI and `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md` |
| C-5 | Vault duplicate top-level numbering (02, 04, 07 doubled) | **Unresolved** — out of Phase 1 scope (no vault restructuring); blocks any new numbered vault folder, including a future per-client vault structure |
| C-6 | Legacy client data in `J:\CLIENT` (8 folders outside canonical schema) | **Unresolved** — migration explicitly out of scope until a filesystem audit and approved migration plan exist (charter §7; Rulings, Constraints) |

Newly discovered contradictions are recorded separately in Part VII and are **not** resolved here.

---

## Part IV — Missing Paths

Paths that were assumed, referenced, or are required by the ruled architecture but do not exist:

| Missing path / artifact | Assumed or required by | Evidence |
|---|---|---|
| Branch `feature/client-doc-automation` | Charter §25 | `CURRENT_STATE_DIAGNOSTIC.md` §1 |
| GOAL-based branch-naming doctrine | Charter §25 | Grep across doctrine returned nothing (`CURRENT_STATE_DIAGNOSTIC.md` §2) |
| Any `_client.json` / `_project.json` / `_session.json` in a live client folder | v0.2 truth ladder rungs 3–5 | Recursive search found zero manifests under all three live client folders (Appendix A) |
| A v0.2-conformant live client folder | v0.2 adoption | None of the three live clients conforms (Appendix A, Observation 1) |
| CRM client-account record layer | Truth ladder rung 1 (`crm_client_account_record` — "future") | `_GLOBAL_SCHEMA` README; CRM specs exist in repo but the record layer is not yet the operating source of truth |
| Vault per-client project architecture | Charter §4/§15 (Obsidian project index) | `02-PROJECTS` flat; `07-MEETINGS\CLIENTS` empty (`CURRENT_STATE_DIAGNOSTIC.md` §3) |
| Content under `H:\CLIENTS` | Implied client role of H: | Empty (`CURRENT_STATE_DIAGNOSTIC.md` §3–§4) |
| `docs/specs/prospect-brand-website-system/` on `main` | Ruled Phase 1 destination | Exists only in this worktree, untracked; lands on main only via ruled review + human-required merge |
| `client-folder-schema-v0.3.json` | Ruling 2 (v0.3 reconciliation proposal) | Does not exist; Phase 1 produces the **proposal document** only, never the schema file itself |

---

## Part V — Canonical Destinations and Proposed Destinations

### V.1 Canonical destinations (VERIFIED CURRENT STATE)

The Authority column distinguishes destinations ratified by an operator ruling of 2026-07-19 from destinations that are pre-existing doctrine or whose canonical role rests on diagnostic observation only (observation is not ratification).

| Destination | What it is canonical for | Authority |
|---|---|---|
| `C:\dev\AJ-DIGITAL-OS` | Repository of record | `CURRENT_STATE_DIAGNOSTIC.md` §1 |
| Branch `docs/prospect-brand-website-system` (worktree `C:\dev\AJ-DIGITAL-OS-prospect-brand-website-system`) | This project's documentation-only branch | Ruling 1 |
| `docs/specs/prospect-brand-website-system/` | Sole authorized location for the six Phase 1 documents | Rulings, "Phase 1 Required Deliverables" |
| `G:\AJ-CLIENTS` | Operational client storage root | Ruling 2 |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` (v0.2 active) | Client-folder standard, until formally amended | Ruling 2 |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\` | Reference client tree (not `G:\AJ-CLIENTS\_TEMPLATE`) | Appendix A; Ruling 2 (see OC-1) |
| `G:\AJ-DELIVERY` | Client deliverables root (canonical role observed, not ruled) | `CURRENT_STATE_DIAGNOSTIC.md` §3 — diagnostic observation only, not an operator ruling; the canonical location for a delivered artifact (per-lane `06_DELIVERY` vs `G:\AJ-DELIVERY`) is undecided per `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §10 SC-1 |
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\` | Approval classification, merge authority, escalation | Governance kernel (subject to two pending amendments — Part VIII) |
| `docs/specs/founder-opportunity-engine-v1.md`; CRM specs (`docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`) | Prospect discovery/qualification; canonical prospect/opportunity records | Ruling 4 |

### V.2 Proposed destinations (PROPOSED FUTURE STATE — nothing here is authorized, created, or mutated by this report)

| ID | Proposed destination | Purpose | Status / gate |
|---|---|---|---|
| P-1 | `docs/specs/prospect-brand-website-system/PATH_MAPPING_AND_RECONCILIATION_REPORT.md` (this file) + the five remaining ruled deliverables (`SERVICE_OFFER_ARCHITECTURE.md`, `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md`, `POSITIONING_DECISION_RECORD.md`, `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`, PROJECT_CHARTER amendment appendix) | Phase 1 documentation set | proposal; no staging/commit until all six are complete and reviewed (Rulings, Constraints); merge to main HUMAN_REQUIRED |
| P-2 | Atomic v0.3 implementation set under `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\`: (1) `templates\client-folder-schema-v0.3.json`, (2) `README.md` active-version bump, (3) new-lane stage folders under `client-root\projects\_PROJECT_TEMPLATE\project-level\` and `client-root\projects\_PROJECT_TEMPLATE\sessions\_SESSION_TEMPLATE\`, (4) lane definition added to `docs\agent-rollout-directive.md` | Eventual landing artifacts for a **ratified** v0.3, argued for in the v0.3 reconciliation proposal. All four must land as **one governed change unit** (`CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §6.2; acceptance criterion §8.4) — explicitly because the v0.2 rollout's split between schema and `_TEMPLATE` produced the divergence recorded in Part VII OC-1 | proposal only — **no G: write is proposed by this report**; requires operator ratification and formal amendment of v0.2 |
| P-3 | Per-client website/authority working assets under the existing v0.2 lane×stage model (e.g. `G:\AJ-CLIENTS\<client-slug>\projects\<project-slug>\project-level\<lane>\02_RAW..07_REPORTING\`) | Where Founder Authority and Conversion System client work products would live | proposal; **which lane** (existing `marketing` vs. any new lane) is an open design question reserved for the v0.3 proposal — not decided here |
| P-4 | Deliverable exports mirrored to `G:\AJ-DELIVERY\<client>\` | Final delivery artifacts | proposal; consistent with the observed (not ruled) role of `G:\AJ-DELIVERY`; contingent on the undecided canonical delivered-artifact location — per-lane `06_DELIVERY` inside client folders vs `G:\AJ-DELIVERY` (`CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §10 SC-1) — which must be ruled before ratification; requires operator approval per rollout directive |
| P-5 | Handoff artifacts into Founder Opportunity Engine and CRM (integration contracts, required fields, workflow triggers) | System-to-system handoffs, defined as documents in `docs/specs/prospect-brand-website-system/SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md` | proposal; Ruling 4 permits handoffs, prohibits duplicate stores |
| P-6 | Vault-side per-client index location | Charter §4/§15 Obsidian project index | **deferred/unresolved** — blocked by the vault numbering conflict (C-5) and the Phase 1 no-vault-restructuring constraint; no destination proposed |

### V.3 Canonical-versus-draft/proposal status — consolidated registry

Every path named in this report, with its single authoritative status:

| Path | Status |
|---|---|
| `C:\dev\AJ-DIGITAL-OS` | canonical |
| Branch `codex/featuredoclientautomation` + its 3 staged `docs/system/*` files | draft (untouched by ruling) |
| Branch `docs/prospect-brand-website-system` / worktree `C:\dev\AJ-DIGITAL-OS-prospect-brand-website-system` | canonical (branch decision, Ruling 1); contents proposal |
| `docs/specs/prospect-brand-website-system/OPERATOR_RULINGS_2026-07-19.md` | canonical (operator decision record) |
| `docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md` | proposal — partially overridden by rulings |
| `docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md` | draft (evidence, validated by rulings preamble) |
| `docs/specs/prospect-brand-website-system/PATH_MAPPING_AND_RECONCILIATION_REPORT.md` (this file) | proposal |
| `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md`, `docs/system/DOX_REPO_CONTEXT_STANDARD.md`, `AGENTS.md`, `docs/AGENTS.md`, `docs/dmaic-gate.md`, `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md` | canonical |
| `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` | canonical, stale |
| `docs/specs/founder-opportunity-engine-v1.md` | canonical |
| `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md` | canonical |
| `docs/knowledge/wiki/business-memory/*` | draft (working, confidence 2, not ratified — `POSITIONING_DECISION_RECORD.md` §5; partial-ratification question open per its §7.1) |
| `src/retrieval/*` `client_docs` namespace | canonical |
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\` | canonical (with internal numbering conflict C-5) |
| `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\` core files | canonical |
| `...\GOVERNANCE\PROPOSED_AMENDMENT-2026-07-10.md`, `...-2026-07-18.md` | draft (pending, unresolved) |
| `G:\AJ-CLIENTS\` | canonical (Ruling 2) |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\` (v0.2) | canonical (Ruling 2) |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\` | canonical reference tree |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\client-folder-schema-v0.1.json` | superseded (historical) |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\client-folder-schema-v0.2.json` | canonical (active) |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\_client.template.json`, `_project.template.json`, `_session.template.json` | canonical templates, version-string mismatch (OC-2) |
| `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\docs\agent-rollout-directive.md` | canonical |
| `G:\AJ-CLIENTS\_TEMPLATE\` | divergent/legacy (OC-1) |
| `G:\AJ-CLIENTS\FLORIDA RAMP AND LIFT\`, `G:\AJ-CLIENTS\Paris Nelms\`, `G:\AJ-CLIENTS\TEST-E2E\` | divergent (live data; remediation gated on operator approval) |
| `G:\AJ-DELIVERY\` | canonical role observed, not ruled — delivered-artifact location undecided (`CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §10 SC-1) |
| `J:\CLIENT\` (8 client folders) | legacy |
| `H:\CLIENTS\` | incomplete (empty, no assigned role) |
| Charter Workstream F tree (`00-CONTROL…99-ARCHIVE`) | proposal input only — never a destination |
| `client-folder-schema-v0.3.json` | missing / future — proposal-gated (P-2; one artifact of the atomic four-part implementation set) |

---

## Part VI — Existing-System Ownership Boundaries

Per Ruling 4 (`OPERATOR_RULINGS_2026-07-19.md`), which is absolute for Phase 1:

| System | Owns | Evidence path |
|---|---|---|
| **Founder Opportunity Engine** | Prospect discovery, website/revenue-leak analysis, qualification, scoring, CRM-ready opportunity output | `docs/specs/founder-opportunity-engine-v1.md` |
| **Multi-Tenant CRM** | Canonical prospect and company records, opportunity lifecycle, communications, tasks, pipeline state, attribution and customer history where already specified | `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`, `origin/codex/add-qualification-engine-v1` |
| **Founder Authority and Conversion System** (this project) | Founder and company source collection, authority strategy, messaging and positioning assets, website planning and production, content architecture, trust assets, conversion assets, and **approved handoffs into** the CRM and intelligence systems | Ruling 4; Phase 1 docs under `docs/specs/prospect-brand-website-system/` |

This system may define handoffs, required fields, workflow triggers, and asset-generation processes. It may **not** create another independent prospect database, lead-scoring engine, qualification methodology, CRM object model, opportunity pipeline, or canonical client identity system. Consequences for path mapping:

- The charter's prospect record, state machine, and scoring assumptions (§9.2, §12.1, Workstream D scoring) map to **integration contracts** documented in `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`, not to new stores at any path.
- The v0.2 truth ladder already anticipates this boundary: `crm_client_account_record` is the top rung; client-folder manifests carry a nullable `crm_record_id` link upward (Appendix A). No path proposed by this project may become a second client-identity root.
- `src/retrieval/*` `client_docs` remains the retrieval namespace to target; no parallel namespace is proposed.

---

## Part VII — Open Contradictions (newly discovered; recorded, not resolved)

These emerged from reconciling the Phase 0 diagnostic with the 2026-07-19 schema inventory (Appendix A). Per the rulings' constraints, they are reported for operator decision rather than resolved by assumption.

Numbering note: the OC identifiers below are local to this report. `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §10 carries its own, separately named SC-1–SC-3 series (its SC-1 = two deliverable roots; its SC-2 = doctrine-note existence; its SC-3 = truth-ladder top rung vs CRM reality). Cross-references in this report always name the source document.

- **OC-1 — Two competing template trees inside the canonical client root.** `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\` (pure v0.2) and `G:\AJ-CLIENTS\_TEMPLATE\` (April-era top level with non-schema `05_OUTPUT` and client-level stage folders; partially retro-fitted `projects\` subtree) coexist. `CURRENT_STATE_DIAGNOSTIC.md` §3 listed `_TEMPLATE` within the canonical root without flagging the divergence. Ruling 2 makes `_GLOBAL_SCHEMA` canonical but does not adjudicate `_TEMPLATE`'s status (deprecate? retro-fit? delete?). `TEST-E2E` proves agents have already cloned the wrong tree. Needs an operator ruling; candidate venue: the v0.3 reconciliation proposal.
- **OC-2 — Manifest version-string mismatch.** Manifest templates still declare `client-folder-v0.1` / `client-project-v0.1` / `client-session-v0.1` while the active folder schema is `client-folder-schema-v0.2`. Any v0.2-aware validator keyed on `schema_version` must accept both families, or the templates need a ratified bump (a v0.3 concern; not resolved here).
- **OC-3 — Incomplete marketing session lane in `_TEMPLATE`.** `_TEMPLATE\projects\_PROJECT_TEMPLATE\sessions\_SESSION_TEMPLATE\marketing\` contains only `02_RAW` and `07_REPORTING` (4 of 6 stages missing), diverging from the reference tree. Follows from OC-1 but is separately fixable; unresolved.
- **OC-4 — Truth-ladder rungs unadopted on disk.** The ladder declares folder existence "weak evidence only," yet zero `_client/_project/_session` manifests exist under any live client folder — folder existence is currently the *only* on-disk signal for all three clients. The interim truth therefore rests entirely on Obsidian/KOS notes whose per-client vault structure is itself greenfield (Part I.2). Adoption sequencing is a v0.3/operations decision, not resolved here.
- **OC-5 — Client Obsidian vault inside `G:\AJ-CLIENTS`.** `FLORIDA RAMP AND LIFT` is a nested client knowledge vault; the v0.2 schema has no slot for a client vault (doctrine lives in the main AJ vault). Whether client vaults belong under `G:\AJ-CLIENTS` at all — plus the `Flroida` misspelling — requires an operator decision before any remediation.

---

## Part VIII — Governance Context for Any Approval Rule Cited Above

Approval classification, human escalation, and merge authority derive from the governance kernel at `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\` (`_GOVERNANCE_INDEX.md`, `HUMAN_APPROVAL_MATRIX.md`, `GLOBAL_MERGE_CRITERIA.md`). Two pending amendments — `PROPOSED_AMENDMENT-2026-07-10.md` and `PROPOSED_AMENDMENT-2026-07-18.md` (same directory) — are **unresolved context**: any approval-gate or merge-authority statement in this report or the other Phase 1 documents must be re-checked against them at ratification time. Until then: merge to main or any canonical branch is HUMAN_REQUIRED; agents may read and cite the kernel but may not edit it.

---

## Appendix A — Client-Folder Schema Inventory (evidence source)

Source: read-only inventory of `G:\AJ-CLIENTS\_GLOBAL_SCHEMA`, performed 2026-07-19. No writes were performed on `G:`. This appendix is evidence-grade input to `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md`.

### A.1 Schema authority and doctrine

- `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\README.md`: "Status: active staging schema"; "Active schema version: client-folder-schema-v0.2"; Owner: AJ Digital LLC / Audio Jones; Created 2026-06-20. Doctrine note: Obsidian `08-KNOWLEDGE/DOCTRINE/Standards/CLIENT_FOLDER_SCHEMA_AND_AGENT_DIRECTIVE.md`.
- Core pattern: `client -> project -> session -> service lane -> data stage`.
- Truth ladder (highest first): CRM record (future) → Obsidian registry/onboarding note (current interim truth) → `_client.json` → `_project.json` → `_session.json` → folder existence ("weak evidence only").
- Agent rule: additive folder creation only, and only after client/project/session/lane are clear; no move/rename/delete/overwrite/publish/deliver/sync without explicit operator approval.

### A.2 Schema versions

- **v0.1** — `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\client-folder-schema-v0.1.json`: root pinned to `G:\AJ-CLIENTS`; 4 service lanes (`ai-consultancy`, `photography`, `video-production`, `music-production`); 6 data stages (`02_RAW`, `03_WORKING`, `04_STRUCTURED`, `05_EDITED`, `06_DELIVERY`, `07_REPORTING`); policy `raw_immutable: true`, `copy_based_outputs: true`, `destructive_actions_allowed: false`, `folder_existence_is_onboarding_truth: false`.
- **v0.2 (active)** — `...\client-folder-schema-v0.2.json`: identical except one added lane, `marketing` (campaign strategy, channel/content planning, SEO/AEO, paid/organic ops, analytics, deliverables; sources in `02_RAW`, generated outputs in `05_EDITED` per rollout directive). Stages, truth ladder, root, and policy byte-identical to v0.1. Timestamps corroborate: v0.1 15:25, v0.2 15:54, README 15:55 on 2026-06-20.
- The schema JSONs define lanes, stages, ladder, and policy only; the folder tree itself is defined by the reference tree at `_GLOBAL_SCHEMA\client-root\`.

### A.3 Manifest templates

`G:\AJ-CLIENTS\_GLOBAL_SCHEMA\templates\_client.template.json` (`client-folder-v0.1`), `_project.template.json` (`client-project-v0.1`), `_session.template.json` (`client-session-v0.1`) — kebab-case slugs; sessions prefixed `YYYY-MM-DD-`; `truth_owner: "obsidian_interim"` until CRM exists; nullable `crm_record_id`/`vault_note` links up the truth ladder; session template embeds `source_policy` (`raw_immutable`, `copy_based_outputs`, `destructive_actions_allowed: false`). Version strings were **not** bumped to v0.2 (OC-2).

### A.4 Template trees

- **Reference tree** `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\` (all empty dirs): client level = `00_ADMIN`, `01_INTAKE`, `08_ARCHIVE`, `projects\` — **no stage folders at client level**. `projects\_PROJECT_TEMPLATE\` has `00_ADMIN`, `01_INTAKE`, `project-level\` (all five v0.2 lanes × all six stages), `sessions\_SESSION_TEMPLATE\` (mirrors lanes × stages; photography session lane has specialized sub-stages, e.g. `02_RAW\{camera-originals, sidecars}`, `05_EDITED\{background-edits, clean-edits, later-edit-ready, retouched, upscaled}`, `06_DELIVERY\{final, review}`).
- **Legacy tree** `G:\AJ-CLIENTS\_TEMPLATE\` (dir mtime 2026-04-09, predating the schema): adds client-level stages `02_RAW..07_REPORTING` including non-schema **`05_OUTPUT`** (schema says `05_EDITED`); `sessions\_SESSION_TEMPLATE\marketing\` has only `02_RAW` and `07_REPORTING`; its `projects\` subtree otherwise matches the reference (appears retro-fitted; the top level does not).

### A.5 Live-client conformance (all three divergent; zero manifests anywhere)

- `G:\AJ-CLIENTS\FLORIDA RAMP AND LIFT\` — triple-nested client Obsidian vault (`Flroida Ramp and Lift` misspelling); no v0.2 elements at all (OC-5).
- `G:\AJ-CLIENTS\Paris Nelms\` — `photos\SESSION-6-20-26\RAWS\` with ~500+ Sony .ARW files; pre-schema dated photography session; conformant location would be `Paris Nelms\projects\<project>\sessions\2026-06-20-<slug>\photography\02_RAW\camera-originals\`; RAW-only, so migration would be purely additive+copy — **but any move requires operator approval** per the rollout directive.
- `G:\AJ-CLIENTS\TEST-E2E\` — numbered stages at client root incl. `05_OUTPUT`, embedded `_TEMPLATE\` copy, no lanes/projects/manifests; matches the pre-schema `_TEMPLATE` top level, demonstrating the OC-1 wrong-template risk in practice.

### A.6 Inventory observations carried into this report

1. No live client conforms to v0.2; adoption is schema-and-template-only.
2. The manifest layer is entirely unadopted (OC-4).
3. Two competing template trees (OC-1); `TEST-E2E` proves the failure mode.
4. Manifest version-string mismatch (OC-2).
5. `_TEMPLATE` marketing session lane incomplete (OC-3).
6. Paris Nelms is the cheapest conformance win; FLORIDA RAMP AND LIFT needs a client-vault placement decision (OC-5); TEST-E2E mostly documents the legacy layout.
7. All directive constraints (additive-only, propose-paths-first, stop-before-destructive) mean **no remediation above may be executed by agents without explicit operator approval** — consistent with this report's no-mutation statement (Part 0).
