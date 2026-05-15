# Roadmap — AJ Digital OS

**Status:** Living document.
**Supersedes:** `docs/post-v0.1.0-roadmap.md` (kept as historical reference).
**Aligned with:** `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md` (layer-by-layer coverage and next-build order).

This roadmap is intentionally short. Layer-level detail and per-module
priorities live in the Layer Coverage Index. This file captures the
operator-facing priorities for the next shipping windows.

---

## Now — readiness foundation

Closing out repository readiness and operator-facing polish.

- Repo readiness docs (`AGENTS.md`, `CLAUDE.md`, `docs/PRD.md`,
  `docs/DESIGN.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`,
  `docs/DECISIONS.md`, `docs/ROADMAP.md`, root `SECURITY.md`).
- Reconcile `README.md` script list with actual `package.json` scripts.
  Mark planned commands clearly.
- Add `gitleaks` (or `trufflehog`) to `.github/workflows/security-audit.yml`
  alongside `npm audit`.
- Maintain `CHANGELOG.md` `[Unreleased]` with every behavior change.

## Next — operator surface and governance

In rough priority order. Tracking issue: open one per item.

1. **Smoke tests for core CLI commands.** Cover `help`, `dashboard`,
   `operator-console`, representative inspection and queue commands
   against a deterministic seed.
2. **Sample / demo run dataset.** Lightweight deterministic runs, event
   logs, and approved outputs for onboarding and CI use.
3. **Onboarding polish.** Tighten `docs/onboarding.md` and add a
   "clone-to-first-run" walkthrough that matches the actual
   `package.json` scripts.
4. **CLI UX consistency.** Empty-state messaging, error formatting,
   `--json` parity across overview/queue/action commands.
5. **Governance hardening (Layer 10).** Brand voice policies, SOP
   constraints, legal claim rules, and client-specific policy overrides.
   Required before any Application Layer work.

## Later — capability expansion

6. **Data normalization layer (Layer 5).** Lead, Offer, Client, Contact
   entities; field mapping; cleaning pipeline. Prerequisite for
   connector and application layers.
7. **Connector / driver layer (Layer 3).** Google Drive, Gmail, Calendar,
   CRM (HubSpot or Pipedrive), Airtable, GitHub. Built on the
   `OSConnector` interface scaffolded in the Layer Model Spec.
8. **Future publish targets.** Sanity, GitHub, Notion, n8n webhook,
   Google Drive — all behind `publish-router` target contracts.
9. **Interface / shell expansion (Layer 11).** Telegram approval bot
   parity, mobile-friendly approval surface, client portal, diagnostic
   form, agent status monitor.
10. **Storage migration.** Neon / Postgres for run control and approvals,
    Redis for cache/idempotency, pgvector for retrieval embeddings.

## Eventually — outcome layers

11. **Optimization Layer (Layer 15).** CERA feedback loops reading the
    attribution log to improve workflows, prompts, and offers.
12. **Business Outcome Layer (Layer 16).** Spend reduction, revenue
    influenced, time saved — read from MAP attribution events.
13. **Release automation.** Once changelog discipline, package
    validation, and publish safeguards are stable.

---

## Tracking

- Per-layer status: `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`
- Per-decision rationale: `docs/DECISIONS.md`
- Open issues: GitHub issues on `audiojones-dev/aj-digital-os-v1`.
