# Deployment Index

This document is the navigation index for deploying AJ Digital OS. It points to the canonical runbooks and clarifies the supported deployment paths.

---

## 1. Supported Deployment Shapes

### A. Local-first operator install (canonical default)

The supported start path for internal use:

```bash
npm install
npm run build
npm run cli -- help
npm run cli -- operator-console
```

Operator workflow lives in the CLI. No long-running service is required.

### B. Production-like staging (operator console in watch mode)

This is the current production-like start path:

1. Set production environment variables (see `docs/deployment/production-readiness.md`).
2. Build the project.
3. Run the release-readiness gate.
4. Start the operator console in watch mode.

The repository does not yet ship a separate long-running web service entrypoint. The operator console in watch mode is the supported staging/production-like operational launch path.

Full sequence: `docs/deployment/staging-runbook.md`.

### C. Containerized deployment (Docker / Compose)

- Root `Dockerfile` and `Procfile` exist for hosted Docker runtimes.
- Root `docker-compose.yml` is the legacy top-level compose.
- `compose/docker-compose.yml` is the canonical compose definition.
- `monitoring/` provides Prometheus, Grafana, Alertmanager, and Blackbox configs.
- `ops/` carries supporting otel/grafana/prometheus scaffolds.

For container deploys, treat `compose/docker-compose.yml` as canonical.

### D. PaaS deployment (Heroku/Railway/Render-style)

`Procfile` exists for PaaS-style deploys. See `docs/DEPLOYMENT-HANDOFF.md` for the current production handoff state and required environment variables.

---

## 2. Canonical Runbooks

| Runbook                                       | Use it when…                                    |
|-----------------------------------------------|-------------------------------------------------|
| `docs/deployment/production-readiness.md`     | Preparing a production environment              |
| `docs/deployment/staging-runbook.md`          | Bringing up a staging environment               |
| `docs/DEPLOYMENT-HANDOFF.md`                  | Looking up production handoff state             |
| `docs/production-go-live-checklist.md`        | Final go-live gating                            |
| `docs/operational-baseline-runbook.md`        | Establishing operational baseline               |
| `docs/recovery-playbook.md`                   | Recovering from a failure                       |
| `docs/operator-playbook.md`                   | Daily operator workflow                         |
| `docs/publish-preparation-checklist.md`       | Preparing a publishable release                 |
| `docs/grafana-dashboard-map.md`               | Wiring Grafana dashboards to the metric surface |
| `docs/ops/first-boot-runbook.md`              | First-boot sequence on a fresh host             |
| `docs/ops/git-sync-runbook.md`                | Recovering or syncing git state                 |
| `docs/ops/secret-hygiene.md`                  | Auditing or rotating secrets                    |

---

## 3. Required Environment Variables

The minimum runtime variables for production are documented in `docs/deployment/production-readiness.md`. Quick reference:

```env
AJ_OS_ENV=production
ACTIVE_MODEL_PROVIDER=ollama
ENABLED_MODEL_PROVIDERS=ollama
MEMORY_ENABLED=true
OLLAMA_BASE_URL=http://your-ollama-host:11434
```

Provider, integration, and SaaS-related env vars are listed in `.env.example` (Ollama, OpenAI, Anthropic, LM Studio, Sanity, Telegram, n8n, Supabase, Neon, Cloudflare R2, Stripe, Slack, Hermes).

---

## 4. Runtime Directory Expectations

The runtime expects writable directories at the repo root:

- `data/runs/`
- `data/reports/runs/`
- `data/logs/`
- `data/cache/`
- `data/approvals/`
- `data/approved/`
- `data/assistant/`
- `data/conversations/`
- `data/memory/`
- `data/brands/manifests/`
- `data/deliverables/registry/`
- `data/outputs/`
- `data/tools/`
- `data/integrations/profiles/`
- `data/model-profiles/`
- `data/secrets/` (metadata only)
- `memory/` when `MEMORY_ENABLED=true`

These are all gitignored by design. Operators are responsible for their backup posture.

Full list: `docs/deployment/production-readiness.md` § Runtime Directory Expectations.

---

## 5. Compose Layout

| File                              | Purpose                                                  |
|-----------------------------------|----------------------------------------------------------|
| `compose/docker-compose.yml`      | **Canonical** compose definition                         |
| `docker-compose.yml` (root)       | Legacy top-level compose (kept for current usage)        |
| `monitoring/prometheus.yml`       | Prometheus scrape config                                 |
| `monitoring/alertmanager.yml`     | Alertmanager routing                                     |
| `monitoring/blackbox.yml`         | Blackbox exporter                                        |
| `monitoring/alerts/`              | Alert rule files                                         |
| `monitoring/grafana/`             | Grafana provisioning + dashboards                        |
| `ops/grafana/`                    | Ops scaffold for Grafana                                 |
| `ops/prometheus/`                 | Ops scaffold for Prometheus                              |
| `ops/otel/`                       | Ops scaffold for OpenTelemetry collector                 |

If `compose/docker-compose.yml` and the root `docker-compose.yml` diverge, treat `compose/` as canonical. Reconciliation is tracked on the roadmap.

---

## 6. Deployment Authority

Final authority on deployment configuration:

1. `docs/DEPLOYMENT.md` (this file) — index.
2. `docs/deployment/production-readiness.md` — production env contract.
3. `docs/deployment/staging-runbook.md` — current production-like start path.
4. `docs/DEPLOYMENT-HANDOFF.md` — production handoff state.
5. `.env.example` — env template.

Changes to deployment shape require an entry in `docs/DECISIONS.md`.
