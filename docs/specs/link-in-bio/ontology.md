---
title: MCP-Native Link-in-Bio — Product Ontology
status: draft
canonical: false
version: v0.2
scope: multi-tenant-saas
created: 2026-07-05T00:00:00.000Z
owner: AJ Digital LLC / Audio Jones
canonical_vault: G:\AJ-INTERNAL\AJ-DIGITAL-VAULT
home: AJ-DIGITAL-OS docs/specs/link-in-bio/ (docs/* lane — draft packet, human-merge-required)
category: project-ontology
product: OpenBio (placeholder codename — naming is operator's pen)
tags:
  - ontology
  - link-in-bio
  - mcp
  - agentic
  - multi-tenant
  - project
related:
  - "[[ROADMAP_BEFORE_ONTOLOGY_BEFORE_SCHEMA]]"
  - "[[SCHEMA_MATERIALIZES_ONTOLOGY]]"
  - "[[PHASE_GATED_DEVELOPMENT]]"
  - "[[CONVERSATIONAL_VS_ORCHESTRATION_BOUNDARY]]"
  - "[[AGENTS_OPERATE_AS_SENIOR_ENGINEERS_WITH_GUARDRAILS]]"
  - "[[UX_DOCTRINE]]"
  - "[[UX_GUARDRAILS]]"
  - "[[PRODUCT_EXPERIENCE_PRINCIPLES]]"
---

# MCP-Native Link-in-Bio — Product Ontology

> [!WARNING] Draft — awaiting operator ratification
> Project-class artifact, RECOMMEND_ONLY. Drafted by agent, ratified by operator (Tyrone). A **product ontology that cites doctrine**, not new doctrine. No schema object may be created that does not trace to a named concept below. Not a basis for `build/*` schema work until `status: canonical`.

## Doctrine position

This packet is the **Ontology** stage of `Roadmap → Spec → Ontology → Schema → Implementation` ([[ROADMAP_BEFORE_ONTOLOGY_BEFORE_SCHEMA]]). It exists because an earlier draft jumped Roadmap → Schema (the `SCHEMA_BEFORE_DOCTRINE` inversion / [[PREMATURE_IMPLEMENTATION]]). Per [[SCHEMA_MATERIALIZES_ONTOLOGY]] the eventual schema is a mechanical transcription of this document and may introduce no semantics absent here.

**Language convention (RFC-2119):** SHALL / MUST = binding once ratified; SHOULD = strong default; MAY = permitted.

**Scope: MULTI-TENANT SaaS.** `Workspace` is the tenant and the isolation boundary. Every content concept is workspace-scoped. There is no un-tenanted content.

## System-of-record &amp; tenancy invariants

- **Durable state** for every concept lives in the store behind the REST API ([[CONVERSATIONAL_VS_ORCHESTRATION_BOUNDARY]]). The MCP server and any driving agent are **stateless drivers**; no concept instance is authoritative in agent/conversation context. Each MCP tool call reconstructs context from the API and MUST carry an explicit `workspace` context.
- **INV-1 (G1)** — No mutation SHALL execute without a resolved `Workspace` context. An agent call lacking tenant context is a stop condition, not a default.
- **INV-2 (G8)** — No read or write SHALL cross a `Workspace` boundary. Every content row carries `workspace_id`; isolation is enforced at the API and the store (RLS), not the UI.
- **INV-3 (G9)** — Every actor's capabilities are determined by `Role` within the `Workspace`; there are no ambiguous or implied permissions.
- **INV-4 (Principle #4 / G3)** — Any irreversible or client-impacting agent write routes through `ProposedAction` (propose-then-approve); it SHALL NOT apply silently.

---

## Concept registry

Each concept carries: **definition / boundaries**, **attributes**, **relationships** (→ downstream FKs), **lifecycle**, and ontology **status**.

### Workspace  `[tenant boundary]`
- **Definition** — the tenant: the billing, isolation, and ownership boundary. Owns all creator-side content. The unit the operator must always see (tenant-context, [[PRODUCT_EXPERIENCE_PRINCIPLES]] #3).
- **Attributes** — name, slug, plan, billing ref, created_at.
- **Relationships** — has many `Membership`; owns many `Page`, `Product`, `Theme`.
- **Lifecycle** — created → active → suspended → archived.
- **Status** — admitted.

### User
- **Definition** — a person identity (backed by Clerk). Distinct from the tenant; a user MAY belong to multiple workspaces.
- **Attributes** — identity ref, display name, email.
- **Relationships** — has many `Membership`; appears as an `Actor` on mutations.
- **Lifecycle** — invited → active → deactivated.
- **Status** — admitted.

### Membership
- **Definition** — the binding of a `User` to a `Workspace` at a `Role`. The object that makes roles-as-UX real ([[PRODUCT_EXPERIENCE_PRINCIPLES]] #6).
- **Attributes** — `role` (enum `Role`), invited_at, accepted_at, status.
- **Relationships** — links `User` ↔ `Workspace`.
- **Lifecycle** — invited → active → revoked.
- **Status** — admitted.

### Page
- **Definition** — one public link-in-bio surface owned by a `Workspace`. Creator-side it is a human control surface; visitor-side it is a client-facing surface.
- **Attributes** — slug/handle, title, seo, `publishState` (enum `PublishState`), custom_domain (nullable), published_at.
- **Relationships** — belongs to `Workspace`; has an **ordered** list of `Block`; uses one `Theme`.
- **Lifecycle** — draft → published → unpublished → archived.
- **Status** — admitted.

### Block
- **Definition** — an ordered, typed content unit on a `Page`. Polymorphic: `payload` shape is determined by `type`.
- **Attributes** — `type` (enum `BlockType`), position (fractional ordering key), visibility, payload (typed per `BlockType`).
- **Relationships** — belongs to `Page` (∴ transitively workspace-scoped). A block of `type = Product` references one `Product` in the same `Workspace`.
- **Lifecycle** — created → visible ⇄ hidden → removed.
- **Status** — admitted. Each `BlockType` term is its own ontology admission; a new type is an ontology change first, migration second.

### Product
- **Definition** — a sellable item owned by a `Workspace`, surfaced via a `Product` block. (Phase-2 activation.)
- **Attributes** — name, description, price (minor units), currency, `kind` (enum `ProductKind`), asset ref, payment_price_ref.
- **Relationships** — belongs to `Workspace`; referenced by `Block`; has many `Order`.
- **Lifecycle** — draft → active → archived.
- **Status** — admitted (Phase-2 activation).

### Order
- **Definition** — a buyer's purchase of a `Product`. (Phase-2 activation.)
- **Attributes** — buyer_email, amount, currency, payment_session_ref, `status` (enum `OrderStatus`), created_at.
- **Relationships** — references `Product` and owning `Workspace`.
- **Lifecycle** — pending → paid → fulfilled → refunded.
- **Status** — admitted (Phase-2 activation).

### Theme
- **Definition** — a presentation token bundle applied to a `Page` at render. A global preset when unowned.
- **Attributes** — tokens (structured), name.
- **Relationships** — belongs to `Workspace` (nullable = global preset); used by many `Page`.
- **Lifecycle** — created → active → archived.
- **Status** — admitted.

### AnalyticsEvent
- **Definition** — a measured visitor interaction. (Phase-4 / measurement — required up front by [[PHASE_GATED_DEVELOPMENT]] and [[PRODUCT_EXPERIENCE_PRINCIPLES]] #2.)
- **Attributes** — `kind` (enum `EventKind`), ts, target refs, workspace_id.
- **Relationships** — references `Page`, optionally `Block`; workspace-scoped.
- **Lifecycle** — append-only (immutable).
- **Status** — admitted (Phase-4 activation).

### ProposedAction (Approval)
- **Definition** — doctrine-required. Any client-impacting or irreversible agent-initiated mutation (publish, unpublish, delete, price change, domain change) is a proposed action passing an approval surface, per [[UX_GUARDRAILS]] G3 and [[PRODUCT_EXPERIENCE_PRINCIPLES]] #4.
- **Attributes** — workspace_id, target concept + id, proposed diff, rationale, confidence, impact class (reversible / irreversible), `state` (enum `ApprovalState`), proposed_by (`Actor`), decided_by (`Actor`), decided_at.
- **Relationships** — references the target concept instance, its `Workspace`, and two `Actor`s.
- **Lifecycle** — proposed → approved | rejected → applied | discarded.
- **Status** — admitted (governs the agent-write path from Phase 1).

### Actor
- **Definition** — who initiated an action: a `User` (Human) or an Agent. Recorded on every mutation for auditability ([[PRODUCT_EXPERIENCE_PRINCIPLES]] #5).
- **Attributes** — `kind` (enum `ActorKind`: Human / Agent), identity ref, label.
- **Relationships** — recorded on every mutation and every `ProposedAction`.
- **Lifecycle** — n/a (reference concept).
- **Status** — admitted.

---

## Enum admissions

Per [[SCHEMA_MATERIALIZES_ONTOLOGY]], **enum values are ontology terms** and pass the admission gate before entering a schema.

| Enum | Admitted terms | Notes |
|------|----------------|-------|
| `Role` | Owner, Admin, Editor, Viewer | Determines capabilities within a `Workspace` (INV-3). |
| `BlockType` | Link, Header, Text, Image, Embed, Socials, EmailCapture, Product, Divider | Each term defines its own `payload` shape. New type = new admission. |
| `PublishState` | Draft, Published, Unpublished, Archived | Governs `Page` visibility. |
| `ProductKind` | Digital, Link, Appointment, Membership | Digital is the Phase-2 launch subset. |
| `OrderStatus` | Pending, Paid, Fulfilled, Refunded | |
| `EventKind` | View, Click | Extensible under later admission (e.g. Conversion). |
| `ApprovalState` | Proposed, Approved, Rejected, Applied, Discarded | Drives the propose-then-approve surface. |
| `ActorKind` | Human, Agent | Auditability primitive. |

### `BlockType` payload definitions (concept attribute sets)
- **Link** — url, label, icon?, subtitle?
- **Header** — text, level
- **Text** — richtext
- **Image** — asset ref, **alt (required — accessibility as architecture, [[PRODUCT_EXPERIENCE_PRINCIPLES]] #10)**, caption?, link?
- **Embed** — provider, url, aspect
- **Socials** — list of {platform, url}
- **EmailCapture** — heading, cta_label, destination (list ref / webhook)
- **Product** — product ref (→ `Product`, same workspace), display override?
- **Divider** — style

---

## Relationship map (→ future foreign keys)

```
Workspace 1─* Membership *─1 User
Workspace 1─* Page          Workspace 1─* Product      Workspace 1─* Theme
Page      1─* Block          Page      *─1 Theme
Block     *─1 Product        (only when Block.type = Product; same Workspace)
Product   1─* Order
Page      1─* AnalyticsEvent   Block 1─* AnalyticsEvent (optional)
ProposedAction *─1 <target concept>   ProposedAction *─1 Workspace   *─2 Actor
```
No downstream FK may exist whose relationship is not declared above ([[SCHEMA_MATERIALIZES_ONTOLOGY]] — "Foreign keys mirror ontology relationships"). Every content concept transitively resolves to exactly one `Workspace` (INV-2).

## Sequencing gates (carry into every downstream PR)

- [ ] **No schema object without an ontology reference** — every table/column/enum cites a concept here.
- [ ] **No ontology entry without a spec reference** — every concept traces to the product roadmap/spec.
- [ ] **No implementation without a schema contract** — code consumes the schema, adds no new semantics.

## Home &amp; lane (AJ-DIGITAL-OS)

Placement: `docs/specs/link-in-bio/ontology.md` — per [[../../AGENTS.md]] `docs/specs/` owns product/module PRDs and build specs. Governed by the repo lane protocol:
- This artifact is a **`docs/*` draft packet** (Claude's lane), branched off `origin/main`. It is **not** merged to `main` (protected, SHA-pinned, HUMAN_REQUIRED). Push / PR / merge require operator `proceed` per `REPO_SAFETY_POLICY.md`.
- Build (schema, API, MCP server) is the **`build/*` lane (Codex)**, and only after this ontology is ratified.

## Relationships to doctrine

Binding canon: [[ROADMAP_BEFORE_ONTOLOGY_BEFORE_SCHEMA]], [[SCHEMA_MATERIALIZES_ONTOLOGY]], [[PHASE_GATED_DEVELOPMENT]], [[PREMATURE_IMPLEMENTATION]], [[CONVERSATIONAL_VS_ORCHESTRATION_BOUNDARY]], [[AGENTS_OPERATE_AS_SENIOR_ENGINEERS_WITH_GUARDRAILS]]. RECOMMEND_ONLY UX doctrine shaping `ProposedAction`/`Actor`/tenancy/accessibility: [[UX_DOCTRINE]], [[UX_GUARDRAILS]], [[PRODUCT_EXPERIENCE_PRINCIPLES]].

## Open questions (operator)

1. **Naming** — `OpenBio` is a placeholder. Product name + positioning are your pen.
2. **Billing model** — per-workspace plan is assumed; confirm whether seats/members are billed (affects `Membership` attributes).
3. **Custom domains** — Phase 3 assumed; confirm the tenant→domain mapping approach.

## Status

DRAFT · committed to branch `docs/link-in-bio-ontology-v0.1` (local, unpushed) · schema work BLOCKED until this ontology is ratified (`status: canonical`) by the operator.
