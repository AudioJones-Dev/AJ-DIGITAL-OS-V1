# AJ Digital OS — Roadmap

**Status:** Living document
**Authority:** This is the canonical roadmap. Other planning notes (e.g. `docs/post-v0.1.0-roadmap.md`, `docs/phase-1-production-hardening-plan.md`) feed into this file.

Roadmap items are organized by horizon, not by date. Promotions across horizons happen via PR.

---

## Now (in flight or shovel-ready)

These items are approved scope and either active or next-up.

- **Repository governance install.** AGENTS.md, CLAUDE.md, PRD, DESIGN, ROADMAP, DECISIONS, SECURITY, DEPLOYMENT — this batch.
- **README ↔ package.json reconciliation.** Remove references to scripts that do not exist; document what actually ships.
- **CHANGELOG `[Unreleased]` population.** Reflect post-v0.1.0 merges (qualification engine, command center dashboard, persistence stabilization, decision engine v1, retrieval layer, BEL v4 dag).
- **Security workflow hardening.** Add gitleaks/trufflehog and dependency-review on top of existing `npm audit`.
- **Smoke tests for core CLI commands.** Protect the installable CLI and command router from packaging/regression risk.

---

## Next (planned, scope known, not yet started)

- **Sample/demo run dataset.** Deterministic seed data for runs, events, approved outputs — used for onboarding, validation, and release checks.
- **Onboarding polish.** Cleaner `clone → working CLI` path for new technical operators.
- **CLI UX consistency pass.** Output formatting, empty-state messages, error ergonomics across overview/queue/action commands.
- **Publish-router target contracts.** Formalize the minimum shared shape for non-local publish targets (Sanity, GitHub, Notion, n8n webhook).
- **Brand voice runtime enforcement.** Wire brand voice and content compliance into orchestration output.
- **Permission enforcement coverage.** Wire `executeWithEnforcement` into all execution entry points across agents.
- **Attribution wiring.** Connect attribution recording into orchestrator and publisher to begin lead → revenue traceability.
- **Next.js dashboard depth.** Promote `dashboard/` from command-center read views to a full operator surface using existing read models.
- **Hermes ↔ n8n decision.** Pick: Hermes-first scheduling, integrated n8n server, or both. Document the call as an ADR.

---

## Later (committed direction, not yet scoped)

- **Future publish targets activation.** Sanity (push), GitHub (commit/PR), Notion (page), Google Drive (file), generic webhook delivery.
- **BEL v3 → v4 maturation.** Execution planner, runtime, state store, tool registry, persistent JSONL logs, retry/escalation, capability discovery.
- **AEO opportunity scorer.** Build `opportunity-scorer.ts` with the Bible v1 weighted formula.
- **Offer engine activation.** AI readiness scoring algorithm, qualification → offer routing, tied into Stripe checkout.
- **Module layer activation.** SEO/AEO, lead-gen, voice agent, CRM intelligence — promote skills from markdown to executable modules.
- **Multi-tenant deployment isolation.** Wire the client isolation spec into deployment-time config and per-tenant routing.
- **Schema versioning + ingestion-time validation middleware.** Strengthen Layer 2 (Data Structure).
- **Distributed workers.** Split orchestration and execution across processes/nodes when load justifies it.
- **HTTP API surface.** Promote pure-handler patterns into a documented HTTP API for external automation.
- **Release automation.** Define prerequisites once manual release flow is fully stable.

---

## Research (open questions, not yet committed)

- **Cloud storage mirroring strategy.** Whether/how to mirror local file-backed state to cloud without breaking local-first defaults.
- **Queue system introduction.** Persistent queue layer atop the existing run lifecycle — when does the cost beat the simplicity of file-backed state?
- **Long-running service entrypoint.** Should the project ship a daemon, or stay operator-console-watch as the production-like start path?
- **Fine-tune routing.** When (if ever) does the runtime own fine-tune profiles vs. delegating to provider tooling?
- **Voice agent architecture.** Which voice runtime fits the local-first + approval-gated model.
- **Customer-facing self-service install.** What's the smallest safe install path for a SaaS tenant.

---

## Recently Shipped (last few cycles)

Summarized; full detail in `CHANGELOG.md` once `[Unreleased]` is populated.

- Qualification engine v1 — deterministic business-readiness scoring.
- Command center dashboard v1.
- Approval service file persistence stabilization.
- Map-CERA decision engine v1 merge.
- Operational retrieval layer v1.
- BEL v4 DAG execution layer merge.
- Repo hygiene + structural cleanup.

---

## How to Use This Roadmap

- New scope enters as **Research** or **Later** unless explicitly approved into **Next** or **Now**.
- Promotions across horizons happen via PR with a note in `docs/DECISIONS.md` for material changes.
- Items shipped move to `CHANGELOG.md` and out of this file in the next maintenance pass.
- This file is a snapshot, not a contract. Reality wins.
