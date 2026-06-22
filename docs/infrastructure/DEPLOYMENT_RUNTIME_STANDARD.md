# AJ Digital OS Deployment Runtime Standard

**Status:** Doctrine standard
**Owner:** AJ Digital LLC
**Scope:** AJ Digital OS internal services, client-facing services, preview environments, cloud runtimes, local Docker, VPS, and future deployment adapters.

---

## Purpose

This standard defines how AJ Digital OS classifies deployment platforms and runtime environments before any provider-specific implementation is added.

Deployment platforms are governed resources. They are not the operating system, not the control plane, and not the source of truth for workflow authority. AJ Digital OS may use a deployment runtime to host services, but the runtime must remain abstracted behind governance, service manifests, approval gates, observability, and tenant isolation.

## Core Doctrine

1. AJ Digital OS remains local-first by default.
2. A deployment platform is an infrastructure/runtime adapter, not the OS.
3. No agent, workflow, or deployment may bypass the control plane.
4. Deployment actions that affect production, client systems, public services, credentials, billing, or data require explicit approval.
5. Secrets must never be committed to source control.
6. Client infrastructure must be separated from AJ Digital internal infrastructure.
7. Multi-tenant services must preserve tenant isolation at runtime, data, credential, log, and observability boundaries.
8. Deployment runtimes must emit or preserve audit, attribution, cost, and observability signals when they affect production or client systems.
9. Provider-specific files such as `render.yaml`, Vercel config, Fly config, Railway config, Docker compose files, or VPS scripts are implementation artifacts. They must not become the canonical deployment policy.
10. The OS must be able to add or replace deployment providers without rewriting core agent, workflow, approval, attribution, or tenant logic.

## Runtime Classification

Deployment runtimes belong primarily to the Infrastructure Layer and Connector / Driver Layer.

They also interact with:

| Layer | Runtime responsibility |
|---|---|
| Infrastructure Layer | Provides compute, network, storage, deployment target, and environment boundaries. |
| Control Plane / Kernel Layer | Authorizes deployment actions, blocks bypasses, records approvals, and enforces risk classification. |
| Connector / Driver Layer | Exposes provider-specific deployment operations through stable adapter contracts. |
| Orchestration Layer | Coordinates deploy-related workflows, preview creation, rollback steps, and post-deploy validation. |
| Governance Layer | Defines approval rules, owner obligations, tenant boundaries, and policy constraints. |
| Observability Layer | Records deploy state, logs, uptime, health checks, errors, cost, and operational signals. |
| Attribution Layer | Emits business-impact events when deployment actions affect client systems, production modules, or revenue-critical workflows. |

## Runtime Types

AJ Digital OS may support multiple runtime families:

| Runtime family | Examples | Use when |
|---|---|---|
| Local runtime | Local Node, local Python, local Ollama, local Docker | Development, diagnostics, internal testing, low-risk operator workflows. |
| Managed app platform | Render, Vercel, Railway, Fly.io | Public web services, APIs, preview environments, managed workers, cloud uptime. |
| Managed data runtime | Render Postgres, Neon, Supabase, managed Redis | Hosted persistence is justified by uptime, collaboration, client access, or scale. |
| Edge/runtime platform | Cloudflare Workers, Vercel Edge | Low-latency public endpoints, edge middleware, routing, lightweight API surfaces. |
| VPS/container host | Hetzner, DigitalOcean, AWS EC2, local server | Custom runtime control, cost control, long-running services, private workloads. |

No runtime family is globally preferred. The correct choice depends on risk, uptime requirements, tenant scope, cost, observability, rollback capability, and control-plane integration maturity.

## Environment Doctrine

Every deployable service must declare one environment:

| Environment | Purpose | Approval expectation |
|---|---|---|
| `development` | Local or low-risk cloud experiment with no client data and no production dependency. | Task-scoped approval for file changes; no deploy approval unless remote state changes. |
| `preview` | Pull request or branch-based hosted validation. | Approval required before connecting real client data, production credentials, or public traffic. |
| `staging` | Production-like validation for internal or client workflows. | Approval required before provisioning external resources, using persistent stores, or sharing with clients. |
| `production` | Live internal or client-facing runtime. | Explicit operator approval required before deploy, rollback, remote config change, or credential change. |

Local-first development remains the default. Cloud deployment is justified only when the service needs public access, uptime, previews, background workers, managed databases, client-facing modules, or operational collaboration that local runtime cannot provide.

## Required Service Manifest Fields

Every deployed service must have a manifest or registry entry before implementation.

Required fields:

- service id
- service name
- source repo
- provider
- provider service id when available
- service type
- environment
- owner
- tenant scope
- tenant id when single-tenant
- risk level
- deployment trigger
- required environment variables by name only
- secret management location
- rollback plan
- observability coverage
- cost center
- approval requirement
- last reviewed date

## Approval Rules

Explicit `proceed` approval is required before:

- adding production deploy configuration
- deploying production services
- changing remote runtime configuration
- changing deployment triggers
- enabling auto-deploy for production
- adding or changing secrets
- connecting client data or client credentials
- provisioning billable resources
- changing DNS or public domains
- running database migrations against hosted stores
- deleting, suspending, or replacing deployed services
- bypassing the control plane for any deployment action

## Observability Requirements

Every cloud runtime service must define how the operator can inspect:

- deployment status
- current version or commit
- build logs
- runtime logs
- health check result
- uptime monitor status
- error alerts
- rollback history
- cost or spend owner
- tenant impact
- approval and audit trail

If a provider cannot supply one of these signals directly, the service must document the substitute source of truth.

## Cost Tracking Requirements

Every cloud runtime service must declare:

- cost center: `aj_internal`, `client_billable`, `client_included`, or `experiment`
- owner responsible for spend review
- billing workspace or account
- expected monthly cost band
- preview/staging cleanup policy
- scale limit or budget guardrail
- review cadence

No client-facing or production service should be provisioned without a cost owner and cleanup policy.

## Provider Abstraction Rule

Provider-specific files must remain replaceable. Runtime adapters should map platform-specific terms into OS-level concepts:

| OS concept | Provider examples |
|---|---|
| service | Render service, Vercel project, Fly app, Docker container, VPS unit |
| environment | Render environment, Vercel environment, Docker compose profile |
| deployment trigger | Git push, PR preview, manual deploy, scheduled deploy, control-plane action |
| secret source | provider env vars, external secret manager, local `.env` for development only |
| rollback | previous deploy, image tag rollback, release revert, config restore |
| observability | logs, metrics, health checks, uptime monitor, alert sink |

Core logic must depend on OS concepts, not provider-specific APIs.

## Acceptance Criteria

This standard is satisfied when:

- deployment providers are treated as governed resources
- local-first development remains the default
- every cloud service has a manifest before implementation
- production/client deploy actions require approval
- secrets are referenced by name only in source control
- tenant scope is explicit for every service
- observability and cost ownership are defined before production use
- provider-specific implementation can be replaced without rewriting OS core logic

## Related Docs

- `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`
- `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`
- `docs/deployment/production-readiness.md`
- `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`
- `docs/infrastructure/RENDER_RUNTIME_ADAPTER_SPEC.md`
