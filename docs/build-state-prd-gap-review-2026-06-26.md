# AJ Digital OS Build State vs PRD Gap Review

Date: 2026-06-26
Owner: AJ Digital LLC
Review owner: Codex
Scope: read-only build-state review plus this docs artifact
Repository: `C:\dev\AJ-DIGITAL-OS`

## 1. Review Purpose

This document reconciles the current AJ Digital OS repository state against the
system layer PRD/specs, CRM module specs, deployment/runbook expectations, and
release-readiness checklists.

This is not an implementation plan by itself. It is the current-state gap map
needed before the next scoped build pass.

## 2. Current Repo And Branch State

Observed before creating this document:

- Working directory: `C:\dev\AJ-DIGITAL-OS`
- Branch state: `main...origin/main`
- Worktree state before this document: clean
- Target document existed before this task: no
- Approved file scope: `docs/build-state-prd-gap-review-2026-06-26.md`
- Source code changes: none
- Runtime state changes: none
- Deployment, push, merge, install, or secret work: none

## 3. Sources Inspected

Policy and repo-local operating docs:

- `AGENTS.md`
- `docs/AGENTS.md`
- `docs/OPERATING_POLICY.md`
- `docs/REPO_SAFETY_POLICY.md`
- `docs/IMPLEMENTATION_GATES.md`
- `docs/AGENT_HANDOFF_PROTOCOL.md`
- `.codex/validation.json`
- `.codex/STOP_HOOK_PROPOSAL.md`

Architecture and PRD/source-of-truth docs:

- `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`
- `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`
- `docs/architecture/AJ_DIGITAL_OS_MODULE_TRACEABILITY.md`
- `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md`
- `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`
- `docs/specs/AJ_DIGITAL_MULTI_TENANT_CRM_DB_RLS_SPEC.md`
- `docs/build-completion-checklist-review-2026-04-27.md`
- `docs/production-go-live-checklist.md`
- `docs/publish-preparation-checklist.md`
- `docs/phase-1-production-hardening-plan.md`
- `docs/post-v0.1.0-roadmap.md`

Deployment, infrastructure, hooks, loops, and runbooks:

- `docs/deployment/production-readiness.md`
- `docs/deployment/staging-runbook.md`
- `docs/DEPLOYMENT-HANDOFF.md`
- `docs/infrastructure/DEPLOYMENT_RUNTIME_STANDARD.md`
- `docs/infrastructure/AJ_DIGITAL_INFRASTRUCTURE_MAPPING_DOCTRINE.md`
- `docs/infrastructure/RENDER_RUNTIME_ADAPTER_SPEC.md`
- `docs/system/AGENT_RUNTIME_STANDARD.md`
- `docs/system/CODEX_ITERATIVE_REPAIR_LOOP_STANDARD.md`
- `docs/ops/first-boot-runbook.md`
- `docs/ops/git-sync-runbook.md`

Current source and config surfaces sampled:

- `package.json`
- `Dockerfile`
- `docker-compose.yml`
- `Procfile`
- `src/server.ts`
- `src/cli.ts`
- `src/crm/*`
- `src/connectors/*`
- `src/normalization/*`
- `src/apps/*`
- `src/bel/*`
- `src/bel/dag/*`
- `src/governance/*`
- `src/hermes/hermes-status-api.ts`
- `tests/crm/*`
- `tests/connectors/*`
- `tests/normalization/*`
- `tests/bel/*`
- `tests/governance/*`
- `tests/control-plane/*`
- `tests/security/*`

## 4. Evidence Classes

Facts:

- The current checkout has concrete source modules for control plane, security,
  approvals, tenancy, BEL, DAG, cache, retrieval, decisioning, attribution,
  governance, connectors, normalization, CRM foundation, applications, Hermes,
  Telegram, dashboards, Docker, and monitoring.
- The older layer coverage docs under `docs/architecture/` are partially stale.
  They understate several implemented modules, especially CRM, normalization,
  apps, governance, connectors, dashboard exposure, and CLI/Hermes surfaces.
- The production and staging runbooks reference npm scripts that are not present
  in the current `package.json`.
- The CRM DB/RLS spec explicitly says no executable CRM migration has been
  applied and that the operator must choose Supabase or Neon before migration.
- The go-live checklist remains unchecked and requires CI logs, smoke evidence,
  observability proof, run lifecycle proof, security review, and go/no-go
  decision records before production claims.
- `npm run typecheck` passed during this review session using `tsc --noEmit`.

Inferences:

- AJ Digital OS is beyond a paper PRD. It is an internal functional operating
  system build with many real local-first subsystems.
- The build is not client-production-ready because release evidence, live
  connector enablement, CRM DB/RLS migration, deployment manifests, cloud
  runtime validation, and runbook/script consistency are not complete.
- The most immediate blocker is not a missing architecture concept. It is
  reconciliation: docs, package scripts, validation gates, deployment commands,
  and current implementation need to be brought into one truthful operating map.

Assumptions:

- `main...origin/main` is the intended branch for this review.
- No external service state was inspected; all production/deployment conclusions
  are based on repo-local docs and code.
- Runtime files under `runtime/` and `data/` are treated as operational state,
  not canonical source-of-truth policy, unless explicitly promoted by docs.

Risks:

- Agents may overbuild if they follow older architecture docs without checking
  current source reality.
- Operators may attempt stale deployment commands that do not exist as npm
  scripts.
- Local typecheck success may be mistaken for production readiness.
- File-backed stores may be treated as scalable/multi-tenant production
  persistence before database/RLS work is complete.
- CRM work may drift if `tenantId`, `tenant_id`, and legacy `client_id` are not
  resolved deliberately before migration.

Blockers:

- No production release target has been selected and recorded.
- CRM primary DB target is still undecided in the specs.
- Release-readiness checklist lacks evidence.
- Deployment runbooks and `package.json` are out of sync.
- Production deploy/remote config/secret work requires explicit operator
  approval and is out of scope for this review.

## 5. Overall Build Position

Recommended classification:

```text
Architecture foundation: strong
Internal local-first runtime: functional
Operator CLI/control surface: broad
Governance/security foundation: strong locally
CRM: foundation implemented, MVP incomplete
Deployment orchestration: partially implemented, not release-gated
Client production readiness: not yet
```

Short version:

AJ Digital OS is no longer "just PRD" or "just scaffold." It is an internal
functional pre-release operating-system build. It should not be represented as
production-ready or client-ready until the release gates, deployment scripts,
CRM DB/RLS migration, connector enablement, run lifecycle smoke tests, and
observability proof are complete.

## 6. 16-Layer Build Status Table

| Layer | Current status | Current evidence | Still needed |
| --- | --- | --- | --- |
| L1 Infrastructure | Partial | `Dockerfile`, `docker-compose.yml`, monitoring configs, infra doctrine, Render runtime spec, server entrypoint | Approved service manifests, verified staging/cloud runtime, cost/rollback/observability records, production deploy gate |
| L2 Control Plane / Kernel | Strong local foundation | run registry, state machine, approval service, enforcement engine, tenancy policy, audit tests | Production lifecycle smoke evidence, release checklist proof, stronger DB-backed persistence where needed |
| L3 Connector / Driver | Partial | connector registry/executor, adapters for Google Drive, Gmail, Calendar/GitHub/Airtable/Webhook/Resend patterns, CLI/Hermes exposure, tests | Live credential registry, per-provider scopes, enablement runbooks, tenant credential vault references, production connector approval flow |
| L4 Data Ingestion | Partial | browser agent, execution/approval webhooks, retrieval ingest, lead-to-offer intake flow | Canonical normalized `IngestionEvent` pipeline, CRM/form/call/email ingestion contracts, source validation middleware |
| L5 Data Normalization | Functional local foundation | `src/normalization/*`, 7 normalized entity types, schema registration, audit, attribution, CLI/Hermes, tests | Deeper CRM/app integration, DB-backed entity persistence, broader object coverage for full CRM MVP |
| L6 Memory | Partial | memory runtime hooks, retrieval store/search/context packs, cache layer, local history surfaces | Vector/pgvector or equivalent semantic store, tenant-level memory hardening, procedural/brand/client memory maturity |
| L7 Intelligence | Partial | decision engine, MAP/CERA, AIS foundation, opportunity/founder engines, scoring tests | Full ROI estimation, constraint diagnostics, prediction-error loop into scoring updates, lead/revenue intelligence integration |
| L8 Orchestration | Strong local foundation | BEL v3/v4, DAG runtime, Hermes missions, workflow runner, lead-to-offer workflow, CLI/Hermes routes | Durable queue/worker model, deployment-agent orchestration manifest, event-driven production triggers, n8n/Hermes role decision |
| L9 Agent Execution | Partial | core agents, agent roles, assistant runtime, security agent registry, MCP secure executor | Full `OSAgent` enforcement, domain agents, tenant memory scopes per agent, production-ready browser/voice/research/sales agents |
| L10 Governance | Strong local foundation | brand/legal/SOP/offer/agent policy modules, runtime policies, governance engine, tests | Client-specific rule inheritance, policy authoring workflow, production governance override review path |
| L11 Interface / Shell | Partial | broad CLI, operator console, Hermes API, Telegram parser/status, dashboard pages/components | Client portal, full CRM shell, approval inbox UX, agent monitor, mobile approval flow validation |
| L12 Application | Partial | offer engine, diagnostic engine, content engine, lead-to-offer workflow, founder opportunity engine | CRM product MVP, AI receptionist workflows, proposal/sales intelligence, app-level acceptance tests and dashboards |
| L13 Observability | Partial | system event ledger, metrics store, audit JSONL, Prometheus/Grafana configs, dashboard views | Alert path proof, cost/tool spend metrics, retention policy, cross-surface correlation, production health review |
| L14 Attribution | Functional foundation | MAP attribution tracker, module emitters, attribution report command, CRM attribution hooks | Lead-to-revenue tracking, spend/time savings evidence, ROI dashboard, cross-module attribution correlation |
| L15 Optimization | Early | CERA concepts, Hermes pattern/intelligence missions, feedback loop docs | Automated optimization loop that reads outcomes and adjusts workflows/scoring/prompts |
| L16 Business Outcome | Defined, not complete | spend/profit/MAP doctrine, business outcome fields in specs | Actual client outcome ledger, revenue influence, cost savings, margin/time saved reporting |

## 7. CRM Status vs CRM PRD/RLS Specs

CRM current state:

- `src/crm/crm-types.ts` defines tenant-native CRM types.
- `src/crm/tenant-context.ts` and related tests enforce explicit tenant context.
- `src/crm/persistent-crm-store.ts` provides file-backed persistence for contacts,
  leads, and opportunities.
- `src/crm/crm-service.ts` routes create/update operations through tenant guards,
  permission checks, approval policy, audit, and fire-and-forget attribution.
- `tests/crm/*` covers tenant context, cross-tenant isolation, duplicate object
  IDs across tenants, permission blocks, approval-gated opportunity updates, and
  attribution failure tolerance.

CRM PRD alignment:

- Aligned with the doctrine that CRM must be tenant-native and not AJ-only.
- Aligned with explicit `tenantId` as the service boundary.
- Aligned with approval-governed CRM writes for higher-risk actions.
- Aligned with audit and attribution as required CRM primitives.

CRM gaps against the module spec:

- No full HubSpot-like CRM shell yet.
- No platform admin tenant switcher/tenant directory UI.
- No tenant admin/user CRM views for contacts, companies, leads, opportunities,
  pipelines, tasks, inbox, forms, bookings, quotes, invoices, reports, workflows,
  users, permissions, AI receptionist settings, or knowledge base.
- No AI receptionist, missed-call recovery, speed-to-lead, stale lead recovery,
  quote/invoice tracking, or revenue leak workflows fully implemented as CRM
  product flows.
- No tenant-scoped connector credential metadata/vault integration.
- No production CRM API route layer with auth/session tenant resolver.

CRM DB/RLS gaps:

- The DB/RLS spec is design-only and states that no migration is applied.
- The primary CRM DB target is unresolved: Supabase Postgres vs Neon Postgres.
- No executable CRM Postgres migration exists from the RLS spec.
- No SQL/RLS integration tests prove missing-context denial, cross-tenant read
  denial, cross-tenant write denial, duplicate ID isolation, and approved
  platform reporting views.
- No DB-backed CRM store exists behind the `PersistentCrmStore` service contract.

Recommended CRM next step:

Do not build more CRM UI first. Choose the primary CRM database target, then
create the executable CRM migration and RLS tests. After isolation is proven,
build the CRM shell and product workflows.

## 8. Deployment Agent Orchestration Status

Built or partially built:

- `Dockerfile` and `docker-compose.yml` exist.
- `Procfile` starts `node dist/server.js`.
- `src/server.ts` starts Hermes after environment checks.
- `src/hermes/hermes-status-api.ts` exposes a broad raw-HTTP API surface for
  status, BEL, attribution, control runs, DAG, cache, normalization, connectors,
  core, governance, and app engines.
- CLI routes exist for assistant, operator console, approvals, run inspection,
  Hermes, governance, connectors, DAG, cache, normalization, Telegram, and
  lead-to-offer.
- Deployment runtime doctrine exists for local/cloud/runtime adapters.
- Render adapter doctrine exists but explicitly does not add deploy config,
  remote resources, secrets, or production deployment.

Deployment orchestration gaps:

- No approved production service manifest exists.
- No deployment adapter implementation exists for Render/Vercel/Fly/Railway.
- No production deploy approval packet flow exists.
- No deployment audit/attribution event implementation exists.
- No CI release-readiness workflow evidence exists in this review.
- No verified staging run was performed.
- No cloud runtime health, logs, rollback, cost, or tenant impact evidence was
  captured.
- No dedicated always-on production service contract is fully reconciled with
  current package scripts and docs.

Deployment decision:

The repo has deployable ingredients, but deployment agent orchestration is not
ready to be treated as an autonomous or production workflow. Production deploys,
remote config, DNS, provider secrets, and hosted database migrations still
require explicit operator approval and a service manifest.

## 9. Hooks, Loops, And Runbooks Status

Hooks:

- `.codex/STOP_HOOK_PROPOSAL.md` exists as proposal-only.
- No Stop hook is installed or activated by this repo.
- Global hook activation remains approval-gated.

Runtime loops:

- Memory runtime includes before/after/failure style lifecycle hooks.
- Hermes missions provide recurring operational/intelligence/distribution style
  loops.
- BEL and DAG layers include retry, escalation, approval-gate, and cache-hook
  concepts.
- Codex iterative repair loop standard is documented.

Loop gaps:

- The feedback loop is not yet a full optimization layer that adjusts scoring,
  workflows, prompts, or offers based on measured outcomes.
- Some DAG cache hooks are still described in code as stubs.
- Pattern extraction and intelligence computation exist as system concepts, but
  business optimization is not closed through outcome data.

Runbooks:

- Runbooks exist for first boot, git sync, secret hygiene, staging, production
  readiness, deployment handoff, operational baseline, and recovery.
- The runbook set is useful but not fully synchronized with package scripts and
  current implementation.

Runbook gaps:

- Some commands in runbooks do not exist as npm scripts.
- Docker/service startup was not verified in this review.
- Runbooks need one reconciliation pass against `package.json`, CLI routing,
  Docker Compose, and actual deployment policy.

## 10. Stale Docs And Package-Script Mismatches

Observed mismatches:

- `docs/deployment/production-readiness.md` references:
  - `npm run assistant:setup`
  - `npm run assistant:doctor`
  - `npm run release:check`
  - `npm run smoke:ollama-provider`
- `docs/deployment/staging-runbook.md` references:
  - `npm run assistant:setup`
  - `npm run assistant:doctor`
  - `npm run release:check`
  - `npm run start:staging`
  - `npm run tool-registry`
  - `npm run integration-profiles`
  - `npm run model-profiles`
- `docs/DEPLOYMENT-HANDOFF.md` references:
  - `npm run validate:production`
  - `npm run start:production-local`
  - `npm run start:full`

Current `package.json` does include:

- `build`
- `typecheck`
- `cli`
- `cli:help`
- `cli:dashboard`
- `cli:console`
- `cli:pending`
- `cli:approved`
- `cli:failed`
- `cli:executed`
- `cli:track`
- `cli:summary`
- `cli:events`
- `cli:approve`
- `cli:execute`
- `cli:resume`
- `control-plane:start`
- `link:local`
- `test`
- `test:watch`
- `coverage`

Important nuance:

Several capabilities referenced by the stale scripts exist as CLI commands
after build, for example `assistant-setup`, `assistant-doctor`,
`tool-registry`, `integration-profiles`, and `model-profiles`. The mismatch is
that docs present them as dedicated npm scripts instead of using the current
pattern:

```bash
npm run cli -- <command>
```

Impact:

- Operators following runbooks literally may hit missing npm script errors.
- Release readiness cannot pass until the docs and package scripts agree.

Recommended remediation:

Choose one standard:

1. Add package script aliases for the documented commands, or
2. Update runbooks to use `npm run cli -- <command>` consistently.

Option 2 is lower-risk unless package script ergonomics are required for release.

## 11. Where We Are Relative To The PRD

PRD/system doctrine alignment:

- Data before automation: partially satisfied through normalization, schemas,
  retrieval, CRM types, and file-backed stores.
- Control before execution: strongly represented through control plane,
  permissions, approvals, and policy gates.
- Governance before scale: strongly represented locally, still needs
  client-specific and production-operational hardening.
- Attribution before claims: attribution foundation exists, but real business
  outcome linkage is incomplete.
- Optimization before expansion: not yet satisfied; optimization layer remains
  early.
- Profit and spend as final scoreboards: defined in doctrine, not yet proven by
  outcome data.

PRD completion summary:

```text
Core OS/control foundation: built enough for internal operation
Local-first execution: functional
Governance and approval: strong local foundation
Layer coverage: broad but uneven
CRM product: foundation only
Deployment readiness: not complete
Business outcome proof: not complete
Client production readiness: blocked
```

## 12. Recommended Next Build Sequence

Priority 0: Reconcile truth before building

- Update stale deployment/runbook command references or add matching package
  scripts.
- Update the layer coverage index to reflect current source reality.
- Decide one release target: internal, private team, public repo, or npm.
- Create a current release-readiness issue/checklist from the go-live checklist.

Priority 1: Release-readiness baseline

- Add or verify CI release-readiness workflow.
- Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
- Add smoke tests for core CLI commands.
- Verify JSON mode for core commands.
- Run `npm pack --dry-run` and inspect payload.

Priority 2: CRM persistence and isolation

- Operator chooses Supabase Postgres or Neon Postgres for CRM.
- Create executable CRM migration from the RLS spec.
- Add SQL/RLS isolation tests with at least two tenants.
- Add DB-backed CRM store behind current CRM service contract.

Priority 3: Deployment manifest and orchestration gate

- Pick one low-risk internal service candidate.
- Create a service manifest before provider config.
- Define deploy, rollback, observability, cost, tenant scope, and approval path.
- Do not add production auto-deploy.

Priority 4: Interface consolidation

- Decide dashboard path ownership: `dashboard/` Next.js vs `ui/dashboard/` Vite.
- Expose the highest-value operational panels: approval inbox, run lifecycle,
  DAG graph, connector health, CRM tenant context, attribution summary.
- Avoid building a client portal before CRM DB/RLS isolation is proven.

Priority 5: Business outcome layer

- Connect CRM events, attribution events, and lead/opportunity states.
- Add revenue influence and time/spend-saved records.
- Build the first ROI/outcome report from real or representative data.

## 13. Validation Performed And Skipped

Validation performed before this document was created:

- `git status --short --branch`
  - Result: `## main...origin/main`
- `npm run typecheck`
  - Result: passed with `tsc --noEmit`
- `Test-Path docs\build-state-prd-gap-review-2026-06-26.md`
  - Result: `False`

Validation required after this document is written:

- `git status --short --branch`
- `git diff --name-only`
- `git diff --check`

Validation intentionally skipped:

- `npm run build`
  - Reason: docs-only task; build writes generated output under `dist/`.
- `npm test`
  - Reason: docs-only task; some tests exercise file-backed/runtime paths.
- Docker Compose startup
  - Reason: out of scope; starts services and mutates container/runtime state.
- Any deploy, push, merge, install, secret, credential, or runtime-state work
  - Reason: explicitly out of scope and approval-gated.

## 14. DOX Pass

Nearest owning `AGENTS.md`: `docs/AGENTS.md`.

This change adds a point-in-time review document. It does not alter durable
folder ownership, local contracts, workflow permissions, side effects, required
inputs/outputs, or validation rules. No `AGENTS.md` update is required.

## 15. Decision

Decision label: Proceed for docs-only review handoff.

Do not proceed to implementation until the operator chooses the next scope. The
recommended next scope is a docs/runbook reconciliation pass, followed by CRM
DB target selection and release-readiness validation.

