# Deployment — AJ Digital OS

This is the deployment index. Long-form runbooks live in
`docs/deployment/` and `docs/ops/`. This file is the entry point.

The system is local-first by default. There is not yet a long-running
production service entrypoint; the operator console in `--watch` mode is
the current supported staging/production-like launch path.

---

## 1. Profiles

| Profile | Purpose | Entry path |
|---|---|---|
| **Local development** | Build, test, iterate, ad-hoc CLI runs. | `npm ci && npm run build && npm run cli -- help` |
| **Local staging** | Production-like preflight on a developer machine. | `docs/deployment/staging-runbook.md` |
| **Production-like** | Operator console watch mode under production env. | `docs/deployment/production-readiness.md` |

`AJ_OS_ENV` selects the runtime profile (`development`, `staging`,
`production`). `ACTIVE_MODEL_PROVIDER` and `ENABLED_MODEL_PROVIDERS`
must list the providers reachable from the host; today this is
typically `ollama`.

## 2. Authoritative runbooks

- **Production readiness checklist:** `docs/deployment/production-readiness.md`
- **Staging runbook:** `docs/deployment/staging-runbook.md`
- **First boot:** `docs/ops/first-boot-runbook.md`
- **Git sync (safe pull / push):** `docs/ops/git-sync-runbook.md`
- **Secret hygiene:** `docs/ops/secret-hygiene.md`
- **Operational baseline runbook:** `docs/operational-baseline-runbook.md`
- **Production go-live checklist:** `docs/production-go-live-checklist.md`
- **Recovery playbook (incidents):** `docs/recovery-playbook.md`
- **Publish preparation checklist:** `docs/publish-preparation-checklist.md`
- **Deployment handoff:** `docs/DEPLOYMENT-HANDOFF.md`
- **Versioning policy:** `docs/versioning-policy.md`
- **Release notes template:** `docs/release-notes-template.md`

## 3. Required environment

The full environment matrix is `.env.example`. The minimum for a working
install:

```
AJ_OS_ENV=development
HERMES_STATUS_PORT=7420
HERMES_BIND_HOST=127.0.0.1   # 0.0.0.0 only in production
ACTIVE_MODEL_PROVIDER=ollama
ENABLED_MODEL_PROVIDERS=ollama
MEMORY_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

Optional surfaces (Telegram, Sanity, Supabase, n8n) have their own
required keys; see `.env.example`. Treat every key as a secret per
`docs/SECURITY.md` §6.

## 4. Pre-flight gates

Run before any deployment:

```bash
npm ci
npm run typecheck
npm run build
npm run test
npm audit --audit-level=high
```

CI runs the same gates plus coverage (`.github/workflows/ci.yml`,
`.github/workflows/security-audit.yml`). A failing gate is a deployment
blocker.

If `npm run release:check` and `npm run start:staging` are added to
`package.json` in the future (they are referenced in `README.md`),
update this file to make them part of the gate.

## 5. Launch sequence

1. Build and validate (§4 above).
2. Verify writable directories: `data/`, `memory/`, `runtime/`,
   `output/`, `logs/`.
3. Confirm Ollama is reachable: `curl $OLLAMA_BASE_URL/api/tags`.
4. Run the CLI healthcheck: `npm run cli -- dashboard --json` (the
   dedicated `cli:healthcheck` script is planned, see `README.md`).
5. Start the operator console in watch mode:
   `node dist/cli.js operator-console --watch`.
6. Verify Hermes is up on `HERMES_STATUS_PORT`.
7. Confirm monitoring (Prometheus, Alertmanager, Grafana) is collecting
   metrics; details in `monitoring/`.

## 6. Post-deploy verification

- Drive one full run through `pending_approval -> approved -> executed`
  on a known-good seed workflow.
- Verify the resulting artifact appears under
  `data/outputs/<brand>/published/` (or the safe-fallback root).
- Verify the attribution log
  (`runtime/logs/attribution.jsonl`) recorded the run.
- Verify the system event ledger (`runtime/events/system-events.jsonl`)
  recorded the lifecycle transitions.

## 7. Rollback

The runtime is file-backed. Rollback is:

1. Stop the operator console process.
2. Restore the affected `data/`, `runtime/`, or `memory/` paths from the
   last good backup (`docs/recovery-playbook.md`).
3. Restart per §5.

Production deploys and secret rotations require explicit human approval
every time per `docs/SECURITY.md` §7.
