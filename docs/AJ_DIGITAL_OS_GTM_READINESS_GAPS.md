# AJ Digital OS — GTM Readiness Gap List

**Type:** Honest readiness assessment (diagnosis only)
**Status:** Active — living gap list
**Date:** 2026-06-06
**Purpose:** State plainly the distance between current repo state and a "fully functioning Agent OS launched to GTM," so the launch can be planned against reality instead of optimism.

> Context: the sprint goal expressed was "launch a fully functioning Agent OS to GTM." This document exists because that is not a one-day outcome. It lists what stands between today and a credible GTM launch. Sources: repo inspection (2026-06-06) and `STARTUP_PROTOCOL_STATUS.md` (2026-05-14).

## 1. Honest Summary

The repo is at roughly v0.1.0 with a v0.2 data-layer in progress. The governance spine (Control Plane, memory, retrieval policies, recovery/operator playbooks) is genuinely strong. What is **not** present is a launched, externally usable product surface, verified end-to-end runtime, and the go-to-market assets a launch requires. GTM is a multi-sprint effort, not a 16-hour push.

## 2. Blocking / Critical Gaps (from `STARTUP_PROTOCOL_STATUS.md`)

| Gap | Severity | Status |
|---|---|---|
| Startup-Orchestrator Task Scheduler entry not registered | Critical | Script created; needs to be run as admin once |
| OpenClaw installation not found | Critical | Unresolved — agent runner referenced but absent |
| Path drift: `C:\dev\aj-digital-os` vs `AJ-DIGITAL-OS`, plus a separate legacy `C:\AJ-DIGITAL-OS` tree | High | Open — see legacy migration spec |
| Scripts reference `C:\dev\infra` (separate repo) | High | Drift — needs reconciliation |
| Hermes agent (port 7420) clarification needed | High | Unverified |
| `.env` duplicated block | Medium | Needs cleanup |
| `ollama-bootstrap-models.ps1` references a missing container | Medium | Broken |
| Git repo health: corrupt commit-graph + invalid `legacy/HEAD` ref + stale `index.lock` | Medium | Open — repair blocked on lock removal |

## 3. Product-Surface Gaps (required for "functioning OS")

- **Interface / Shell:** no shipped command center, client portal, or approval inbox UI verified end-to-end. (`dashboard/`, `ui/`, `sites/` exist but launch-readiness unverified.)
- **Agent Execution runtime:** TypeScript layers (browser-agent, model-routing, local-agent, memory-runtime) have passing unit tests per `BUILD-PROGRESS.md`, but no verified end-to-end "run → approve → execute → attribute" loop.
- **Connector auth:** deferred integrations (MailerLite, ImageKit, Whop webhook, Doppler, GCP) remain unwired per global operating notes.
- **Attribution + Observability:** specs exist; live dashboards and emitted attribution events not verified in production.
- **Persistence:** `responseos` Phase D Postgres integration and v0.2 data layer in progress, not complete.

## 4. GTM-Asset Gaps (required for "launched to market")

- Defined launch offer + pricing wired to a real intake (Signal Revenue System is a framework, not a live funnel).
- Public product page / landing + onboarding flow.
- A working demo path a prospect can actually run.
- Claims governance pass on all public copy (no unsupported ROI/financial claims).
- Support + operator runbook for live clients (operator-playbook exists; client-facing SOPs do not).

## 5. What a Focused 16-Hour Day Can Actually Deliver

Realistic same-day outcomes (the foundation, not the launch):

1. Doctrine committed + git health repaired (blocked only by `.git/index.lock` removal).
2. Canonical architecture map locked (`docs/architecture/AJ_DIGITAL_OS_CANONICAL_SYSTEMS_AND_CLUSTERS.md`).
3. Legacy tree migration spec'd (`docs/AJ_DIGITAL_OS_LEGACY_TREE_MIGRATION_SPEC.md`).
4. This GTM gap list, turned into a sequenced multi-sprint roadmap.

## 6. Recommended Path to GTM (multi-sprint, not multi-hour)

- **Sprint A (foundation):** today's doc + commit + git-health work; resolve critical startup gaps (orchestrator, OpenClaw, path drift).
- **Sprint B (runtime):** verify the end-to-end run→approve→execute→attribute loop on one real workflow.
- **Sprint C (surface):** ship one usable interface (approval inbox or client intake) wired to that loop.
- **Sprint D (GTM):** one offer, one funnel, claims-governed copy, one demo path, then launch.

Each sprint declares its owning layer, success metric, and attribution event per the canonical architecture acceptance criteria.
