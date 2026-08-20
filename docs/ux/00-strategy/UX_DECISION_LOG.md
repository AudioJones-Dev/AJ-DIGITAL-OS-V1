# UX Decision Log

## Purpose

Record durable UX decisions for AJ Digital OS.

## Log Format

| Date | Decision | Rationale | Impact | Source |
|---|---|---|---|---|
| 2026-07-03 | Create `docs/ux/` as the canonical UX doctrine tree | The research brief frames UX as organizational memory and a control surface, not visual polish | Establishes a stable reference for future screen specs and AI-generated UI work | Attached research brief |
| 2026-07-03 | Treat tenant context as a visible UI state | Multi-tenant systems need explicit scope visibility to avoid cross-tenant mistakes | Requires tenant labels, switcher behavior, and scope checks in major screens | Existing tenant specs |
| 2026-07-03 | Require transparency for agentic UI actions | Hidden AI actions create trust and safety risk | Requires rationale, risk, approval, and audit surfaces | Existing approval and agent specs |

## Open Questions

- Which screens are the first implementation targets?
- Which role taxonomy is canonical across dashboard, portal, and agent surfaces?
- Which tenant-switching model is canonical for admin and support users?

## Acceptance Criteria

- Decisions are traceable to a source or a product rationale.
- Open questions are separated from settled doctrine.
