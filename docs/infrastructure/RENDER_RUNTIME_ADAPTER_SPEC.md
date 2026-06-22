# Render Runtime Adapter Specification

**Status:** Doctrine/specification only
**Owner:** AJ Digital LLC
**Runtime:** Render
**Layer classification:** Infrastructure Layer, Connector / Driver Layer, Orchestration Layer, Observability Layer, Governance Layer
**Implementation status:** No app code, deploy config, secrets, remote resources, or production deployment is introduced by this spec.

---

## Purpose

This document defines how Render should be added to AJ Digital OS as a governed cloud deployment runtime adapter.

Render is not AJ Digital OS. Render is a managed cloud runtime that AJ Digital OS may use to host public apps, APIs, workers, cron jobs, databases, preview environments, and client-facing modules when cloud deployment is justified.

The purpose of this spec is to create doctrine before implementation so future Render usage preserves:

- local-first development
- control-plane authority
- tenant isolation
- secret hygiene
- deployment auditability
- observability and cost tracking
- provider abstraction for future Vercel, Fly.io, Railway, AWS, local Docker, or VPS adapters

## Classification

Render is classified as:

| Dimension | Classification |
|---|---|
| OS role | Managed cloud deployment runtime adapter |
| Primary layer | Infrastructure Layer |
| Secondary layers | Connector / Driver, Orchestration, Observability, Governance, Attribution |
| Trust zone | Cloud service and production deployment boundary |
| Risk domain | Deployment, secrets, billing, client data, public uptime, rollback |
| Default posture | Disabled until service manifest, approval path, and validation sequence exist |

Render is not:

- the AJ Digital OS control plane
- the source of truth for tenant policy
- the source of truth for approval state
- the owner of agent execution policy
- a replacement for local-first development
- a reason to bypass governance, attribution, or observability

## Why Render Exists In AJ Digital OS

Render exists to provide managed cloud runtime capacity when local execution is insufficient.

Valid reasons include:

- public cloud deployment is needed for an app, API, or client-facing module
- preview environments are needed for review before merge or release
- background workers or scheduled jobs need reliable hosted execution
- managed Postgres or supporting datastores are justified by uptime, collaboration, or client access
- an internal service needs always-on availability beyond a local workstation
- a client-facing module needs production-grade uptime, logs, rollback, and domain access

Render is useful only when it increases operational reliability without weakening AJ Digital OS governance.

## What Render May Be Used For

Render may be used for:

- internal AJ Digital OS web apps
- internal APIs
- client-facing portals or modules
- governed preview environments
- staging environments
- production web services after approval
- private services
- background workers
- cron jobs
- managed databases, including Render Postgres when approved
- supporting datastores when tenancy, backup, and cost rules are defined
- low-risk internal experiments with explicit cleanup policy

The official Render documentation currently describes service types such as web services, static sites, private services, background workers, cron jobs, workflows, and managed datastores. This spec intentionally maps those platform concepts into AJ Digital OS runtime doctrine instead of treating Render service types as OS architecture.

## What Render Must Not Be Used For

Render must not be used to:

- bypass the AJ Digital OS control plane
- auto-deploy production or client systems without approval
- store secrets in source control
- merge AJ internal infrastructure and client infrastructure into one unmanaged runtime surface
- host multi-tenant services without tenant isolation requirements
- run unregistered agents or workflows
- make deployment state the only source of audit truth
- introduce provider lock-in to core OS logic
- replace local-first development as the default execution path
- create billable resources without owner and cost center
- connect production client credentials to preview or development services
- run persistent file-backed runtime state without a storage migration or persistence plan
- use free or experimental runtimes for production services

## Layer Mapping

| AJ Digital OS layer | Render responsibility | Doctrine |
|---|---|---|
| Infrastructure Layer | Compute, network, managed databases, preview/staging/production environments. | Render provides resources, not authority. |
| Control Plane / Kernel Layer | Deployment actions must be authorized, risk-classified, and approval-gated before execution. | No deployment bypass. |
| Connector / Driver Layer | Render adapter maps service operations into stable OS concepts. | Core workflows call an adapter contract, not Render-specific logic. |
| Orchestration Layer | Deployment workflows, validation, rollback, and post-deploy checks can be represented as explicit steps. | Deployment is a governed workflow, not an implicit side effect. |
| Governance Layer | Owner, tenant scope, risk level, approval, cost center, and environment rules are required. | Policy controls runtime use. |
| Observability Layer | Logs, health checks, uptime, deploy state, alerts, cost, and error signals must be available. | Unobservable services are not production-ready. |
| Attribution Layer | Production/client-impacting deployment actions should emit attribution events. | Deployment impact must be traceable when it affects business outcomes. |

## Deployment Runtime Doctrine

1. Render is not AJ Digital OS.
2. Render is a cloud runtime adapter governed by AJ Digital OS.
3. Render may host apps, APIs, workers, cron jobs, databases, preview environments, and client-facing modules.
4. Local-first development remains the default.
5. Render is used when public cloud deployment, preview environments, background workers, managed Postgres, or client-facing uptime justify it.
6. No agent, workflow, or deployment may bypass the control plane.
7. Secrets must never be committed.
8. Every Render service must declare owner, environment, tenant scope, risk level, environment variables, deployment trigger, rollback path, observability, and cost center.
9. Client infrastructure must be separated from AJ Digital internal infrastructure.
10. Multi-tenant services must preserve tenant isolation.
11. Render deployment actions should emit audit and attribution events when they affect production or client systems.
12. Render must be abstracted so AJ Digital OS can later support Vercel, Fly.io, Railway, AWS, local Docker, or VPS without rewriting core logic.

## Environment Doctrine

Render environments must map into the AJ Digital OS environment model:

| Environment | Render use | Required controls |
|---|---|---|
| `development` | Only for low-risk remote experiments when local runtime is insufficient. | No client data, no production secrets, cleanup policy required. |
| `preview` | Pull request or branch review environments. | Preview data must be synthetic, sandboxed, or explicitly approved. Secrets require provider-managed env groups or external secret manager. |
| `staging` | Production-like validation before release. | Approval required before connecting persistent services, client credentials, or production-like datasets. |
| `production` | Live AJ internal or client-facing services. | Explicit `proceed` approval, manifest, rollback plan, observability, cost owner, and post-deploy validation required. |

Preview and staging should never silently inherit production credentials or client data.

## Secret Management Doctrine

Secrets must never be committed to source control.

Allowed in repo:

- environment variable names
- placeholder declarations
- `sync: false` style placeholders in future provider config
- secret ownership notes without values
- instructions for where values must be entered

Not allowed in repo:

- API keys
- tokens
- database passwords
- OAuth secrets
- service role keys
- client credentials
- real `.env` files
- screenshots or logs containing secret values

Approved secret locations:

- Render environment variables or environment groups
- external secret manager
- local `.env` only for local development, never committed

Secret rules:

- production secrets must be separate from preview and staging secrets
- client secrets must be separate from AJ internal secrets
- multi-tenant services must not use one client credential across tenants unless the client system explicitly supports tenant-scoped authorization
- any secret exposure requires rotation before production use
- build-time secrets require extra scrutiny because build logs and generated artifacts can widen exposure

## Tenant Isolation Requirements

Every Render service must declare `tenantScope`:

| Tenant scope | Meaning | Rule |
|---|---|---|
| `none` | Internal AJ service with no client data. | Must not connect to client credentials or client datasets. |
| `single_tenant` | Service dedicated to one client or tenant. | Must declare `tenantId`, data stores, credentials, and logs for that tenant. |
| `multi_tenant` | Service handles more than one tenant. | Must enforce tenant context, policy checks, data partitioning, credential isolation, and observability by tenant. |

Client infrastructure must be separated from AJ Digital internal infrastructure. Separation may mean separate Render projects, separate environments, separate databases, separate credentials, separate domains, and separate logs depending on risk level.

Multi-tenant services require:

- tenant context on every client-impacting request or job
- tenant-scoped database model or database separation plan
- tenant-scoped log redaction and search policy
- tenant-aware background job routing
- tenant-aware cost attribution when feasible
- cross-tenant access tests before production
- explicit escalation path for suspected tenant bleed

## Service Registry Requirements

Every Render service must have a manifest before remote configuration is created.

The manifest must identify:

- what the service is
- why Render is justified
- which repo owns the service
- which environment it runs in
- whether the owner is AJ internal or client
- tenant scope
- risk level
- deployment trigger
- required environment variable names
- secret management location
- rollback plan
- observability coverage
- cost center
- approval requirement

Recommended future registry paths:

```text
docs/infrastructure/render/
  service-manifest-template.md
  services/
    aj-internal-example.md

config/infrastructure/
  render-services.example.json
```

No registry file is created in this phase because Phase 0 is doctrine/spec only.

## Observability Requirements

Each Render service must define how AJ Digital OS can inspect:

- current deploy status
- deployed commit or version
- build logs
- runtime logs
- health check path and result
- uptime monitor
- error alert route
- rollback target
- deployment actor
- deployment trigger
- tenant impact
- cost owner

Production and client-facing services should also emit or mirror events into AJ Digital OS observability when practical:

- `deployment_requested`
- `deployment_approved`
- `deployment_started`
- `deployment_succeeded`
- `deployment_failed`
- `deployment_rolled_back`
- `runtime_health_degraded`
- `runtime_cost_threshold_reached`

Event implementation is deferred. This spec only defines the required contract.

## Cost Tracking Requirements

Each Render service must declare:

- cost center: `aj_internal`, `client_billable`, `client_included`, or `experiment`
- owner responsible for cost review
- Render workspace/project
- service plan or expected cost band
- preview environment cleanup rule
- scaling limit
- billable tenant or internal budget bucket
- monthly review cadence

Cost risk rules:

- preview environments must have cleanup rules
- production databases must have backup and scaling assumptions documented
- client-facing services must state whether cost is client-billable or included
- experiments must have an expiration date
- services with autoscaling or persistent storage require explicit cost review before production

## Governance And Approval Rules

Approval is required before:

- adding production `render.yaml` or equivalent Render config
- linking a production branch to Render
- enabling production auto-deploy
- deploying production services
- creating production databases
- connecting production or client secrets
- adding custom domains or DNS
- changing billing-impacting plans
- running migrations against hosted databases
- deploying multi-tenant services
- deleting, suspending, or replacing Render services
- rolling back production or client-facing services
- giving agents or CI direct Render deployment authority

Approval is not required for:

- writing doctrine/spec docs
- drafting manifest templates
- inventorying candidate services
- reading public Render documentation
- local-only validation of docs

All deployment actions with production or client impact should be recorded in the audit path and, when tied to a business outcome, the attribution path.

## Render Service Manifest Schema

Recommended TypeScript schema:

```ts
interface RenderServiceManifest {
  id: string;
  name: string;
  repo: string;
  serviceType: "web" | "api" | "worker" | "cron" | "database" | "preview";
  environment: "development" | "preview" | "staging" | "production";
  owner: "aj_internal" | "client";
  tenantScope: "none" | "single_tenant" | "multi_tenant";
  tenantId?: string;
  riskLevel: "L0" | "L1" | "L2" | "L3" | "L4";
  deploymentTrigger: "manual" | "github_push" | "github_pr" | "scheduled" | "control_plane";
  requiredEnvVars: string[];
  secretsManagedIn: "render_env" | "external_secret_manager";
  rollbackPlan: string;
  observability: {
    logs: boolean;
    healthCheck: boolean;
    uptimeMonitor: boolean;
    errorAlerts: boolean;
    costTracking: boolean;
  };
  approvalRequired: boolean;
}
```

Extended future schema fields:

```ts
interface RenderServiceManifestExtended extends RenderServiceManifest {
  provider: "render";
  providerServiceId?: string;
  project?: string;
  region?: string;
  branch?: string;
  healthCheckPath?: string;
  costCenter: "aj_internal" | "client_billable" | "client_included" | "experiment";
  expectedMonthlyCostBand?: "free" | "low" | "medium" | "high" | "unknown";
  cleanupPolicy?: string;
  lastReviewedAt?: string;
  references?: {
    renderDashboardUrl?: string;
    repoUrl?: string;
    runbookPath?: string;
    rollbackDocPath?: string;
  };
}
```

## Recommended Repo File Structure

Doctrine and provider-neutral standards:

```text
docs/infrastructure/
  DEPLOYMENT_RUNTIME_STANDARD.md
  RENDER_RUNTIME_ADAPTER_SPEC.md
```

Future manifest and implementation docs:

```text
docs/infrastructure/render/
  README.md
  service-manifest-template.md
  services/
    <service-id>.md
  runbooks/
    preview-deploy.md
    staging-deploy.md
    production-deploy.md
    rollback.md
```

Future provider config, only after approval:

```text
render.yaml
```

Future source implementation, only after approval:

```text
src/infrastructure/render/
  render-service-manifest.ts
  render-service-registry.ts
  render-runtime-adapter.ts
```

This phase creates only the doctrine files under `docs/infrastructure/`.

## Implementation Phases

### Phase 0 - Doctrine/spec only

- Create this spec.
- Create or reference the provider-neutral deployment runtime standard.
- Do not create app code.
- Do not create `render.yaml`.
- Do not create Render services.
- Do not connect secrets.
- Do not deploy.

### Phase 1 - Inventory existing deployable AJ Digital OS apps/services

- Identify services that might need cloud runtime.
- Classify each candidate by layer, risk, tenant scope, owner, and environment.
- Determine whether local-first remains sufficient.
- Reject candidates where Render is not justified.

### Phase 2 - Add service manifest template

- Create a manifest template using the schema in this spec.
- Add examples with placeholder values only.
- Define review workflow for new service manifests.
- Keep secrets as variable names only.

### Phase 3 - Add `render.yaml` only for one low-risk internal service

- Pick an internal, non-client, non-production, low-risk service.
- Require explicit approval before adding provider config.
- Use placeholders for secrets.
- Keep auto-deploy disabled unless separately approved.
- Validate health check and rollback locally where possible.

### Phase 4 - Add staging/preview deploy flow

- Define preview environment controls.
- Ensure previews do not inherit production secrets or client data.
- Add staging validation checklist.
- Capture deploy logs and health checks.

### Phase 5 - Add production approval gate

- Define production deploy approval packet.
- Require rollback plan before approval.
- Require post-deploy validation.
- Record deployment audit events.
- Block production deploys without manifest and approval.

### Phase 6 - Add observability and cost tracking

- Add health, uptime, error alert, and cost reporting requirements.
- Define cost review cadence.
- Add service status reporting to AJ Digital OS observability where appropriate.
- Define alert ownership.

### Phase 7 - Evaluate client-facing deployment readiness

- Validate tenant isolation.
- Validate client credential boundaries.
- Validate audit and attribution events.
- Validate rollback and incident response.
- Confirm client infrastructure separation.
- Confirm cost ownership and billing model.

## Acceptance Criteria

This doctrine/spec PR is accepted when:

- `docs/infrastructure/RENDER_RUNTIME_ADAPTER_SPEC.md` exists.
- `docs/infrastructure/DEPLOYMENT_RUNTIME_STANDARD.md` exists or the Render spec otherwise references provider-neutral deployment doctrine.
- Render is classified as infrastructure/runtime, not core OS.
- No code deployment occurs.
- No `render.yaml` is added.
- No secrets or `.env` values are added.
- The spec references AJ Digital OS layer model concepts.
- The spec defines approval requirements before production use.
- The spec defines cost and observability requirements.
- The spec preserves local-first development.
- The spec prevents tenant/client data bleed.
- The spec provides the next implementation sequence.
- The docs DOX index identifies the new infrastructure docs boundary.

## Open Decisions

- Which AJ Digital OS service should be the first low-risk internal Render candidate?
- Should Render projects be separated by AJ internal, client, and experimental scopes?
- Should client-facing Render services live in AJ-owned workspaces, client-owned workspaces, or case-by-case workspaces?
- Which external secret manager should be preferred when Render env vars are not enough?
- What is the canonical cost band scale for infrastructure services?
- What event names should the attribution tracker use for deployment impact?
- What health check path should be required for each service type?
- Should production auto-deploy ever be allowed, or should production remain manual/control-plane only?
- Which provider-neutral adapter interface should represent deploy, rollback, status, logs, and cost operations?

## Risks

- Provider lock-in if core workflows call Render APIs directly.
- Tenant bleed if preview/staging services share production credentials or data.
- Secret exposure if provider config includes values instead of placeholders.
- Cost drift from persistent services, databases, preview environments, or scaling.
- False production confidence if Render deploy success is treated as OS readiness.
- Audit gaps if Render dashboard history is not mirrored into AJ Digital OS records.
- Rollback risk if database migrations are not separated from app deploy rollback.
- Local-first erosion if cloud runtime becomes the default path for development.

## Source References

Official Render docs checked on 2026-06-22:

- Render service types: https://render.com/docs/service-types
- Render preview environments: https://render.com/docs/preview-environments
- Render environment variables and secrets: https://render.com/docs/configure-environment-variables
- Render Blueprint YAML reference: https://render.com/docs/blueprint-spec
- Render infrastructure as code: https://render.com/docs/infrastructure-as-code
- Render deploys: https://render.com/docs/deploys
- Render logs: https://render.com/docs/logging
- Render persistent disks: https://render.com/docs/disks

Repo doctrine references:

- `docs/infrastructure/DEPLOYMENT_RUNTIME_STANDARD.md`
- `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`
- `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`
- `docs/deployment/production-readiness.md`
- `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`
