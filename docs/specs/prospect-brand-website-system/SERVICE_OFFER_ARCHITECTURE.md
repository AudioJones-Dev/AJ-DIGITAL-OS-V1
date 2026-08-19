---
title: Founder Authority and Conversion System — Service Offer Architecture
document_type: service_offer_architecture
version: 0.1
status: proposal
canonical: false
authority: operator-ratification-required
created: 2026-07-19
decision_basis: OPERATOR_RULINGS_2026-07-19.md
---

# Founder Authority and Conversion System — Service Offer Architecture

**System name status:** "Founder Authority and Conversion System" is the operator-approved working name (Ruling 3, `docs/specs/prospect-brand-website-system/OPERATOR_RULINGS_2026-07-19.md`). It is provisional internal working vocabulary; it is not ratified for client-facing or public use until positioning language is ratified (see §15, Open Contradiction 3).

**Evidence convention.** All repository paths in this document are relative to the worktree root `C:\dev\AJ-DIGITAL-OS-prospect-brand-website-system`. Every section separates **VERIFIED CURRENT STATE** (facts observed in the repository or ruled by the operator) from **PROPOSED FUTURE STATE** (this proposal's design, requiring ratification). Nothing in this document is authorized for implementation, publication, or sale.

**Governance context.** Approval-gate references in this document defer to the AJ Digital OS governance kernel (`G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\`, referenced read-only; core files `_GOVERNANCE_INDEX.md`, `HUMAN_APPROVAL_MATRIX.md`, `GLOBAL_MERGE_CRITERIA.md`). Two pending amendments — `PROPOSED_AMENDMENT-2026-07-10.md` and `PROPOSED_AMENDMENT-2026-07-18.md` — are **unresolved governance context**: any approval rule cited here may change when those amendments are ratified, and this document must be re-reviewed against them before any gate defined here is treated as final.

---

## 1. Core Category

### VERIFIED CURRENT STATE

Ruling 3 (`OPERATOR_RULINGS_2026-07-19.md`) rejects personal-brand consulting as AJ Digital's core category and ratifies:

> A Founder Intelligence Systems and operational intelligence consultancy for founder-led service businesses.

This is consistent with the internal positioning evidence base (all `docs/knowledge/wiki/business-memory/`, status `working`, confidence 2, **not ratified for public use**):

- `audio-jones-brand-philosophy-context.md` L20: positioning "shifted internally from personal brand consulting toward helping founders design organizations that think clearly, remember intelligently, and execute consistently."
- `breakthrough-index.md` L410-412 (Breakthrough 7): "Shifts internal posture from personal branding to founder operating intelligence."
- `session-breakthroughs-2026-07-05.md` L52-53: Audio Jones is "a systems thinker who helps founders externalize reasoning, not merely … a personal brand consultant."
- Corroborated at product level by `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md` L975-977: "AJ Digital CRM Module is a revenue intelligence system inside a founder operating system."

The only working public-copy direction preserved for external use is `audio-jones-brand-philosophy-context.md` L39: "I help founders turn expertise into systems so their business can think, remember, and execute consistently." Internal-only terms — "organizational cognition company" (L47), "Cognitive Operating System" (`cos-internal-only.md` L22) — must not appear in any asset this service produces for publication.

### Binding consequence for this service

The Founder Authority and Conversion System is an **adjacent, productized deployment capability** of that consultancy. It must never be framed — in sales materials, on the AJ Digital website, in proposals, or in delivered assets — as the offering of a personal-brand agency, a general web-design company, a bespoke branding studio, or a disconnected marketing-services provider (Ruling 3 prohibition list).

---

## 2. Adjacent-Capability Classification (Ruling 3 four-level model)

### PROPOSED FUTURE STATE

Ruling 3 requires the service architecture to distinguish four levels. This is the proposed classification; levels 2–4 contents require operator ratification.

| Level | Name | Contents | Status |
|---|---|---|---|
| 1 | **Core AJ Digital category** | Founder Intelligence Systems and operational intelligence consultancy for founder-led service businesses | VERIFIED (Ruling 3) |
| 2 | **Core commercial offers** | Offers that directly sell operational intelligence: AI Receptionist / ResponseOS (verified as primary offer fit in `docs/specs/founder-opportunity-engine-v1.md` L3-6); the Multi-Tenant CRM module ("client-owned CRM, AI receptionist, follow-up engine, and revenue intelligence dashboard built for founder-led service businesses", `AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md` L49); Business Memory / managed intelligence engagements (pilot stage, `docs/knowledge/wiki/business-memory/`, not yet ratified as a public offer) | PROPOSED classification of verified artifacts |
| 3 | **Adjacent deployment capabilities** | **The Founder Authority and Conversion System** (this document): authority strategy, messaging and positioning assets, website planning and production, content architecture, trust assets, conversion assets, and governed handoffs into CRM and intelligence systems (ownership list, Ruling 4). Adjacent capabilities exist to deploy and instrument the core offers — they are sold as pathways into operational intelligence, never as standalone marketing services | PROPOSED |
| 4 | **Optional tactical deliverables** | Individually deliverable artifacts inside an engagement: diagnostic report, brand asset inventory, messaging assets, copy deck, sitemap, page briefs, mock site, trust/proof assets, booking and conversion pathways, structured-data implementation, analytics instrumentation, content pillar plan (catalog in §6) | PROPOSED |

**Classification rule (proposed):** a Level 4 deliverable may be sold à la carte only when it demonstrably serves a Level 1–2 outcome (a measurable trust, conversion, attribution, or memory outcome — §7). A request for Level 4 artifacts detached from any Level 1–2 outcome is a do-not-sell condition (§13).

---

## 3. Customer Problem

### PROPOSED FUTURE STATE (framing conformed to Ruling 3; evidence-backed where cited)

The founder of an established service business loses revenue in ways that are invisible to them because the business's public presence and its operations are disconnected:

1. **Trust and authority leak.** The founder's expertise is real but illegible — fragmented across third-party platforms, stale sites, and inconsistent profiles. Prospects, search engines, and AI answer systems cannot verify who the founder is or why they should be trusted. (Charter §1.1 evidence questions remain valid diagnostic prompts; `PROJECT_CHARTER.md` §1.1.)
2. **Conversion leak.** Demand that does arrive is lost to weak or missing owned pathways: no online booking, no chat, no follow-up, no click-to-call. These are the exact leak signals the Founder Opportunity Engine already detects (`docs/specs/founder-opportunity-engine-v1.md` L107-128: `WEAK_WEBSITE`, `NO_ONLINE_BOOKING`, `NO_CHAT`, `FOLLOWUP_GAP`, `NO_CLICK_TO_CALL`).
3. **Memory leak.** What the business knows about its customers, claims, proof, and positioning lives in no governed system. The sales reframe recorded in `breakthrough-index.md` L56-57 applies: discovery asks "where does your business lose memory, judgment, or execution consistency?" — the public-presence layer is one of the places it loses all three.
4. **Attribution blindness.** The founder cannot connect presence investments to revenue because nothing is instrumented into a system of record.

The problem this service solves is therefore **not** "the founder needs a website." It is: *the founder's authority is not captured as an owned, instrumented digital asset that feeds qualified demand into an operational intelligence system.*

---

## 4. Target Customer

### VERIFIED CURRENT STATE

- The core-category ICP is founder-led service businesses (Ruling 3).
- The Founder Opportunity Engine V1 targets "established, call-heavy service businesses"; its primary offer fit is AI Receptionist / ResponseOS, with CRM, automation, and website work secondary (`docs/specs/founder-opportunity-engine-v1.md` L3-6). Its disqualifiers (not operational, not a customer-facing service business, national chain/franchise, review floor) and fit signals (`OWNER_OPERATED`, `LOCAL_REGIONAL`, `REACHABLE_CONTACT_INFO`) are defined at L132-173 and L156-160.

### PROPOSED FUTURE STATE

Primary target customer for this service:

- A **founder-led service business** (FOE-vocabulary: operational, customer-facing, owner-operated, local/regional) where
- the **founder's personal expertise and reputation are a material driver of purchase decisions** (professional services, skilled trades with owner brands, advisory, health/wellness practices, creative services), and
- the business has **demonstrated demand** (existing customers, reviews, referral flow) but a weak, fragmented, or uninstrumented owned presence.

**Narrowing from the charter (ruling-conformed):** the imported charter's broader ICP — "founder, executive, expert, creator, or business owner" (`PROJECT_CHARTER.md` §0.1) — is narrowed to founders of founder-led service businesses. Executives, creators, and experts who are not operating a service business are **out of ICP** unless the operator explicitly rules an exception. This prevents drift back into personal-brand agency territory.

Secondary target (proposed, requires ratification): existing AJ Digital clients of core offers (ResponseOS, CRM module) whose presence layer undermines the measurable value of those systems.

---

## 5. Service Lifecycle: Diagnostic → Design → Build → Operate

### PROPOSED FUTURE STATE

The operator-required lifecycle replaces the charter's 22-step prospect lifecycle (`PROJECT_CHARTER.md` §9.1) for offer-architecture purposes. Discovery, qualification, and scoring occur **before** this lifecycle begins and belong to the Founder Opportunity Engine (Ruling 4); canonical prospect/opportunity records live in the CRM throughout.

| Stage | Purpose | Entry gate | Exit gate |
|---|---|---|---|
| **1. Diagnostic** | Convert a qualified opportunity into an evidence-backed picture of authority, trust, conversion, and memory gaps | Qualified opportunity handed off from FOE output or CRM opportunity record (§10, §11); or approved inbound intake | Operator-reviewed diagnostic report delivered; go/no-go against §13 do-not-sell conditions |
| **2. Design** | Authority strategy, messaging and positioning assets, content architecture, website plan | Signed diagnostic-stage engagement; client-verified claim set (no inferred positioning treated as approved truth — charter §8.2 evidence discipline, salvaged) | Client-approved strategy, sitemap, page briefs, copy deck, asset inventory |
| **3. Build** | Produce the owned digital asset: website, trust assets, conversion assets, structured data, analytics and attribution instrumentation | Approved design package; approval gates for domain, deployment, and publication per governance kernel (pending amendments noted above) | Launched, instrumented owned asset; handoff records written to CRM (§11) |
| **4. Operate** | Content operations, AEO/SEO upkeep, audience development, attribution reporting, business-memory maintenance; pathway into managed intelligence and core offers | Live instrumented asset; operating agreement | Ongoing — reviewed against §7 outcome metrics; upgrade path into Level 2 core offers |

**Stage-gate discipline (salvaged from charter):** every material statement in any stage output carries an evidence class (`verified_fact | attributed_claim | inference | assumption | recommendation | unknown`, `PROJECT_CHARTER.md` §8.1), and missing information is recorded as a gap, never invented (§8.2). Human approval remains mandatory for domain purchase, public deployment, outreach, price quotation, and publication of inferred claims (charter §8.4, subject to the governance kernel and its pending amendments).

**Pre-sale mock (charter Workstream H, conditionally salvaged):** a private, clearly-labeled mock site may be produced during Diagnostic as a sales-enablement asset, using only FOE compliance-safe rationale plus public sources, under the charter's draft-state transparency states (§8.3). Whether AJ Digital absorbs pre-sale build cost is an economics-model input (§14), not a decision made here.

---

## 6. Standardized Deliverables

### PROPOSED FUTURE STATE (deliverable catalog salvaged from charter Workstreams B, D, E, H, I; conformed to Rulings 3–4)

All deliverables are Level 4 tactical artifacts (§2). Templates listed are Phase 2+ artifacts — named here for continuity with the charter, **not created in Phase 1**.

**Diagnostic stage**
- Authority & Conversion Diagnostic report (salvages charter Workstream D's gap-diagnostic value: owned presence, entity clarity, branded search, proof/credibility, conversion pathways, structured data, technical SEO/AEO/GEO readiness, reputation risk — minus prospect scoring, which is FOE-owned)
- Brand Asset Inventory using the charter's asset-status vocabulary (`verified_existing … consultation_required`, `PROJECT_CHARTER.md` Workstream E) across strategy/positioning, verbal identity, visual identity, digital identity asset groups
- Source registry and evidence/claim ledger for the engagement (charter Workstream C schemas, engagement-scoped)
- Gap taxonomy mapping each gap to business impact and to the service or core offer that closes it

**Design stage**
- Authority strategy and positioning assets (hypothesis-labeled until client-verified)
- Message architecture, content pillars, content architecture
- Website plan: brief, sitemap, user journeys, page briefs, content model, copy deck, structured-data plan (charter Workstream H template set)
- Trust-asset plan: proof architecture, bio set, testimonial/case-study framework (never fabricated — charter §8.2)

**Build stage**
- Produced website (responsive, accessible, structured data, analytics)
- Conversion assets: booking pathways, contact pathways, follow-up capture, offer pages
- Trust assets: about/proof/media pages, founder narrative (client-approved claims only)
- Instrumentation: analytics + attribution event wiring per §10/§11 integration contracts
- QA checklist execution and launch record

**Operate stage**
- Content operations calendar and production
- AEO/SEO/GEO maintenance and reporting
- Founder-owned audience assets (email list, owned channels) with consent tracking
- Quarterly authority/conversion review against §7 metrics
- Business-memory maintenance: engagement ledger kept current as the client's governed presence-layer memory

**Sales-enablement artifacts (charter Workstream I, salvaged; internal use)**
- Pitch brief, consultation agenda, discovery question bank, proposal scope template — with the discovery reframe from `breakthrough-index.md` L56-57 ("where does your business lose memory, judgment, or execution consistency?") as the consultative spine. Outreach automation remains excluded until an approved outreach standard exists (charter Workstream I).

---

## 7. Measurable Outcomes

### PROPOSED FUTURE STATE

Ruling 3 names eight mandatory outcome families. Proposed metric mapping (instruments in parentheses; CRM attribution surface is VERIFIED at `src/crm/crm-attribution.ts` and specified in `AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md` §14 L682-737):

| Outcome (Ruling 3) | Candidate metrics | Measurement surface |
|---|---|---|
| **Trust** | Review response coverage, proof-asset completeness score, verified-claim ratio in published copy | Engagement ledger; diagnostic re-runs |
| **Authority** | Branded search impressions, AEO/answer-engine citation presence, entity/knowledge-panel consistency, media/speaking inventory growth | Search console + diagnostic re-runs (tooling TBD) |
| **Qualified lead generation** | `lead_created`, `lead_scored`, `lead_qualified` attribution events; lead score distribution (normalized 0-100 per intake model) | Tenant-scoped CRM attribution events (module spec §14); intake model L423-431 |
| **Conversion** | `opportunity_created/stage_changed/won/lost`, `speed_to_lead_*`, `missed_call_*` event families; booking-completion rate | CRM attribution events; `CrmOpportunity` lifecycle (`open/won/lost`, object model L276) |
| **Attribution** | Share of won revenue with complete source-to-outcome event chains; `mapScore {meaningful, actionable, profitable, total}` coverage | Attribution Layer (Layer 14, `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`); module spec §14 |
| **Founder-owned audience development** | Owned-list growth, consent-tracked contacts (`consentStatus` on `CrmContact`, module spec L341-357), owned-channel engagement vs third-party dependency ratio | CRM contact records; analytics |
| **Business memory** | Governed source/claim/asset ledger completeness; reuse rate of ledger assets in later content; zero unsupported published claims | Engagement ledger; QA metrics (charter §17 `unsupported_claims_found`) |
| **Measurable revenue outcomes** | Revenue attributed to owned-asset-originated opportunities; `revenue_leak_detected` closure rate; payback vs engagement cost | CRM attribution + economics model (§14) |

**Constraint:** end-to-end measurement of lead generation, conversion, attribution, and revenue impact for **client-deployed** websites is currently blocked by the intake-source restriction — see Open Contradiction 2 (§15). Until resolved, these outcomes are measurable only for assets flowing through sanctioned intake.

---

## 8. Scope Boundaries

### VERIFIED CURRENT STATE (Ruling 4 ownership, binding)

| System | Owns |
|---|---|
| **Founder Opportunity Engine** (`docs/specs/founder-opportunity-engine-v1.md`) | Prospect discovery, website/revenue-leak analysis, qualification, scoring, CRM-ready opportunity output |
| **Multi-Tenant CRM** (`docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`, `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`, `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md`) | Canonical prospect, company, opportunity, communication, lifecycle records; pipelines; tasks; attribution and customer history where already specified |
| **Founder Authority and Conversion System** (this service) | Founder and company source collection, authority strategy, messaging and positioning assets, website planning and production, content architecture, trust assets, conversion assets, approved handoffs into CRM and intelligence systems |

This system **may** define handoffs, required fields, workflow triggers, and asset-generation processes. It **may not** create another independent prospect database, lead-scoring engine, qualification methodology, CRM object model, opportunity pipeline, or canonical client identity system (Ruling 4).

### PROPOSED FUTURE STATE (operating boundaries)

- All engagement records are tenant-scoped (`tenant_id` mandatory; composite identity `tenantId + objectId` per object model L173-269). Internal AJ prospecting operates under an `internal_aj` tenant (tenant types `internal_aj | client | sandbox | demo`, RLS spec L103). Cross-tenant lookups are prohibited (object model L602-604).
- Engagement-scoped source registries and claim ledgers are **working documents about one client's presence layer**, keyed to CRM identities — they are not a prospect database and hold no cross-client records.
- Website-derived diagnostic evidence reused from FOE inherits the FOE compliance boundary: only AJ-derived signals, scores, rationale, and crawl facts persist; never raw Google review counts, ratings, phone, category, hours, or review text (`founder-opportunity-engine-v1.md` L59-83).
- No website event may create a `Client`, `ClientAccount`, `Project`, `Deliverable`, or `Report` (object model doctrine L14-22 and intake model dedup layer 4, `docs/architecture/AJ_DIGITAL_OS_INTAKE_EVENT_MODEL.md` L311-370). Client conversion follows the CRM commercial lifecycle chain, with client-account creation only after approval (object model L628-635).

---

## 9. Exclusions

### PROPOSED FUTURE STATE (conformed to Rulings 3–4; salvages charter §7 non-goals where still valid)

This service does **not**:

1. Discover, qualify, or score prospects (FOE-owned; Ruling 4).
2. Create or maintain prospect/opportunity/communication records of its own (CRM-owned; Ruling 4).
3. Sell standalone websites, logos, or brand identities detached from operational-intelligence outcomes (Ruling 3; §13).
4. Reposition AJ Digital as a personal-brand agency, web-design company, branding studio, or marketing-services provider (Ruling 3).
5. Invent a client's USP, mission, story, credentials, testimonials, or any identity fact; missing information is a gap requiring consultation (charter §7, §8.2 — salvaged).
6. Automate domain purchase, public deployment, outreach, or publication of claims without human approval (charter §8.4 — salvaged; gates subject to the governance kernel and its two pending amendments).
7. Publish internal positioning vocabulary ("organizational cognition company", "Cognitive Operating System", Business Memory pilot content) in any client-facing or public asset (`cos-internal-only.md` L22; `audio-jones-brand-philosophy-context.md` L85; pilot README gating).
8. Perform trademark clearance, legal brand review, or definitive naming-risk analysis (charter §7 — salvaged; flagged to operator/counsel).
9. Scrape in violation of platform terms, robots controls, or access restrictions (charter §7 — salvaged).
10. Build production social-media management, paid-advertising management, or PR services (out of ownership list; would require a separate ruling).

---

## 10. Integration with the Founder Opportunity Engine

### VERIFIED CURRENT STATE

- FOE V1 emits "CRM-ready opportunities with research-ready rationale" (`founder-opportunity-engine-v1.md` L14, L93-94), serialized via the `opportunity-output/` module and persisted through the existing `src/intelligence/opportunity-store.ts` path (L54-56; file verified present). Scoring: Demand (cap 40) × Leak (cap 40) × fitFactor, thresholds `<40` PARK, `40-60` WATCH, `>60` QUALIFIED (L132-173).
- Vocabulary contract: "Signal" is atomic input vocabulary, "Opportunity" is the scored output vocabulary (L19). FOE scoring is kept separate from the AEO keyword scorer (`src/intelligence/opportunity-scorer.ts` must not be overloaded; a distinct `founderOpportunityScorer` is specified, L23-24).
- FOE "opportunities" are Intelligence-Layer records, **not** canonical `CrmOpportunity` objects; external CRM writes are out of FOE V1 scope without a separate approval gate (L49).
- Website-derived signals directly relevant to this service: `WEAK_WEBSITE` (SSL/mobile/performance/staleness components), `NO_ONLINE_BOOKING`, `NO_CHAT`, `FOLLOWUP_GAP`, `NO_CLICK_TO_CALL`, plus disqualifier `ALREADY_SOLVED` and fit signal `OWNER_OPERATED` (L107-122). Checks are tri-state `PRESENT/ABSENT/UNKNOWN`; failed renders yield `UNKNOWN`, never `ABSENT` (L103).

### PROPOSED FUTURE STATE (integration contract — design only)

1. **Consume, never re-score.** This service consumes QUALIFIED research briefs/opportunity records whose signal profile indicates authority-and-conversion offer fit (e.g., high `WEAK_WEBSITE` component severity, `NO_ONLINE_BOOKING`, `FOLLOWUP_GAP`, `OWNER_OPERATED` present). It introduces no scoring, no thresholds, and no competing "opportunity" vocabulary.
2. **Handoff shape (CRM-mediated, proposed):** there is no direct FOE-to-FACS handoff. Per `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md` §5, FOE output reaches this service only through the CRM: a QUALIFIED FOE opportunity becomes a CRM record via the approval-gated FOE→CRM write (Handoff A; gate unresolved, map §7 U4), and a FACS engagement then opens from the CRM composite identity `tenantId + opportunityId` (Handoff B; trigger unresolved, map §7 U1). Engagement-input fields this service expects to arrive with that CRM reference (proposed): the FOE opportunity record ID **as a source reference only** (`SourceReference` pattern, map §4 — never an identity key), fired-signal reasons and rationale (AJ-derived, compliance-safe only), score and axis subtotals (read-only evidence; score mapping is FOE/CRM territory, map §7 U5), `derivedAt`, tenant (`internal_aj` during prospecting), and the offer-fit indication. `placeId` is **excluded**: it is restricted to FOE internals and must not leak into FACS artifacts as an identity key (map §4; `founder-opportunity-engine-v1.md` L59-83). Exact schema remains owned by `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`.
3. **Compliance inheritance.** Diagnostic and sales assets built from FOE handoffs may use only compliance-safe derived facts and paraphrased rationale; the FOE compliance guard test (`tests/intelligence-layer/founder-opportunity-engine/compliance-guard.test.ts`, L40) is the reference standard.
4. **Feedback path (proposed, FOE-side decision):** engagement outcomes (won/lost, observed leak closure) may be offered back to FOE for calibration — but any change to FOE scoring or fit profiles is owned by FOE and its own approval process. See Open Contradiction 1 (§15): FOE V1's fit model is ResponseOS-weighted and has no authority-offer fit profile today.
5. **Protected surfaces.** No modification of Hermes, model-router, BEL/runtime, approval, MCP policy, or existing API routes; no paid API execution or external CRM writes without separate approval gates (L49, L56).

---

## 11. Integration with the Multi-Tenant CRM

### VERIFIED CURRENT STATE

- Canonical doctrine: AJ Digital OS decides canonical CRM state; `audiojones-clean` may request intake; no website event directly creates a project; HubSpot is optional external projection only; n8n is orchestration only (`AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md` L14-22).
- Object model (L104-124): `Tenant, Contact, Company, Lead, Opportunity, Client, Project, WorkflowRun, Task, Deliverable, FileAsset, ApprovalRequest, Report, ActivityLog`, with `IntakeReceipt`, `DeadLetterEvent`, `SourceReference` **required but missing** (L122-124). `Company` service/store support is incomplete; `Project` boundary is open/blocked.
- Lifecycles (must not collapse into one write path, L651): Contact `new→lead→qualified→customer→inactive` (L204); Lead `new→working→qualified→unqualified/converted/lost` (L252); Opportunity `open→won|lost` (L276) with tenant-scoped pipelines; commercial chain contact→lead→qualified→opportunity→won→client account **after approval** (L628-635).
- Communications: `CrmConversation` (channel `phone|sms|email|chat|form|manual`; module spec L433-449); outbound agent communications approval-gated by default (L657-667).
- Every action carries `tenantId`, `actorType`, `actorId`, `riskLevel L0–L4`, optional `approvalStatus` (module spec L178-184). New CRM queries must not use legacy `client_id` as isolation key (RLS spec L96-117).
- Intake front door: signed envelope → `website_intake_events` → tenant resolution → `crm_source_refs` → CRM service → receipt/dead-letter (`AJ_DIGITAL_OS_INTAKE_EVENT_MODEL.md`; documentation only, no endpoint authorized, L7). Approved source system: **`audiojones-clean` only** (L38). Only `website.handoff_requested` may create/link operational CRM objects initially (L53). Opportunity creation requires qualification and approved pipeline/stage config (L446-459). The Phase 1 schema package `src/integrations/audiojones-clean/` is specified but **absent from the worktree** (intake model L750-753).
- CRM runtime surfaces verified present under `src/crm/` (`crm-types.ts`, `crm-service.ts`, `crm-store.ts`, `crm-attribution.ts`, `tenant-context.ts`, etc.); migration `supabase/migrations/20260626150000_crm_multitenant_rls.sql`.

### PROPOSED FUTURE STATE (integration contract — design only)

1. **The CRM is the only prospect/client record system this service touches.** Engagement artifacts reference `tenantId + contactId/companyId/leadId/opportunityId`; this service stores no independent copies of those records.
2. **Lifecycle handoff points (proposed):**
   - Diagnostic engagement opens against an existing `CrmOpportunity` (or one created through sanctioned intake/operator action — never by this service writing directly).
   - Won engagement → client-account creation follows the existing approval-gated chain (object model L628-635); this service supplies deliverable and asset references, not the state transition itself.
   - Client communications during engagements are logged as `CrmConversation` records through CRM service contracts.
3. **Required handoff fields into CRM (proposed, to be finalized in `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md`):** tenant ID, source references (via the specified-but-missing `SourceReference` bridge), engagement stage, deliverable references, attribution instrumentation manifest for the delivered asset.
4. **Inherited gaps:** this service depends on bridge objects (`IntakeReceipt`, `DeadLetterEvent`, `SourceReference`) and the `src/integrations/audiojones-clean/` schema package that are specified but not implemented. This proposal adds requirements pressure but does not authorize their build.
5. **Client-site lead flow:** leads captured by websites this service delivers must ultimately reach the client's tenant in the CRM through a sanctioned intake path. **No such path exists today** — see Open Contradiction 2 (§15).

---

## 12. Path into Attribution, Business Memory, and Managed Intelligence

### PROPOSED FUTURE STATE

This section is the strategic justification for the adjacent capability: the delivered asset is the **instrumented front end of the client's operational intelligence system**, which is what makes the Level 2 core offers measurable and sellable.

1. **Attribution (Layer 14).** Build-stage instrumentation wires the delivered website's events (lead capture, booking clicks, diagnostic starts) toward tenant-scoped attribution event families (`lead_created`, `speed_to_lead_*`, `opportunity_*`, `revenue_leak_detected`; module spec §14 L682-737; runtime `src/crm/crm-attribution.ts`). Full realization is gated on Open Contradiction 2 (intake source restriction).
2. **Business memory (Layer 6 + governed knowledge domain).** The engagement's source registry, claim ledger, and brand-asset inventory are handed to the client as the governed seed of their presence-layer business memory — consistent with "Business Memory is a governed knowledge domain. AI memory is a retrieval/context mechanism" (`business-memory-is-not-ai-memory.md` L24) and "AJ Digital sells durable operating memory, not model recall" (`breakthrough-index.md` L355-356). Both statements are internal doctrine (working, unratified) — they shape design, not public copy. Storage location follows the client-folder schema v0.3 reconciliation proposal (separate Phase 1 document; Ruling 2 — the existing `G:\AJ-CLIENTS\_GLOBAL_SCHEMA` v0.2 remains authoritative until amended).
3. **Managed intelligence (upgrade path).** Operate-stage reporting surfaces where the client loses memory, judgment, or execution consistency beyond the presence layer — the natural entry into Level 2 core offers: CRM module adoption, ResponseOS for call-handling leaks, and (when ratified) Business Memory engagements. The service's success metric as an adjacent capability is the **rate at which Operate-stage clients adopt core offers**, not website volume.

---

## 13. Conditions Under Which the Service Should NOT Be Sold

### PROPOSED FUTURE STATE (do-not-sell gates; each requires operator confirmation before override)

1. **"Just a website" demand.** The prospect wants a website or branding artifact with no operational integration and refuses instrumentation, diagnostic, or outcome measurement. Selling would reposition AJ Digital as a web-design company (Ruling 3 prohibition).
2. **Out of category.** Not a founder-led service business (FOE disqualifier logic: not operational, not customer-facing service, national chain/franchise — `founder-opportunity-engine-v1.md` L132-173), or a personal-celebrity-brand request disconnected from a service business.
3. **Already solved.** FOE `ALREADY_SOLVED` disqualifier fires: the prospect's presence and conversion stack are mature; no honest leak evidence exists.
4. **No verifiable substance.** The founder cannot or will not supply verifiable claims, proof, or consultation time, and the engagement would require inventing identity facts (prohibited, charter §8.2).
5. **Consent/compliance blockers.** Contact is `opted_out` (`consentStatus`, module spec L341-357) or matches suppression/safe-reason codes (`consent_missing`, `suppressed_contact`, intake model L225-272); or required research would violate platform terms (charter §7).
6. **Wrong entry offer.** The leak profile is dominated by call-handling (`HIGH_CALL_DEMAND`, `AFTER_HOURS_GAP`, `RESPONSIVENESS_COMPLAINTS`) with an adequate website: ResponseOS is the correct first sale; this service may follow later.
7. **Negative unit economics.** The populated economics model (§14, Workstream J salvage — populated with §12 attribution data as inputs) shows negative expected contribution and the operator has not approved a strategic exception.
8. **Unresolved identity/legal risk.** Trademark, impersonation, or domain-dispute risk is flagged and unreviewed (charter Workstream G risk fields — salvaged as gate, not as automation).
9. **Tenant-isolation conflict.** The engagement would require cross-tenant data use or conflicts with an existing tenant's engagement (object model L602-604 prohibition).
10. **Governance-blocked.** A required approval gate cannot be satisfied — including any gate whose definition is in flux under the two pending governance amendments — until the operator resolves it.

---

## 14. Charter Salvage Map (Workstreams B, D, E, H, I, J)

### PROPOSED FUTURE STATE

What survives from `PROJECT_CHARTER.md` and what the rulings override:

| Workstream | Survives (conformed) | Overridden / removed | Overriding authority |
|---|---|---|---|
| **B — Service & Offer Architecture** | Scope boundaries, inputs/outputs, exclusions, approval requirements, service promise structure → this document | "Ideal customer profile" and "prospect qualification criteria/trigger conditions" as this system's property — qualification is FOE-owned; ICP narrowed to founder-led service businesses | Rulings 3, 4 |
| **D — Digital Gap & Opportunity Analysis** | Full gap-diagnostic value: presence, entity, credibility, conversion, structured-data, SEO/AEO/GEO, reputation dimensions → Diagnostic-stage deliverable; `GAP_TAXONOMY.yaml` concept | `OPPORTUNITY_SCORING_MODEL.md` as a new scoring engine — prohibited; scoring stays in FOE. Gap severity/impact classification (non-scoring) is retained for engaged clients | Ruling 4 |
| **E — Brand Asset Architecture** | Asset-status vocabulary, all four asset groups, `BRAND_ASSET_INVENTORY_TEMPLATE.md`, gap-report and documentation-architecture concepts | Framing as "personal-brand" foundation → reframed as founder-authority assets serving conversion and memory outcomes | Ruling 3 |
| **H — Mock Website Generation** | Full pipeline (approved research → claim set → strategy → sitemap → briefs → copy → private mock → QA → pitch asset); draft-state transparency; template set | Nothing structural; compliance boundary added for pre-consent data (FOE-derived facts only) | Ruling 4 (data), charter §8.3 retained |
| **I — Sales Enablement** | Ten-part pitch structure, consultation agenda, discovery question bank, proposal scope template; outreach-automation exclusion | Pitch framing must lead with operational-intelligence outcomes, not personal-brand outcomes; discovery spine uses the memory/judgment/consistency reframe | Ruling 3 |
| **J — Pricing & Packaging** | Cost-driver list (domain, research labor, AI/API, design, development, deployment, PM, consultation, revisions, subscriptions, fees, support, risk reserve, margin, opportunity cost); speculative-build formula (Expected Gross Profit × Conversion Probability − Pre-Sale Cost − Carrying Costs); four packaging hypotheses **as pricing-model inputs only** | Any final price. Package names conformed: "Personal Brand Foundation/Website" → "Founder Authority Foundation" / "Founder Authority Website"; Package 4 "Founder Authority System" aligns with the provisional approved working name "Founder Authority and Conversion System" (Ruling 3 — a working name, not ratified positioning; see the opening note, Open Contradiction 3, and `POSITIONING_DECISION_RECORD.md` D3). No package is ratified | Rulings 3; operator directive (economics = model to be populated) |

**Package 4 vs the capability itself (deferred question, recorded here):** `POSITIONING_DECISION_RECORD.md` §7.3 defers to this document the question of whether Package 4 ("Founder Authority System") and the Founder Authority and Conversion System capability are the same commercial object or two distinct objects (a Level 3 capability containing a top-tier Level 4/packaged offer). This document records the question without resolving it: the §2 classification treats the capability as a Level 3 adjacent capability and all four packages as pricing-model inputs only, and neither reading is adopted by assumption. Resolution is an operator ratification item (§16, item 6).

**Economics model status:** `PRICING_STRATEGY.md`, `PACKAGE_MATRIX.md`, `COST_MODEL_SCHEMA.yaml`, `UNIT_ECONOMICS_WORKSHEET.md` remain future deliverables. This document sets no prices; it defines the model shape (cost drivers + packaging hypotheses + speculative-build formula + §7 outcome value evidence) to be populated with measured costs before any price is proposed.

---

## 15. Open Contradictions

Newly discovered during this pass; recorded per operator constraint ("report any newly discovered contradiction rather than resolving it through assumption"). None are resolved here.

**1. Qualification ownership vs FOE V1 offer-fit scope.**
Ruling 4 assigns all qualification and scoring exclusively to the Founder Opportunity Engine and prohibits this system from creating a qualification methodology. But FOE V1's ruled scope is ResponseOS-first: "Primary offer fit: AI Receptionist / ResponseOS; secondary: CRM, automation, website work" (`docs/specs/founder-opportunity-engine-v1.md` L3-6), and its Demand/Leak/Fit axes (L132-173) are weighted for call-handling leaks. There is **no authority-and-conversion offer-fit profile anywhere** — this system may not build one, and FOE does not yet have one. Consequence: until FOE is extended (an FOE-side decision with its own approvals), this service has no sanctioned, offer-tuned qualification input and can only consume the general QUALIFIED threshold plus manual operator judgment. Options for the operator: (a) authorize an FOE V1.x fit-profile extension; (b) accept generic QUALIFIED + operator triage as the interim gate; (c) restrict this service to inbound/consented prospects until (a).

**2. Intake source restriction vs the attribution mandate for client-deployed websites.**
Ruling 3 makes attribution and measurable revenue impact mandatory outcomes of every delivered website. But the intake event model authorizes exactly one source system — `audiojones-clean` (`docs/architecture/AJ_DIGITAL_OS_INTAKE_EVENT_MODEL.md` L38) — and only `website.handoff_requested` may create/link CRM objects (L53). Websites this service delivers for **clients** (client tenants, client domains) have no sanctioned event path into the CRM, so leads and conversions they generate cannot legally enter the canonical record or the attribution layer. The required bridge objects (`IntakeReceipt`, `DeadLetterEvent`, `SourceReference`) and the `src/integrations/audiojones-clean/` schema package are additionally unimplemented (object model L122-124; intake model L750-753). Options for the operator: (a) extend the intake model with per-tenant registered source systems (documentation-first, then build approval); (b) scope the attribution outcome to AJ-owned surfaces until (a); (c) treat client-site attribution as client-side analytics only, outside the CRM — which would leave Ruling 3's attribution outcome unmeasurable in the system of record.

**3. Ratified service name and category vs unratified public positioning vocabulary.**
Ruling 3 ratifies the category framing and the working name "Founder Authority and Conversion System" for internal architecture. But every supporting positioning source is `status: working`, confidence 2, explicitly "Do not use publicly yet" (business-memory pilot gating; `audio-jones-brand-philosophy-context.md` L85: agents "should not rewrite public positioning from these working notes without Audio approval"). The only preserved public copy is the single working sentence at `audio-jones-brand-philosophy-context.md` L39. Consequence: this service can be architected but **not publicly marketed** — no ratified public vocabulary exists for its category, name, or promise. Operator must ratify public positioning language (a `POSITIONING_DECISION_RECORD.md` deliverable exists in the Phase 1 list, but public-copy ratification is Audio's explicitly reserved decision, outside that document's authority).

---

## 16. Ratification Requirements

This document becomes input to operator ratification, not doctrine. Specific decisions required:

1. Levels 2–4 classification contents (§2) and the Level 4 à-la-carte rule.
2. Target-customer narrowing and the secondary (existing-client) segment (§4).
3. Lifecycle stage gates and the pre-sale mock policy (§5).
4. Outcome metric set and measurement surfaces (§7), contingent on Open Contradiction 2.
5. Do-not-sell gate list (§13).
6. Salvage decisions, conformed package names, and whether Package 4 and the capability are one commercial object or two (§14; deferred by `POSITIONING_DECISION_RECORD.md` §7.3).
7. Resolution direction for each Open Contradiction (§15).
8. Re-review of every approval gate herein once `PROPOSED_AMENDMENT-2026-07-10.md` and `PROPOSED_AMENDMENT-2026-07-18.md` are resolved.
