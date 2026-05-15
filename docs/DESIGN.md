# Architecture Navigation Index

**Purpose:** This document is a navigation map for repository architecture. It is NOT visual design. Use it to find the canonical spec for any subsystem.

Canonical architecture lives under `docs/system/` and `docs/architecture/`. Root-level historical drafts are archived and should not be treated as current.

---

## 1. Document Hierarchy

```
docs/
├── PRD.md                          ← product definition
├── DESIGN.md                       ← (this file) architecture navigation
├── ROADMAP.md                      ← canonical roadmap
├── DECISIONS.md                    ← architectural decisions (ADRs)
├── SECURITY.md                     ← security and trust policy
├── DEPLOYMENT.md                   ← deployment paths and runbooks index
│
├── system/                         ← system-level specs (master schema, security, approvals)
├── architecture/                   ← layer and module specs
├── intelligence-layer/             ← intelligence module specs (qualification, etc.)
├── ops/                            ← ops runbooks (git, secrets, first-boot)
├── deployment/                     ← deployment runbooks (production, staging)
├── ui/                             ← UI-specific specs (web shell, design tokens)
├── releases/                       ← release notes and announcements
├── examples/                       ← request/response examples
└── _archive/                       ← superseded or historical docs (do not delete)
```

---

## 2. System-Level Specs (`docs/system/`)

These describe whole-system contracts.

| Concern                                    | File                                                              |
|--------------------------------------------|-------------------------------------------------------------------|
| Master architecture schema                 | `AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md`                     |
| Approval system                            | `AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`                           |
| Security and trust layer                   | `AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`                      |
| Agent permission enforcement               | `AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`              |
| MCP secure execution layer                 | `AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`                |
| Client isolation / multi-tenant            | `AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`             |
| Repo validation report                     | `AJ_DIGITAL_OS_REPO_VALIDATION_REPORT.md`                         |

---

## 3. Architecture Specs (`docs/architecture/`)

These describe layers, modules, and contracts.

| Concern                                    | File                                                              |
|--------------------------------------------|-------------------------------------------------------------------|
| 16-layer model                             | `AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`                               |
| Layer coverage index                       | `AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`                           |
| Module traceability                        | `AJ_DIGITAL_OS_MODULE_TRACEABILITY.md`                            |
| Applied intelligence system (AIS)          | `applied-intelligence-system.md`                                  |
| Brand context system                       | `brand-context-system-spec.md`                                    |
| Conversation memory + context stitching    | `conversation-memory-and-context-stitching-spec.md`               |
| Semantic memory + retrieval                | `semantic-memory-and-retrieval-spec.md`                           |
| Deliverable approval lifecycle             | `deliverable-approval-lifecycle-spec.md`                          |
| Deliverable + approval routing             | `deliverable-and-approval-routing-spec.md`                        |
| Integrations + secrets                     | `integrations-and-secrets-spec.md`                                |
| API integration + model profile            | `api-integration-and-model-profile-spec.md`                       |
| MCP tool architecture                      | `mcp-tool-architecture-spec.md`                                   |
| Task category + folder spec                | `task-category-and-folder-spec.md`                                |
| AJ Digital OS v0.2 architecture            | `aj-digital-os-v0.2.md`                                           |

---

## 4. Intelligence Layer (`docs/intelligence-layer/`)

| Concern                | File                          |
|------------------------|-------------------------------|
| Qualification engine v1| `qualification-engine.md`     |

---

## 5. Ops Runbooks (`docs/ops/`)

| Concern                | File                          |
|------------------------|-------------------------------|
| First boot             | `first-boot-runbook.md`       |
| Git sync               | `git-sync-runbook.md`         |
| Secret hygiene         | `secret-hygiene.md`           |

---

## 6. Deployment (`docs/deployment/`)

| Concern                | File                              |
|------------------------|-----------------------------------|
| Production readiness   | `production-readiness.md`         |
| Staging runbook        | `staging-runbook.md`              |

Index for these and the operational runbooks lives at `docs/DEPLOYMENT.md`.

---

## 7. UI (`docs/ui/`)

| Concern                | File                          |
|------------------------|-------------------------------|
| Local web shell        | `local-web-shell.md`          |
| Design token system    | `design-token-system.md`      |

---

## 8. Top-Level Operational Docs

These live directly under `docs/` and remain current:

- `system-architecture.md` — narrative architecture overview (companion to the master schema).
- `operator-playbook.md` — daily operator workflow.
- `recovery-playbook.md` — failure recovery.
- `operational-baseline-runbook.md` — operational baseline.
- `production-go-live-checklist.md` — go-live gating list.
- `publish-preparation-checklist.md` — publish readiness.
- `release-notes-template.md` — release notes scaffold.
- `versioning-policy.md` — versioning rules.
- `onboarding.md` — onboarding entry point.
- `grafana-dashboard-map.md` — monitoring dashboards map.
- `phase-1-production-hardening-plan.md` — hardening plan.
- `post-v0.1.0-roadmap.md` — feeds into `docs/ROADMAP.md`.
- `DEPLOYMENT-HANDOFF.md` — production deployment handoff log.
- `build-completion-checklist-review-2026-04-27.md` — review artifact.

---

## 9. Archived / Historical

Root-level architecture drafts are HISTORICAL:

- `aj-digital-agent-architecture.md`
- `aj-digital-os-scaffold-and-schema.md`
- `copilot-build-prompt-aj-digital-os.md`
- `BUILD-PROGRESS.md`
- `COMMIT_REVIEW_2026-04-27.md`

These are not deleted. Treat them as reference, not contract. Canonical architecture lives under `docs/`.

When a doc is superseded, add a "Superseded by" header pointing to the canonical location, and consider moving it under `docs/_archive/` in a follow-up.

---

## 10. Examples (`docs/examples/`)

Wire-format examples for intelligence and AIS modules:

- `qualification/evaluate-business.request.json`
- `qualification/evaluate-business.response.json`
- `ais/diagnose-system.request.json`
- `ais/update-outcome.request.yaml`

---

## 11. Where to Add New Docs

| If the doc is…                              | Put it under…                              |
|---------------------------------------------|--------------------------------------------|
| A whole-system contract                     | `docs/system/`                             |
| A layer or module spec                      | `docs/architecture/`                       |
| An ADR                                      | `docs/DECISIONS.md` (append entry)         |
| A roadmap promotion                         | `docs/ROADMAP.md`                          |
| A runbook                                   | `docs/ops/` or `docs/deployment/`          |
| Intelligence-layer module                   | `docs/intelligence-layer/`                 |
| UI surface spec                             | `docs/ui/`                                 |
| Release notes                               | `docs/releases/`                           |
| Wire-format example                         | `docs/examples/<module>/`                  |

If none of these fit, propose a new directory via an ADR.
