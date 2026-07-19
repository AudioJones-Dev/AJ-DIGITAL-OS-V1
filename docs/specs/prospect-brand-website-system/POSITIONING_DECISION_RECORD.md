---
title: Positioning Decision Record — Founder Intelligence Systems Core Category and the Founder Authority and Conversion System Adjacent Capability
document_type: decision_record
version: 0.1
status: decision-record
canonical: false
authority: operator-ratification-required
created: 2026-07-19
decision_basis: OPERATOR_RULINGS_2026-07-19.md
---

# Positioning Decision Record

## 0. Status of This Record

This document records positioning decisions already made by the operator in
`docs/specs/prospect-brand-website-system/OPERATOR_RULINGS_2026-07-19.md` (Ruling 3, with boundary
context from Ruling 4). Two distinct authority levels apply and must not be conflated:

- **The underlying operator ruling is binding.** Ruling 3 was issued and ratified by the operator on
  2026-07-19 (`OPERATOR_RULINGS_2026-07-19.md`, frontmatter: `status: ratified`, `canonical: true`).
  The decisions below are recorded as decided facts, not proposals.
- **This record's placement in doctrine is not yet canonical.** Per the Phase 1 constraints
  ("Do not mark proposals canonical"; "Do not create new doctrine outside this bounded project" —
  `OPERATOR_RULINGS_2026-07-19.md`, Constraints), this file is `canonical: false` until the operator
  integrates it into the doctrine tree. Ratification here refers to placement, not to the decisions
  themselves.

---

## 1. Decision Context

**VERIFIED CURRENT STATE.** The Phase 0 diagnostic
(`docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md`) found a strategic
contradiction between the imported charter and pre-existing internal positioning doctrine:

- The charter (`docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md` §1.1) states a
  commercial thesis built on personal-brand websites: "For founders, experts, executives, and
  public-facing business operators, an owned personal-brand website is becoming a baseline
  credibility and discoverability asset rather than an optional marketing accessory."
- The business-memory corpus (`docs/knowledge/wiki/business-memory/`) documents a deliberate,
  pre-existing internal move **away** from personal-brand consulting toward founder/operational
  intelligence (see §5 below for verbatim evidence).
- The diagnostic classified this as **"conflicts — operator decision required"**
  (`CURRENT_STATE_DIAGNOSTIC.md` §5, business-memory row; restated as Contradiction 3 in §6 and
  Open Decision 3 in §7).

The operator resolved that contradiction on 2026-07-19 via Ruling 3. This record captures the
resolution, its rationale, the charter language it supersedes, and the conditions under which it
should be revisited.

---

## 2. Decided Facts (with Rationale)

### D1 — Founder Intelligence Systems remains the core category

AJ Digital remains positioned as:

> "A Founder Intelligence Systems and operational intelligence consultancy for founder-led service
> businesses." (`OPERATOR_RULINGS_2026-07-19.md`, Ruling 3)

**Rationale.** The core category predates the charter and is corroborated by the business-memory
corpus (§5) and by shipped product doctrine — e.g.
`docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md` L975-977 describes the CRM module as "a
revenue intelligence system inside a founder operating system," and L49 describes the client-facing
offer as built "for founder-led service businesses." A single project charter cannot silently
re-derive the company's category.

### D2 — Personal-brand consulting is NOT a core strategic offer

The operator explicitly rejected personal-brand consulting as AJ Digital's core category
(`OPERATOR_RULINGS_2026-07-19.md`, Ruling 3: "Reject personal-brand consulting as AJ Digital's core
category").

**Rationale.** Phase 0 showed the charter's thesis would have repositioned the company against its
own documented strategic direction (§1, §5). Personal-brand framing was already identified
internally as a positioning **risk**, not a strategy
(`docs/knowledge/wiki/business-memory/audio-jones-brand-philosophy-context.md` L24: the previous
belief recorded there was that "The public risk was being understood as a personal brand consultant
helping founders leverage AI.").

### D3 — Founder authority and conversion work is an approved ADJACENT capability

The website/authority capability is approved only as an adjacent, productized service under the
provisional name **Founder Authority and Conversion System**
(`OPERATOR_RULINGS_2026-07-19.md`, Ruling 3). Its purpose is to create an owned digital asset that
improves: trust, authority, qualified lead generation, conversion, attribution, founder-owned
audience development, business memory, and measurable revenue outcomes.

**Rationale.** The capability is commercially real (the charter's evidence-first diagnostic motion
survives) but is subordinate to the core category: it deploys founder intelligence into a public
asset; it does not redefine what AJ Digital is. The name is provisional — the charter's open
decision on final service naming (`PROJECT_CHARTER.md` §23 item 1, "Final service name.", L1709)
remains open.

### D4 — Commercial outcomes are mandatory for the capability

"Measurable revenue outcomes" is a listed, non-optional purpose of the capability
(`OPERATOR_RULINGS_2026-07-19.md`, Ruling 3). The capability exists to produce qualified leads,
conversion, and attribution — not portfolio work.

**Rationale.** This is the structural guard against drift into the forbidden positionings in D5:
a website practice that is measured on revenue attribution stays an intelligence deployment; one
measured on aesthetics becomes an agency. It also aligns with the sales reframe already recorded
internally (`docs/knowledge/wiki/business-memory/breakthrough-index.md` L56: discovery changes
"from 'do you need AI?' to 'where does your business lose memory, judgment, or execution
consistency?'").

### D5 — Forbidden positioning list

The system must not reposition AJ Digital as any of the following
(`OPERATOR_RULINGS_2026-07-19.md`, Ruling 3, verbatim list):

1. A personal-brand agency
2. A general web-design company
3. A bespoke branding studio
4. A disconnected marketing-services provider

Any Phase 1+ document, client-facing asset, package name, or public copy that frames AJ Digital in
one of these four ways is out of compliance with a binding ruling.

### D6 — Four-tier service-architecture distinction

All service-architecture documentation must distinguish
(`OPERATOR_RULINGS_2026-07-19.md`, Ruling 3):

1. **Core AJ Digital category** — Founder Intelligence Systems / operational intelligence
   consultancy (D1).
2. **Core commercial offers** — the offers that directly express the core category (per the
   verified FOE spec, `docs/specs/founder-opportunity-engine-v1.md` L3-6, primary offer fit today is
   AI Receptionist / ResponseOS, with CRM, automation, and website work as secondary).
3. **Adjacent deployment capabilities** — the Founder Authority and Conversion System sits here
   (D3).
4. **Optional tactical deliverables** — individual assets (e.g., a diagnostic report, a copy deck, a
   mock site) that exist only inside an engagement, never as the category.

`SERVICE_OFFER_ARCHITECTURE.md` (Phase 1 deliverable 2) owns the full elaboration of this
four-tier model; this record fixes the tier assignment of the new capability as **tier 3**.

### D7 — Ownership boundary (context from Ruling 4)

Positioning is inseparable from system boundaries: the Founder Authority and Conversion System owns
authority strategy, messaging and positioning assets, website planning/production, content
architecture, trust and conversion assets, and **handoffs** into the other systems. It does not own
discovery, leak analysis, qualification, or scoring (Founder Opportunity Engine,
`docs/specs/founder-opportunity-engine-v1.md`) and does not own canonical prospect, company,
opportunity, communication, or lifecycle records (Multi-Tenant CRM,
`docs/architecture/AJ_DIGITAL_OS_CRM_OBJECT_MODEL.md`,
`docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`). See
`SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md` (Phase 1 deliverable 5) for the full boundary; it is cited
here because a capability that duplicated qualification or prospect records would de facto become a
standalone agency offering — the exact positioning D5 forbids.

---

## 3. Superseded Charter Language

This decision supersedes conflicting language in
`docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md`. The charter itself is preserved
verbatim per Phase 1 deliverable 6 (amendment appendix, not rewrite); this table is the ruling
overlay.

| # | Charter location | Conflicting language | Disposition under this ruling |
|---|---|---|---|
| 1 | **§1.1 (Current Opportunity — thesis framing)** | "AJ Digital is developing a proactive personal-brand website service…" and the block-quoted thesis that "an owned personal-brand website is becoming a baseline credibility and discoverability asset" | **Superseded.** The thesis is reframed: the owned asset is a founder authority and conversion asset deployed by a Founder Intelligence Systems consultancy (D1/D3). The evidence-first diagnostic motion in §1.1 survives; the category claim does not. |
| 2 | **§3.1 (Internal System Name)** | Recommended name "AJ Digital Prospect-to-Brand Website System" and alternatives including "Personal Brand Prospecting System" and "Digital Authority Launch System" | **Superseded.** Provisional internal name is **Founder Authority and Conversion System** (D3). Final naming remains an open operator decision (charter §23 item 1, L1709). |
| 3 | **§3.2 (Client-Facing Category)** | Positioning "as a combination of … Personal-brand foundation … Optional positioning and brand consultation" and the framing quote centered on the founder's "digital identity" | **Superseded.** Client-facing category language must present the capability as an adjacent productized service of a Founder Intelligence Systems consultancy and must not use any D5-forbidden framing. |
| 4 | **Charter title / frontmatter and §0 purpose** | "Prospect-to-Personal-Brand Website System" as document title and system name; §0 item 8 "a preliminary personal-brand website strategy and mock website" | **Superseded (naming/framing only).** The eleven-step purpose list survives mechanically; "personal-brand" as the system's identity does not. |
| 5 | **§2 (Decision)** | "Build a governed, modular **Prospect-to-Personal-Brand Website System** inside AJ Digital OS." | **Superseded (name only).** The decision to proceed and the Inspect→Map→Design→Document→Validate ordering stand; the system name is replaced per D3. |
| 6 | **§4 (Project Vision)** | "converts an identified prospect into a structured, evidence-backed personal-brand opportunity package" | **Amended.** Replace "personal-brand opportunity package" with authority-and-conversion opportunity framing; the vision's mechanics are unchanged. |
| 7 | **§6.2 (Secondary Objectives)** | "a library of reusable website sections and personal-brand patterns" | **Amended (terminology).** Pattern library survives; it is a founder-authority pattern library, not a personal-brand one. |
| 8 | **§10 Workstream J (Packaging)** | Package 2 "Personal Brand Foundation"; Package 3 "Personal Brand Website" | **Superseded (package names).** Client-facing package names using "Personal Brand" as category conflict with D5. Note: Package 4, "Founder Authority System," already aligns with the approved direction and provisional name. Repackaging is owned by `SERVICE_OFFER_ARCHITECTURE.md`. |
| 9 | **§3.3 (Commercial Wedge)** | "The deeper consultation is the strategic upsell" (into brand strategy) | **Amended.** The wedge mechanics (mock = visual wedge, diagnostic = evidentiary wedge) survive; the upsell destination is reframed toward core Founder Intelligence Systems offers (tier 2), not deeper standalone brand strategy. |

Rows 1-3 record the charter language conflicting with the decision points the operator's Phase 1
deliverable definition explicitly names (`OPERATOR_RULINGS_2026-07-19.md`, deliverable 4); the
deliverable names decisions, not charter section numbers. Rows 4-9 are additional conflicting or
partially conflicting language identified during this pass; where the conflict is naming-level
rather than thesis-level, the row is marked "Amended" instead of "Superseded."

---

## 4. Decision Authority

- **Authority:** Operator (Tyrone / Audio Jones, AJ Digital LLC).
- **Instrument:** `docs/specs/prospect-brand-website-system/OPERATOR_RULINGS_2026-07-19.md`
  (Ruling 3; boundary context Ruling 4), `status: ratified`, `canonical: true`.
- **Date of ruling:** 2026-07-19.
- **Scope of this record:** documentation of the ruling for Phase 1. This record adds no new
  decisions; anything here that goes beyond the ruling's literal text (e.g., the "Amended" rows in
  §3, the tier-2 examples in D6) is editorial application of the ruling and is flagged for operator
  confirmation at integration.

**Governance caveat (unresolved context).** Two governance amendments are pending and unresolved:
`PROPOSED_AMENDMENT-2026-07-10.md` and `PROPOSED_AMENDMENT-2026-07-18.md`
(`G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE`). Any approval-rule citation touching this
record should treat those amendments as pending context per the operator constraints; they were not
read for this pass and nothing here depends on their content.

---

## 5. Alignment with Pre-Existing Positioning Doctrine

**VERIFIED CURRENT STATE.** Ruling 3 does not invent a direction; it ratifies (at the level of an
operator ruling) a direction already documented in the business-memory corpus. Verbatim passages:

1. `docs/knowledge/wiki/business-memory/audio-jones-brand-philosophy-context.md` L20:
   > "Audio Jones positioning shifted internally from personal brand consulting toward helping
   > founders design organizations that think clearly, remember intelligently, and execute
   > consistently."

2. `docs/knowledge/wiki/business-memory/breakthrough-index.md` L410-412 (Breakthrough 7, brand
   impact):
   > "Shifts internal posture from personal branding to founder operating intelligence."

3. `docs/knowledge/wiki/business-memory/session-breakthroughs-2026-07-05.md` L52:
   > "Audio Jones should be understood internally as a systems thinker who helps founders
   > externalize reasoning, not merely as a personal brand consultant."

Supporting: the working public copy direction preserved at
`audio-jones-brand-philosophy-context.md` L39 — "I help founders turn expertise into systems so
their business can think, remember, and execute consistently." — is the tone any client-facing
Founder Authority and Conversion System copy should inherit.

**Evidence-status caveat (must be preserved wherever this record is cited).** Every business-memory
file above carries `status: working`, `confidence: 2`, is explicitly not ratified, and is marked
"Do not use publicly yet"; the pilot README (L97-104,
`docs/knowledge/wiki/business-memory/`) gates public positioning on Audio's approval, and agents
"should not rewrite public positioning from these working notes without Audio approval"
(`audio-jones-brand-philosophy-context.md` L85). This record therefore cites these passages as
**corroborating internal evidence**, not as ratified doctrine. The binding force of D1-D6 comes
from the operator ruling alone. Internal-only terms must not appear in public copy produced under
this capability: "organizational cognition company" (`audio-jones-brand-philosophy-context.md` L47,
with L94 listing its publication before market testing as a failure mode; `breakthrough-index.md`
L458) and "Cognitive Operating System" (name gated internal-only per `cos-internal-only.md` L22).

---

## 6. Review Triggers

This decision should be revisited (by operator ruling, never by silent drift) if any of the
following occurs:

1. **Ratification of the Business Memory pilot changes the category definition.** If Audio ratifies
   business-memory positioning in a form that alters the public core-category language (e.g.,
   approves or rejects the "organizational cognition" framing for public use), the adjacent
   capability's client-facing framing must be re-derived against the new core copy.
2. **Commercial-outcome mandate fails.** If, after an operator-defined evaluation window, the
   Founder Authority and Conversion System cannot demonstrate measurable revenue outcomes through
   the attribution path (D4) — e.g., no attributable qualified leads, conversions, or won
   opportunities in CRM attribution events (`src\crm\crm-attribution.ts`;
   `AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md` §14) — the correct response is to review whether
   the capability should be retired or restructured, not to loosen positioning to chase demand.
3. **Demand inversion.** If sustained sales evidence shows buyers engaging AJ Digital primarily for
   standalone website/brand work disconnected from operational-intelligence offers, that is
   evidence the market is reading AJ Digital as a D5-forbidden category; the operator must either
   re-rule on positioning or tighten the "conditions under which the service should not be sold"
   (owned by `SERVICE_OFFER_ARCHITECTURE.md`).
4. **Governance amendments resolve.** If `PROPOSED_AMENDMENT-2026-07-10.md` or
   `PROPOSED_AMENDMENT-2026-07-18.md` are ratified and alter approval or positioning authority,
   this record's authority section must be re-checked against the amended kernel.
5. **Boundary erosion.** If the capability's implementation begins to require its own prospect
   store, scoring, qualification, pipeline, or client identity (violating Ruling 4 / D7), that is a
   structural signal it is becoming a standalone agency offer; escalate to the operator before any
   such component is designed.
6. **Final naming decision.** When the operator closes charter §23 item 1 ("Final service name.",
   L1709), this
   record must be updated from the provisional name; a name change alone does not reopen D1-D5.

---

## 7. Open Contradictions

Newly observed during this pass; recorded per the operator constraint ("Report any newly discovered
contradiction rather than resolving it through assumption"). None are resolved here.

1. **Evidence-status asymmetry.** Ruling 3's direction aligns with business-memory notes that are
   themselves unratified (`status: working`, `confidence: 2`, "Do not use publicly yet"). Whether
   Ruling 3 constitutes partial ratification of that positioning direction — or leaves the
   business-memory corpus wholly unratified while independently fixing the company category — is
   not stated in the ruling. Downstream documents should cite the ruling, not the working notes,
   until the operator clarifies.
2. **"Business memory" as mandated outcome vs internal-only vocabulary.** Ruling 3 lists "Business
   memory" among the outcomes the capability must improve, while the Business Memory pilot content
   and vocabulary are gated internal-only pending Audio's approval (pilot README L97-104; the COS
   name specifically per `cos-internal-only.md` L22; "organizational cognition company" per
   `audio-jones-brand-philosophy-context.md` L94). The capability can deliver the outcome
   internally, but which
   client-facing term (if any) may describe it is unresolved.
3. **Charter Package 4 name vs provisional system name.** Charter §10 Workstream J's Package 4
   ("Founder Authority System") nearly matches the ruling's provisional capability name ("Founder
   Authority and Conversion System"). Whether the top-tier package and the capability itself are
   the same commercial object or two objects (a capability containing a package) is unresolved and
   is deferred to `SERVICE_OFFER_ARCHITECTURE.md`.

---

## 8. Cross-References

| Document | Relationship |
|---|---|
| `docs/specs/prospect-brand-website-system/OPERATOR_RULINGS_2026-07-19.md` | Binding source of every decided fact in §2 |
| `docs/specs/prospect-brand-website-system/PROJECT_CHARTER.md` | Superseded/amended language per §3; preserved verbatim, amendment appendix owned by Phase 1 deliverable 6 |
| `docs/specs/prospect-brand-website-system/CURRENT_STATE_DIAGNOSTIC.md` | Phase 0 evidence that surfaced the contradiction (§5 business-memory row, §6 item 3, §7 item 3) |
| `SERVICE_OFFER_ARCHITECTURE.md` (this folder) | Owns four-tier elaboration, packaging, do-not-sell conditions |
| `SYSTEM_BOUNDARY_AND_INTEGRATION_MAP.md` (this folder) | Owns full Ruling 4 boundary and integration contracts |
| `docs/knowledge/wiki/business-memory/` (working, unratified) | Corroborating internal positioning evidence — see §5 caveat |
