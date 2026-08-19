---
title: Ratification Packet — Prospect-to-Founder-Authority Website System, Phase 1
document_type: ratification_packet
version: 0.1
status: review-packet
canonical: false
decision_authority: none (decision-support artifact)
created: 2026-07-19
decision_basis: OPERATOR_RULINGS_2026-07-19.md
---

# Ratification Packet — Phase 1 (2026-07-19)

Condensed decision-support summary of the 8-file Phase 1 corpus (~175 KB) at `docs/specs/prospect-brand-website-system/`, built from five independent verification passes plus a corrections adjudication; ~30 external citations spot-checked against live files, all resolved within ±2 lines. This packet decides nothing.

Abbreviations: RUL = OPERATOR_RULINGS_2026-07-19; PMR = PATH_MAPPING_AND_RECONCILIATION_REPORT; SOA = SERVICE_OFFER_ARCHITECTURE; V03 = CLIENT_FOLDER_SCHEMA_V0_3_RECONCILIATION_PROPOSAL; PDR = POSITIONING_DECISION_RECORD; MAP = SYSTEM_BOUNDARY_AND_INTEGRATION_MAP; PC = PROJECT_CHARTER; CSD = CURRENT_STATE_DIAGNOSTIC (all .md); FACS = Founder Authority and Conversion System.

## 1. Executive decision summary

**Phase 1 establishes:** (1) four ratified rulings — branch, client-folder authority (v0.2 canonical), positioning, system boundaries — in a decision record whose v1.1 frontmatter separates decision authority (ratified) from repository publication (pending merge) (RUL); (2) a verified no-mutation path map (PMR); (3) the category fixed — Founder Intelligence Systems core, personal-brand consulting rejected, the website capability only as adjacent productized FACS with 8 mandatory outcome families (Ruling 3; PDR D1–D7; SOA); (4) a binding FOE/CRM/FACS boundary — prohibitions with substitutes, identifier-minting rules, handoffs A–G (MAP §1–§5); (5) a minimum-delta v0.3 path — one service lane as strict superset of v0.2, proposal only (V03); (6) the charter preserved verbatim under overlay A-001 + r1, scope reset from ~41 artifacts to six deliverables; (7) a globally-unique open-issue register (OC-1..5, SC-1..3, U1–U13, A-001.3 items 1–4; collisions fixed this pass, §11); (8) pending kernel amendments 2026-07-10/07-18 flagged wherever gates are cited.

**Phase 1 does NOT authorize:** any code, schema, endpoint, tenant, pipeline, or event family (incl. v0.3 JSON, bridge objects, `src/integrations/audiojones-clean/`); any write to G:/H:/J:, vault restructuring, or client-folder mutation; any public marketing copy; any independent prospect database, scoring engine, qualification methodology, CRM object model, pipeline, or client-identity system; any live integration (U1–U13 open); any pricing or sale; staging/committing/merging (merge is HUMAN_REQUIRED); marking any proposal canonical (RUL Constraints; MAP §9; SOA §16; V03 §9.3).

**Readiness:** all 8 documents READY; the three formerly READY-WITH-CORRECTIONS (PMR, PDR, SOA) had all authorized corrections applied and verified this pass (§10–§11). **No document requires remediation.** One item was deliberately NOT edited into the corpus: the local-main divergence question, surfaced in Appendix A per the "report, don't resolve" constraint.

## 2. Document status matrix

| Document | Purpose | Current status | Proposed authority | Decisions encoded | Open issues | Dependencies | Recommendation |
|---|---|---|---|---|---|---|---|
| RUL | The four rulings, 6 deliverables, 13 constraints | v1.1 ratified; authority: Operator-ratified; publication: Pending merge; body verbatim v1.0 | Ratified decision record (already binding) | R1 branch; R2 v0.2 canonical; R3 positioning; R4 boundary | 2 pending governance amendments (context) | CSD; supersedes PC via A-001 | **READY** |
| PMR | Charter paths vs verified reality; status registry | v0.1 proposal; canonical: false; Part 0 no-mutation statement | Evidence record + accepted proposals P-1..P-6 (Part V.2) | Phase 0 conflict dispositions (C-1..C-4 resolved; C-5/C-6 out of scope); charter catalog deferred | OC-1..5; `G:\AJ-DELIVERY` observed-not-ruled; P-6 deferred | CSD, V03, RUL | **READY** (SC/OC refs fixed, 7 locations) |
| SOA | Offer classification, ICP, lifecycle, deliverables, outcomes, gates | v0.1 proposal; "Nothing … authorized for implementation, publication, or sale" | Accepted proposal (standard after §16 items decided) | Levels 2–4; ICP narrowing; gated lifecycle; exclusions; do-not-sell gates; package renames; no prices | §15 OC 1–3; 8 ratification items (§16) | RUL, PDR §7.3, MAP, FOE/CRM specs, intake model | **READY** (6 corrections applied) |
| V03 | Workstream F reconciled into v0.2; minimum v0.3 delta | v0.1 proposal; §0 restates Ruling 2; §9.3 "confers no write authority" | Accepted proposal (canonical only via separate governed v0.2 amendment) | Every charter folder mapped or rejected (§5); single delta = one lane; strict superset; 10 acceptance criteria (§8) | SC-1..3 (§10); `_TEMPLATE`/TEST-E2E/vault/ledger/prospect-folder dispositions | RUL R2/R4; PC Workstream F/§15; PMR App. A | **READY** (internally clean) |
| PDR | Ruling 3 as facts D1–D7; supersession table; triggers | v0.1 status: decision-record; canonical: false; §0 separates ruling authority from placement | Ratified decision record (ratification = placement + confirming §3 rows 4–9 / D6 extensions) | D1–D7; 9-location supersession table (§3); 6 review triggers (§6) | §7.1 business-memory status; §7.2 vocabulary; §7.3 Package 4 | RUL (sole binding source); CSD; PC; business-memory files (corroboration only) | **READY** (§3 fix applied) |
| MAP | Ownership; prohibitions; identifier rules; Handoffs A–G | v0.1 proposal; §9: nothing authorized | Accepted proposal (binding only with rulings on U1–U13) | FACS mints artifact IDs only; placeId struck from Handoff A (Correction Ruling 2026-07-19 §3); Handoff A field contract; PC §9.2/§12.1 retired | U1–U13 (§7); 4 open contradictions (§8) | RUL R4 verbatim; FOE/CRM specs; intake model; SOA | **READY** (placeId harmonized; U13 added) |
| PC + A-001 | Charter verbatim; A-001 ruling overlay (21-row override table; A-001.3/.4) | Original: v0.1-draft proposal, verbatim (no edits above L1942); A-001 embedded proposal metadata | Original = historical evidence (superseded-in-part); A-001 = ratified overlay upon confirmation | See §4 | A-001.3 items 1–4 (item 3 now MAP U13) | RUL; PDR §3 (by reference); CSD | **READY** (§17 row harmonized) |

*Context — CSD (Phase 0 evidence, not a deliverable):* draft, canonical: false; ruled valid by RUL preamble; its §6 item 2 adoption overstatement corrected by A-001-r1 without mutating the record. **READY as evidence; do not edit.**

## 3. Operator-ruling traceability matrix

| Ruling | Implementing docs | Status | Remaining ambiguity |
|---|---|---|---|
| **R1 — Branch** | PMR §I.1, Part II rows 1–2, III C-1, V.1/V.3; PC A-001.2 rows 1–2; CSD §1–2; naming standard verified (`docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` §11) | **FULLY IMPLEMENTED.** Branch verified active; GOAL convention rejected; codex branch + staged files untouched (git-corroborated) | Whether the branch base (origin/main 9f14d48) satisfies "current, verified main" given local-main divergence — Appendix A |
| **R2 — Client-folder authority** | V03 entire; PMR §I.4, Part II rows 3–5, Part V, App. A; PC A-001.2 Workstream F + §15.1 rows | **FULLY IMPLEMENTED** at documentation level: strict superset, zero G: writes, implementation gated separately (V03 §9.3) | "Extend the 00_ADMIN…08_ARCHIVE model" read as adding a service lane (v0.1→v0.2 precedent) — ratify consciously; `_TEMPLATE` (OC-1) and deliverable roots (SC-1) not adjudicated by R2 — correctly open |
| **R3 — Positioning** | PDR D1–D7, §3, §5–§7; SOA §1–§2, §4, §7, §9, §13–§14; PC A-001.2 nine R3 rows | **FULLY IMPLEMENTED.** Four-tier distinction, forbidden list, 8 outcomes carried verbatim (8th outcome restored this pass) | All flagged, none silently resolved: name internal-only (SOA §15 OC-3); tier-2 contents editorial (PDR §4); Package 4 (PDR §7.3); business-memory status (PDR §7.1) |
| **R4 — System boundaries** | MAP entire (ruling verbatim §1–§2); SOA §8, §10–§11; PC A-001.2 six R4 rows; PMR Part VI | **FULLY IMPLEMENTED** as boundary documentation; Handoff A field contract exercises the permission without prohibited design; FOE evidence verified (caps 40/40/20; L49) | Recorded, not resolved: analysis-vs-scoring (A-001.3 #1); §9.2 17-state disposition (MAP §8.2); Handoff G acceptance (U12); metrics-store ownership (A-001.3 #2); intake system-of-record (→ U13) |

## 4. Charter override summary (A-001.2, 21 rows — all verified)

Each original assumption located at its cited charter section; each evidence artifact exists and supports the override; each replacement rule implemented in the corpus, none asserted-only. By cluster:

| Overridden clause(s) | Original claim → verified evidence | Replacement rule | Affected docs | Implemented? |
|---|---|---|---|---|
| §25 branch (L1880) + GOAL convention (L1887) | Legacy branch and GOAL naming exist → CSD §1/§2: both absent | Ruling 1 branch + worktree; no GOAL convention | PMR | Yes |
| Workstream F tree (L728–811) + §15.1 (L1392–1400) | Charter tree is the target; "in use (3 client folders)" → v0.2 canonical (Ruling 2); zero live conformance (PMR A.5/A.6); r1 corrected the overstatement | Tree demoted to reconciliation input; every path mapped or rejected | V03, PMR | Yes |
| Title, §0, §1.1, §2, §3.1–3.3, §4, §6.2 patterns, Workstream J names (nine R3 rows; lines verified) | Personal-brand consulting as core; personal-brand package names → Ruling 3 verbatim; business-memory quotes verified | Founder Intelligence Systems core; FACS adjacent; conformed "Founder Authority" names; PDR §3 incorporated by reference (A-001.1 item 2) | PDR §3, SOA §1/§2/§14 | Yes |
| §9.1/§9.2 (17 states, L472–491), §12.1, Workstream B, Workstream D scoring model, §6.2 scoring objective, §17 metrics (six R4 rows) | Charter builds its own pipeline, prospect records, qualification, scoring, prospecting/sales metrics → FOE + CRM specs own these (cites verified verbatim) | Subordinated to FOE/CRM; §9.1 stages = FACS-internal production workflow only; FACS tracks only research/production/economics/quality metrics of its own assets (harmonized this pass) | MAP, SOA | Yes; residuals logged in A-001.3 |
| Workstream A | Diagnostic still to be produced → CSD exists; RUL preamble validates it | Complete | — | Yes |
| §24.4 catalog (counts verified: 22/7/12) | ~41 Phase 1 artifacts → RUL deliverable list | Reset to six deliverables; corpus contains exactly those | All | Yes |

Cross-check: PDR §3 and A-001.2 aligned row-for-row both directions (r1 added the six rows A-001 lacked); no clause superseded in one and omitted by the other.

## 5. Blocking decision register

**B** = blocks ratification; **I** = blocks implementation, not merge; **D** = design debt; **S** = superseded/resolved. The corpus records open items honestly, so the minimal honest blocking set is **three decisions**. The former defect-correction gate is **satisfied** — all authorized corrections applied and verified this pass, incl. the missing intake-record register entry (now U13).

### Blocks ratification (3)

| ID | Question | Options | Recommendation | Default if deferred | Affects |
|---|---|---|---|---|---|
| **B-1** | Which documents become doctrine at merge vs remain published proposals? (PC §23.25; RUL Constraints; PDR §0) | (a) merge all as proposals + separate per-document ratification list; (b) ratify selected docs as doctrine at merge | **(a)** — matches the Constraints, the authority/publication split, HUMAN_REQUIRED merge. Tradeoff: second ratification act needed for the overlay to bind | Nothing merges; project stalls | All 8 files |
| **B-2** | Confirm or strike editorial extensions beyond the rulings' literal text: PDR §3 rows 4–9 + D6 tier-2 examples (PDR §4 flags them) | Confirm / strike / amend | **Confirm as written** — every row cites its ruling; r1 records no rule weakened; no contrary evidence | Rows 4–9 stay proposal-status; "personal-brand" naming latent in PC §0/§2/§4/§6.2/Workstream J | PC (A-001), PDR |
| **B-3** | Confirm SOA structural proposals (§16.1–5): Level 2–4 contents + à-la-carte rule; ICP narrowing; lifecycle gates + pre-sale mock policy (subsumes PC §23.8); §7 outcome metrics; §13 do-not-sell gates | Confirm / amend / defer per item | **Confirm as written**, with §7 attribution/revenue metrics scoped to sanctioned-intake surfaces until I-1 resolves. Tradeoff: ICP excludes executives/creators absent exception | Service architecture stays proposal; packaging, pricing, marketing lack a ratified basis | SOA, PDR (D6) |

### Blocks implementation, not merge (13)

| ID | Item (source) | Recommendation / default |
|---|---|---|
| **I-1** | Client-site intake vs mandatory attribution: only `audiojones-clean` authorized (intake L38); FACS sites have no sanctioned event path (SOA §15 OC-2; MAP U6/§8.3). **Highest-consequence item** | Scope attribution to AJ-owned surfaces interim; authorize documentation-first intake-model extension; analytics-only would leave a binding R3 outcome unmeasurable. Default: PDR §6.2 trigger eventually fires |
| **I-2** | No FACS attribution event families (MAP U3; module spec §14) | Authorize CRM spec amendment draft; defer names. Default: milestones unmeasurable in Layer 14 |
| **I-3** | FOE→CRM write gate + score mapping (MAP U4/U5; FOE L49) | Defer to FOE/CRM owners alongside Handoff A. Default: operator-mediated |
| **I-4** | Engagement trigger (U1) + 17-state §9.2 disposition (MAP §8.2) | Enumerate the §9.2 disposition inside the U1 ruling. Default: ad hoc starts |
| **I-5** | Asset-metadata home (U2) + analysis-vs-scoring boundary (MAP §8.1 = A-001.3 #1) | Rule: diagnostic severity ordering = analysis; numeric prospect-ranking = FOE. Default: R4 ambiguity persists |
| **I-6** | No authority-offer fit profile in FOE V1 (SOA §15 OC-1) | Interim: generic QUALIFIED threshold + operator triage; FOE V1.x extension via FOE's process. Default: interim happens unrecorded |
| **I-7** | v0.3 decision set, 9 sub-decisions (V03 §9.2/§8.9–8.10; PMR OC-1/3/5): lane name (recommend `founder-authority`); `_TEMPLATE` (recommend deprecate — wrong-template cloning proven; **only item with live growing risk**); TEST-E2E, client vaults (incl. "Flroida"), domain ledger, prospect folders — defer; sub-stage guidance — adopt; SC-1 roots — no recommendation (PC §15.2 permits canonical + mirror); manifest policy — adopt V03 §6.3. Verify first: SC-2 doctrine note, SC-3 CRM deployment, FRL links, Paris Nelms date, TEST-E2E fixtures | Default safe (v0.2 authoritative) but no sanctioned FACS lane (P-3 blocked); `_TEMPLATE` divergence grows |
| **I-8** | Public positioning vocabulary (SOA §15 OC-3; PC §23.1 L1709) — Audio's reserved decision | Architected, not marketable. Default: no marketing or sale |
| **I-9** | Package 4 vs capability (PDR §7.3; SOA §16.6) | Defer; SOA §2 interim workable. Default: packaging/pricing blocked (also by unpopulated economics model, PC §23.13) |
| **I-10** | Missing bridge objects + absent integration package (MAP U8; verified absent) | Authorize CRM-side build (outside this project). Default: Handoffs A/E cannot produce receipts; FACS must not build around the gap |
| **I-11** | Tenant transition (U7), post-won identity (U10), comms split (U11) | Workable interims implied by corpus. Default: unrecorded |
| **I-12** | Pending governance amendments 07-10/07-18 (A-001.3 #4) | Adopt V03 §9.1's stricter-interpretation default; resolve before Phase 2 gate design (SOA §16.8). Default: gates provisional |
| **I-13** | Prospect-intake system-of-record (PC §4 intake YAML; A-001.3 #3 → MAP **U13** this pass) | Rule out standalone FACS store (R4); choose FOE-input vs CRM-path with the U4 ruling. Default: ad-hoc intake |

### Non-blocking design debt (8)

D-1 business-memory write path (U9) + PDR §7.1 asymmetry (interim: cite the ruling, never the working notes); D-2 FACS→FOE feedback (U12, advisory); D-3 dual compliance regimes (MAP §8.4); D-4 metrics-store split (A-001.3 #2); D-5 vault duplicate numbering (PMR C-5) blocking P-6; D-6 `J:\CLIENT` migration (C-6), `H:\CLIENTS` role, manifest sequencing (OC-4), `_TEMPLATE` marketing lane (OC-3 → I-7); D-7 operational risks, no decision due (C: ~7% free; kernel + client data on exFAT USB — CSD §4); D-8 PC §23 residue, deferred by A-001.2's §24.4 row.

### Superseded or already resolved (8)

S-1 branch → Ruling 1; S-2 Workstream F vs v0.2 → Ruling 2 + V03 (residuals I-7); S-3 positioning → Ruling 3 + PDR (residuals B-2, I-8); S-4 greenfield vs FOE/CRM → Ruling 4 + MAP (residuals U-series); S-5 §15.1 venue → V03 §2; S-6 scoring-model deliverable → A-001.2 (residual I-5); S-7 §9.2 → A-001.2 (residual I-4); S-8 client-folder location + Workstream A → Ruling 2 / complete.

## 6. v0.3 proposal decision

The six required clarifications are all made plainly (verified): (1) v0.2 canonical by ruling until formally amended (Ruling 2; V03 §0.1); (2) zero live folders conform to v0.2 (V03 §1.6; PMR A.5/A.6); (3) `_TEMPLATE` is divergent legacy, not a second standard (V03 §1.6/§3.4; PMR OC-1); (4) v0.3 is a reconciliation proposal, not an implementation (V03 §0.2–0.3); (5) ratification does not authorize drive mutation (V03 §8.8, §9.3); (6) separate implementation authorization required (V03 §9.3; PMR P-2).

**What ratifying V03 decides — exact statement:** the operator approves the reconciliation direction and nothing more: a future v0.3 shall be a strict superset of canonical v0.2 at `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` (authoritative until formally amended, per Ruling 2), whose only structural change is one added service lane for FACS engagements — final lane name reserved to the operator — plus optional sub-stage guidance and a recommended `00_ADMIN` file set; every charter Workstream F requirement is either mapped into the 00_ADMIN…08_ARCHIVE model or rejected per §5. Ratification performs no G: writes, creates no folder, mutates no live client folder (zero new migration burden), does not create `client-folder-schema-v0.3.json`, and does not resolve SC-1–SC-3 or the `_TEMPLATE`/TEST-E2E dispositions. Implementing a ratified v0.3 (schema JSON, README bump, reference-tree lanes, rollout directive — one atomic governed change) requires separate operator authorization; any live-client migration requires yet another.

Scope note: V03 §9.2 phrases eight enumerated sub-decisions (ten if SC-1–SC-3 are counted individually) (lane name, `_TEMPLATE` and TEST-E2E dispositions, client vaults, domain ledger, prospect folders, sub-stage guidance, SC-1–SC-3) as decisions the operator "must make at ratification." This packet's motion deliberately narrows ratification to the direction-only statement above and re-scopes those sub-decisions to **I-7** (blocks implementation, not document merge), each carrying a recommendation and a default. Approving the motion as written supersedes V03 §9.2's timing expectation; an operator who prefers to decide those items now may simply rule on I-7 at the same sitting.

## 7. Existing-system boundary validation

**Duplicate-system check — PASS on all prohibitions** (near-passes flagged, none violations):

| Prohibited system | Honored by | Near-pass note |
|---|---|---|
| FOE discovery/qualification | MAP §1.3; SOA §9.1, §10.1 ("Consume, never re-score") | SOA §6 diagnostic overlaps FOE website-analysis territory — flagged (A-001.3 #1), deferred not resolved |
| FOE scoring | MAP §2; A-001.2 strikes scoring model + §6.2 objective | Gap-severity classification sits on the A-001.3 #1 line; SOA §7 "proof-asset completeness score" is asset QA — confirm at ratification |
| CRM prospect records | MAP §2 + §3.4 (composite CRM identifiers only); SOA §8, §11.1; V03 §0.4/§3.3 | MAP §2 retires PC §12.1 |
| CRM opportunity lifecycle | MAP §2 + Handoff B ("FACS never advances CrmOpportunity stages"); A-001.2 §9.1/§9.2 row | MAP §8.2 re-scoped production states = likeliest shadow-pipeline re-entry vector; U1 should close it |
| CRM communications | MAP §1.3/§3.2, Handoff C, U11; SOA §11.2 | V03 folder-resident comms working copies carry the caveat; U11 contract is the control |
| CRM attribution (where owned) | MAP Handoff D (existing Attribution Layer; new eventTypes only via amendment, U3); SOA §7/§12.1 | FACS own-asset metrics open (A-001.3 #2), consistent with R4's "where already specified" |
| Canonical tenant/client identity | MAP §4 ("never mints identity… asset ids only"); V03 §3.3; SOA §8; cites verified (FOE L49; intake L38/L53; object model L104–124, L651) | — |

**Handoff inventory (MAP §5 — exactly A–G; none referenced anywhere the MAP does not define):**

| Handoff | Status |
|---|---|
| A — FOE opportunity → CRM record (full field contract) | **PROVISIONALLY SPECIFIED**; BLOCKED-BY-U4; U5/U7 subsidiary |
| B — CRM opportunity → FACS engagement (shape only) | **BLOCKED-BY-U1**; U10 subsidiary |
| C — FACS outputs → CRM (Deliverable/FileAsset/CrmConversation) | **PROVISIONALLY SPECIFIED**; BLOCKED-BY-U2, U11 |
| D — FACS outputs → Attribution | **BLOCKED-BY-U3** |
| E — FACS websites → intake front door ("no sanctioned event path" today) | **BLOCKED-BY-U6, U8** |
| F — FACS outcomes → business memory | **BLOCKED-BY-U9** |
| G — FACS outcomes → FOE calibration (advisory; FOE acceptance reserved) | **PROVISIONALLY SPECIFIED**; BLOCKED-BY-U12 |

SOA §10/§11/§12/§15 cross-references to the MAP verified reciprocal and consistent in both directions.

## 8. Positioning validation — PASS (five confirmations)

1. **Founder Intelligence Systems remains core** everywhere (SOA §1; PDR D1; MAP naming note; PMR preamble; V03 §0).
2. **FACS is consistently tier-3 adjacent** (SOA §2; PDR D6; A-001.2 §3.2 row).
3. **Personal-brand consulting rejected as core everywhere it appears** (PDR D2/D5; SOA §1, §9.3–4).
4. **Every deliverable tied to measurable commercial outcomes** (SOA §2 rule; §7 outcome map; §13.1 "just a website" gate; PDR D4).
5. **No indirect reintroduction of forbidden positioning.** Three watch items, none violations: (a) SOA §6's catalog reads as bespoke-branding vocabulary in isolation — ratify its guards (§2 rule, §13 gates) together with it (B-3); (b) package name "Founder Authority Website" keeps "Website" as commercial noun — packages are unratified pricing-model inputs only (SOA §16.6); (c) the verbatim charter body still carries the personal-brand thesis — the A-001 overlay + PDR §3 cover every thesis-level clause (verified). No uncovered personal-brand framing in the five Phase 1 proposals.

## 9. Canonicality and publication-state check

**No proposal document in the corpus marks itself canonical** (all carry `canonical: false`). The only `canonical: true` frontmatter is `OPERATOR_RULINGS_2026-07-19.md`, scoped by its `canonicality_note` to decision authority only, with repository publication state Pending merge. Per the operator Correction Ruling §1, repository publication creates no vault-wide authority and no implementation authorization.

| Document | Classification |
|---|---|
| RUL | Operator-ratified decision (decision authority) / **Pending merge** (repository publication) — two explicit, distinct v1.1 frontmatter fields; internally consistent |
| PMR, SOA, V03, MAP | Proposals; canonical: false; ratification-required; bodies consistent |
| PDR | Hybrid: records ratified D1–D7; the record itself canonical: false pending placement; §0 separates the two levels |
| PC | Original = superseded-in-part proposal, verbatim; A-001 = proposal overlay (rules restating a ratified ruling carry the ruling's authority, per its legend) |
| CSD | Draft Phase 0 evidence, validated by RUL preamble |

**Confirmed:** RUL distinguishes "Decision authority: Operator-ratified" from "Repository publication state: Pending merge"; the directory is untracked in git ("??"), so "Pending merge" is accurate; **no corpus document implies default-branch publication or that any proposal is already effective.** PDR §0/§4's "status: ratified, canonical: true" citations remain literally true under v1.1; PMR §V.3's "canonical (operator decision record)" entry adjudicated consistent — no correction warranted.

## 10. Evidence and claim audit

**Verified accurate** against live files/git: worktree path + branch; zero-v0.2-conformance (3 consistent sources); the 3 live client-folder names; `_TEMPLATE` divergent-legacy status; all FOE spec cites (caps 40/40/20, thresholds, placeId persistence, L49); all CRM object-model/module/RLS cites incl. required-missing bridge objects (L104–124, L651; tenant_type L103); intake model (L38, L53, L430, L750–753 — `src/integrations/audiojones-clean/` confirmed absent); named `src/` files present; 16-layer model; all business-memory quotes at cited lines (`status: working, confidence: 2`); charter internals (§23.1 = L1709; exactly 17 §9.2 states; §24.4 counts exact); drive/vault paths internally consistent (G:-resident facts rest on recorded Phase 0 evidence, correctly labeled; not re-touched per the no-G:/H:/J: constraint).

**Corrected:** §11 table — 18 discrete edits across 5 files.

**Qualified rather than edited:** (a) PMR I.1's "cut from verified main; verified active this session" — the stated verification cannot verify the cut point, and CSD §1's "main" is the local main whose tip the branch does not contain; the proposed rewrite was **rejected** as re-authoring beyond the correction bar; question surfaced in Appendix A. (b) Below-bar observations, no edits: SOA §11 object list omits `ClientAccount`/`ProjectMember` (incomplete, not false); SOA §14 condensed formula (labeled salvage summary); V03 §4.4's charter §23.10 anchor (inexact, plausibly subsumed — confirm at ratification); SOA §13 gate 7's "§12 inputs" (defensible reading exists — confirm intent); PDR frontmatter status vocabulary.

**Ruling-violation scan: clean.** No document marks itself canonical; no contradiction resolved by assumption; no scoring/qualification/prospect-store design; pending amendments noted at every gate citation.

## 11. Cross-document consistency check

Consistent throughout (verified): service name + FACS abbreviation; R4 ownership lists verbatim; Handoffs A–G and U-numbering resolve both directions; identifier doctrine; gates uniformly deferred to the kernel with both pending amendments flagged; prohibitions restated identically; SC-*/OC-* deconfliction explained on the V03 side; PDR §3 ↔ A-001.2 mutually consistent.

**Contradictions found this pass:**

| # | Contradiction | Corrected? |
|---|---|---|
| 1 | PMR cited V03 §10 items by nonexistent "OC-1"/"OC-2" IDs (6 places) + mischaracterized the series as "OC-1–OC-3" (L256) — a live hazard since contradictions are dispositioned by ID (V03 §9.2) | **Yes** — all 7 locations now cite SC-* (verified) |
| 2 | SOA opening note: "provisional client-facing vocabulary" vs its own §15 OC-3 (internal-only) | **Yes** — now "provisional internal working vocabulary; not ratified for client-facing or public use" (verified L14) |
| 3 | SOA broken internal refs: §9/§10 for handoff contracts (are §10/§11); §12 for economics model (is §14), twice | **Yes** — L106, L108, L113, L169 fixed (verified) |
| 4 | SOA §7 eighth outcome "Measurable revenue impact" vs Ruling 3 verbatim "Measurable revenue outcomes" (RUL L82) | **Yes** — verbatim restored (verified L169) |
| 5 | PDR §3 claimed deliverable 4 "explicitly names" charter sections (it names decision points) | **Yes** — reworded (verified L177–178) |
| 6 | A-001.2 §17 row: prose vs parenthetical named different metric-group subsets | **Yes** — harmonized to research/production/economics/quality (verified L1993); scope unchanged |
| 7 | MAP §4 placeId "FOE internals only" vs its own §5 Handoff A (placeId as source-ref, citing §4 for a constraint §4 didn't state) | **Yes** — §4 row harmonized; subsequently superseded by operator Correction Ruling 2026-07-19 §3: `placeId` struck from the Handoff A contract entirely; §4 row now records FOE-internals-only with the strike |
| 8 | A-001.3 item 3 promised the intake system-of-record "to be settled in the integration map"; the MAP had no entry | **Yes** — U13 added (registered, not resolved); §9 range now U1–U13 (verified) |
| 9 | PMR "cut from verified main" vs CSD §1's main (tip e5d2041) which the branch does not contain | **Yes — by later operator authorization.** Initially deferred to Appendix A; the operator Correction Ruling 2026-07-19 (§2, §5 item 2) then interpreted "current, verified main" as governed `origin/main` at `9f14d48` and authorized recording the divergence in PMR Part I.1 (applied); local-main reconciliation remains a separate change unit |

## 12. Recommended ratification motion

*Ratified as decision records:* RUL and PDR (decision authority confirmed; repository publication still pending merge), incl. — per B-2 — PDR §3 rows 4–9 and the D6 tier-2 extensions as written; and PC AMENDMENT A-001 (+r1) as the binding overlay on the verbatim charter. *Accepted as proposals only* (published at merge, not doctrine, per B-1 option a): PMR, SOA (with the B-3 confirmations; §7 metrics scoped to sanctioned-intake surfaces until I-1 resolves), V03 (deciding exactly the §6 statement), and MAP. *Deferred with recorded defaults:* I-1–I-13 (adopting the stricter-interpretation governance default per I-12) and D-1–D-8. *Not authorized:* any implementation; any G:/H:/J:, vault, or client-folder mutation; any public marketing copy; any pricing or sale. *Process:* staging and commit only after final corrections and consistency validation — both complete per §11 — then per §13.

## 13. Post-ratification sequence

Ratification decision (B-1..B-3; any elected I-rulings) → confirm final corrections not reopened (applied and verified this pass) → consistency validation over any ratification-driven edits → stage the Phase 1 file set in the worktree → commit on `docs/prospect-brand-website-system` → push → **draft** PR against `main` → independent review → merge (HUMAN_REQUIRED; nothing is repository-canonical until then). **v0.3 implementation (schema JSON, README bump, reference-tree lanes, rollout directive) is explicitly NOT in this change unit** — separate operator authorization required (V03 §9.3).

## Appendix A — Local-main divergence (context only; no action in this change unit)

Verified during this cycle's git inspection; recorded per the "report, don't resolve" constraint (corpus deliberately not edited — §11 item 9). Local-only `e5d2041` "docs: add business memory pilot kpis" was committed directly to local `main`, never pushed, bypassing the PR gate; remote-only `9f14d48` merged to `origin/main` via PR #70 (governed); merge-base `0e46eda`. This branch is based on `origin/main` at `9f14d48` — the correct base, because that history passed the governed merge process; the open Ruling 1 question is only whether "current, verified main" means origin/main (recommended reading) or the divergent local main. **Reconciliation is a SEPARATE change unit** per the operator's session directive of 2026-07-19 (recorded here in this packet; not yet part of `OPERATOR_RULINGS_2026-07-19.md` — adding it there is an operator option at ratification): inspect `e5d2041` → branch from governed main → cherry-pick/reconstruct → separate PR → only then realign local `main`; no direct push of the divergent local main; no discarding `e5d2041` before review.

## Appendix B — Phase 0 duplicates in the main checkout (context only)

Untracked copies of `PROJECT_CHARTER.md` and `CURRENT_STATE_DIAGNOSTIC.md` remain in `C:\dev\AJ-DIGITAL-OS\docs\specs\prospect-brand-website-system\` (main checkout). Removal is a **separately authorized cleanup**, permitted only after: (1) worktree files committed, (2) commit hash verified, (3) branch pushed, (4) draft PR displays the expected files.
