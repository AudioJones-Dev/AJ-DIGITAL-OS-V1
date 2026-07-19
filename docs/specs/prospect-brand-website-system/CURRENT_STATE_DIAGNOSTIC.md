---
title: Prospect-to-Personal-Brand Website System — Current-State Diagnostic (Phase 0)
document_type: current_state_diagnostic
version: 0.1
status: draft
canonical: false
authority: operator-review-required
created: 2026-07-19
charter_ref: docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md
method: read-only inspection (repo, worktrees, AJ Vault, G:/H:/J: drives); no files moved, renamed, staged, or committed
erratum: 2026-07-19 — see §9 "Erratum and Post-Ruling Addendum"; historical body preserved
---

# Current-State Diagnostic — Phase 0 (Discovery and Governance)

Produced per charter §24.2 (Mandatory First Actions) and Workstream A. Every finding below is classified using the charter's required statuses: **canonical / draft / conflicts / incomplete / duplicated / missing / unknown**.

## 1. Repository and Branch State

| Item | Observed | Status |
|---|---|---|
| Repository root | `C:\dev\AJ-DIGITAL-OS` | canonical |
| Current branch | `codex/featuredoclientautomation` | conflicts (see below) |
| Branch named in charter §25 | `feature/client-doc-automation` | **missing** — does not exist locally or on origin |
| Branch vs main | 1 ahead (`e5feb92` deployment-readiness dashboard), 1 behind (`e5d2041` business-memory KPIs); merge-base `0e46eda` | conflicts |
| Staged (uncommitted) files | `docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md`, `docs/system/AGENT_OPERATIONS_CONTROL_PLANE_SPEC.md`, `docs/system/WORKFLOW_CONSTITUTION_TEMPLATE.md` — all agent-governance infrastructure, none related to this project | conflicts (unrelated work bundled on branch) |
| Worktrees | Main checkout + `.claude/worktrees/charming-gauss-93e4fa` (detached), `.claude/worktrees/jolly-hopper-8c04e8` (detached), `C:\dev\AJ-DIGITAL-OS-knowledge-substrate-phase1` (`codex/knowledge-substrate-phase1`) | incomplete (2 detached worktrees of unknown purpose) |

**Branch assessment.** The current branch fails the actual repo convention on two axes: naming (run-together words, no workstream-descriptive prefix) and content (its one ahead-commit and all three staged files are unrelated to this project). Starting this project here would violate the charter's own bounded-change and narrow-staging rules. Per charter §24.3 no branch is renamed or replaced without operator approval — see Open Decisions.

## 2. Canonical Standards Located (charter §24.2 items 5–6)

| Standard | Location | Status |
|---|---|---|
| Branch naming | `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` §11: workstream-descriptive names (`docs/worktree-doctrine`, `feature/client-portal-gallery-review`) | canonical |
| Charter-assumed naming model `<change-type>/<primary-architecture-scope>/<capability>-<goal-id>` | Nowhere in repo; grep for "GOAL", "bounded change", "architecture scope" naming rules returned nothing | **missing** — charter §25 cites a convention that does not exist in doctrine |
| Worktree protocol | `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` | canonical |
| Repo context standard | `docs/system/DOX_REPO_CONTEXT_STANDARD.md` (requires AGENTS.md to cover branch naming; specifies no format) | canonical |
| Agent instructions | `AGENTS.md` (repo root), `docs/AGENTS.md` | canonical |
| DMAIC | `docs/dmaic-gate.md` | canonical |
| Governance kernel | `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\` — all three core files present plus 12 further governance docs; reachable | canonical |
| Pending governance amendments | `PROPOSED_AMENDMENT-2026-07-10.md`, `PROPOSED_AMENDMENT-2026-07-18.md` | draft — review before ratifying this project's approval gates |
| Layer model (charter §11 mapping target) | `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`, `AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` | canonical (note: memory records the Coverage Index lags main) |

## 3. Client-Folder Architecture (charter Workstream F, §15)

**The charter's "greenfield" assumption is wrong for the external drive and right for the vault.**

| Location | Observed | Status |
|---|---|---|
| `G:\AJ-CLIENTS` | Structured client root with `_GLOBAL_SCHEMA` (schemas `client-folder-schema-v0.1.json`, `v0.2.json`, `_client/_project/_session` templates, `docs/agent-rollout-directive.md`) and `_TEMPLATE` (`00_ADMIN…08_ARCHIVE` + `projects/_PROJECT_TEMPLATE`); clients: FLORIDA RAMP AND LIFT, Paris Nelms, TEST-E2E | **canonical** (existing, versioned) |
| Charter §Workstream F proposed tree (`00-CONTROL…99-ARCHIVE`, 13 top-level dirs) | Not implemented anywhere | **conflicts** with existing `_GLOBAL_SCHEMA` numbering (`00_ADMIN…08_ARCHIVE`) — reconciliation required, not invention |
| `G:\AJ-DELIVERY` | Deliverables root (RESPONSE OS, TEST-E2E) | canonical |
| `J:\CLIENT` | Legacy per-client bulk storage (1CH1LIFE, AKP RECORDS X DEALMAKERS, HITMAKA, HOUND, MIKE KEEGAN, OFF LABEL PODCAST, POTENTIAL, YIRA) | duplicated/legacy — not aligned to `_GLOBAL_SCHEMA` |
| `H:\CLIENTS` | Empty | incomplete (exists, unused) |
| Vault client docs | `02-PROJECTS` is flat per-project notes; only FLORIDA-RAMP-LIFT has a directory; `07-MEETINGS\CLIENTS` exists but empty | incomplete — vault-side per-client architecture is genuinely greenfield |
| Vault numbering | Top-level prefixes 02, 04, 07 each used twice (e.g. `02-OPERATING-SYSTEM` and `02-PROJECTS`) | conflicts — fix before adding new numbered folders |

## 4. Storage Topology (charter §15.1)

| Drive | Hardware | Label | Free | Role observed |
|---|---|---|---|---|
| C: | Internal NVMe, NTFS | OS | **32.2 GB (~7%) — low** | System |
| G: | External USB (WD My Passport), **exFAT** | AJ DIGITAL | 650 GB | Business ops: vault (`AJ-INTERNAL`), clients (`AJ-CLIENTS`), delivery, brands, projects |
| H: | External USB (LaCie), NTFS | AUDIOJONES | 233 GB | Media/music production; `CLIENTS` folder empty |
| J: | External USB (WD Elements), NTFS | AJ AUXILIARY | 1,827 GB | Backups, legacy `CLIENT` storage, media |

Risks for charter §16 (security/access control): all business data sits on external USB drives; G: is exFAT, so **no NTFS ACLs and no journaling** on the drive holding the governance kernel and client folders. C: free space is an operational risk for local builds/caches. An internal 130.7 GB NTFS volume ("2nd local drive") has no drive letter assigned — unused capacity.

## 5. Overlapping Existing Work (charter §19)

| Asset | Overlap | Status |
|---|---|---|
| `docs/specs/founder-opportunity-engine-v1.md` | Upstream prospect-intelligence engine: discovery → website leak analysis → qualification gates → Demand×Leak×Fit scoring → CRM-ready opportunities. Same "prospect qualification + website-maturity diagnostic" territory, different offer (ResponseOS) and ICP (call-heavy service businesses vs founders/experts) | canonical — the charter's qualification/research layers must reuse or explicitly diverge from this |
| CRM layer (`docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_*`, `docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`, `origin/codex/add-qualification-engine-v1`) | Charter §7 says "not build a complete CRM" — one already exists; prospect records/state machine (§9.2, §12.1) should map onto it, not duplicate it | canonical |
| `docs/knowledge/wiki/business-memory/*` | Records a positioning move **away from personal-brand consulting** — a strategic contradiction with this charter's service thesis | **conflicts — operator decision required** |
| `src/retrieval/*` `client_docs` namespace | Existing retrieval namespace for client docs; memory layer should target it | canonical |
| Staged `docs/system/AGENT_OPERATIONS_CONTROL_PLANE_SPEC.md` + delegation standard + workflow constitution | Candidate governance for exactly the agent roles/approval gates this charter defines in §10K/§13; charter should instantiate a Workflow Constitution rather than invent parallel governance | draft (uncommitted) |

## 6. Contradictions Requiring Resolution Before Target Architecture

1. **Charter branch reference vs reality** — §25 names a branch that doesn't exist and a naming convention that isn't in doctrine. The real standard is workstream-descriptive prefixes.
2. **Workstream F proposed client tree vs `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` v0.2** — different numbering, different top-level sets. The existing schema is versioned and in use (3 client folders). *(Corrected — see Erratum E-1, §9: later verification found zero conforming live client folders.)*
3. **Charter service thesis vs business-memory positioning** — personal-brand service vs documented move away from personal-brand consulting.
4. **Charter's greenfield assumption vs existing prospect/CRM subsystems** — Founder Opportunity Engine and multi-tenant CRM already occupy the qualification and prospect-record layers.
5. **Vault duplicate numbering** — blocks clean addition of any new numbered vault folder.
6. **Legacy client data in `J:\CLIENT`** — eight client folders outside the canonical schema; migration is explicitly out of scope until an approved plan exists (charter §7).

## 7. Open Decisions for Operator Ratification (charter §23 subset now evidence-backed)

1. **Branch (charter §23.23):** Recommend a fresh branch from up-to-date `main` named per actual doctrine, e.g. `docs/prospect-brand-website-system`, leaving `codex/featuredoclientautomation` and its staged governance docs untouched. Requires approval per §24.3.
2. **Client-folder canonical location (§23.10):** Evidence points to `G:\AJ-CLIENTS` + `_GLOBAL_SCHEMA` as canonical; charter template becomes a v0.3 schema proposal, not a new structure.
3. **Positioning conflict:** Confirm the personal-brand website service is an approved exception to (or evolution of) the business-memory positioning record.
4. **Module vs new repo (§23.22):** Evidence (existing CRM, intelligence, retrieval layers) favors AJ-DIGITAL-OS module under `docs/specs/prospect-brand-website-system/` + later `src/` scope.
5. **Reuse boundary:** Whether prospect qualification extends Founder Opportunity Engine or stands alone.

## 8. Recommended Next Change Unit

Phase 1 (Documentation and Schemas) scoped to this folder only, starting with `PATH_MAPPING_AND_RECONCILIATION_REPORT.md` (reconciling charter Workstream F against `_GLOBAL_SCHEMA` v0.2) and `SERVICE_OFFER_ARCHITECTURE.md` — after the operator rules on decisions 1–3 above.

---

## 9. Erratum and Post-Ruling Addendum (2026-07-19)

*Added under the operator's Phase 1 Correction Ruling (`PROCEED_WITH_CORRECTIONS_ONLY`, 2026-07-19), §5 item 1 and §6. The historical body above is preserved unchanged except for the inline pointer at §6 item 2.*

**E-1 — v0.2 adoption overstated.** §3's client listing under a `canonical (existing, versioned)` status and §6 item 2's "in use (3 client folders)" overstate adoption. Phase 1 verification (`PATH_MAPPING_AND_RECONCILIATION_REPORT.md` Appendix A.5/A.6; `CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL.md` §1.6) found **zero live client folders conforming to v0.2**: no `_client/_project/_session` manifests exist under any live client folder; `FLORIDA RAMP AND LIFT` has no v0.2 structure at all; `Paris Nelms` and `TEST-E2E` are divergent/pre-schema; and `G:\AJ-CLIENTS\_TEMPLATE` is itself a divergent legacy tree, not the canonical implementation (the v0.2 reference tree is `G:\AJ-CLIENTS\_GLOBAL_SCHEMA\client-root\`). v0.2's canonical status rests on operator Ruling 2 (2026-07-19), not on adoption.

**A-1 — §7 Open Decisions: dispositions under the operator rulings of 2026-07-19** (`OPERATOR_RULINGS_2026-07-19.md`):

1. Branch → resolved by Ruling 1: `docs/prospect-brand-website-system` created in a fresh worktree from governed `origin/main` at `9f14d48`; per the Correction Ruling §2, "current, verified main" means governed `origin/main` for this change unit, and the divergent local `main` is a separate governance issue.
2. Client-folder canonical location → resolved by Ruling 2: `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` (v0.2) is canonical until formally amended; the charter template proceeds only as the v0.3 reconciliation proposal.
3. Positioning conflict → resolved by Ruling 3: personal-brand consulting rejected as AJ Digital's core category; the capability is approved only as the adjacent, productized Founder Authority and Conversion System.
4. Module vs new repo → implicitly settled by Ruling 1's branch placement inside AJ-DIGITAL-OS (`docs/specs/prospect-brand-website-system/`); no separate repository is proposed. Formal confirmation remains open.
5. Reuse boundary → resolved by Ruling 4: the Founder Opportunity Engine owns qualification/scoring and the multi-tenant CRM owns records/lifecycle; this system defines handoffs only.
