# Security and Trust Overview

This document is the canonical security policy for AJ Digital OS. The root-level `SECURITY.md` is the GitHub-facing stub that points here.

---

## 1. Scope

AJ Digital OS is a local-first AI workflow runtime. Its security model covers:

- Approval-gated mutations to system state.
- Signed webhook traffic for approval and execution flows.
- Local credential references (without raw secret persistence).
- Multi-tenant isolation primitives for future client work.
- Permission enforcement for agent and tool actions.

Deeper specifications live under:

- `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`
- `docs/ops/secret-hygiene.md`

---

## 2. Disclosure Process

If you find a vulnerability:

1. Do not open a public GitHub issue.
2. Email the maintainers privately, or open a GitHub Security Advisory on this repo.
3. Include reproduction steps, impact assessment, and any suggested mitigation.
4. Expect an acknowledgment within 5 business days.
5. We will coordinate a fix and disclosure timeline with you.

We do not currently run a paid bug bounty program. Reports are welcome regardless.

---

## 3. Secret Handling Policy

- Never commit `.env`, `env/.env`, `.env.local`, `.env.production`, or any file containing live credentials.
- `.env.example` is the only env template that may live in the repo.
- Production secrets live in the deployment platform's secret store. They are never read from source control.
- The `data/secrets/` runtime directory is metadata-only. The current scaffold does not persist raw credentials.
- If a secret leaks into a commit, rotate the credential immediately, then file a follow-up to remove the artifact.
- Avoid printing tokens, API keys, or signed payloads in logs. Logging audit was completed during deployment handoff (see `docs/DEPLOYMENT-HANDOFF.md`).

---

## 4. Runtime State Policy

Runtime state is local-first and excluded from version control:

- `data/` — runs, approvals, deliverables, conversations, memory, brand manifests, profiles
- `memory/` — semantic memory chunks, embeddings, index
- `output/` — published artifacts
- `sessions/` — operator/session traces
- `runtime/cache/` — cache augmentation layer state
- `logs/` — structured logs
- `dist/` — compiled output
- `node_modules/`, `.npm-cache/` — dependencies

These are enforced by `.gitignore`. New runtime directories MUST be added to `.gitignore` in the same change that introduces them.

Operators are responsible for backing up local runtime state. The repository does not ship runtime data.

---

## 5. Webhook Security Contract

Approval and execution webhook handlers reject unsigned traffic by default.

Required headers:

- `x-aj-signature`
- `x-aj-timestamp`
- `x-aj-nonce`
- `x-aj-webhook-id`

Canonical signing input:

```text
${timestamp}.${nonce}.${rawBody}
```

Behavior:

- HMAC SHA-256 verification using `AJ_WEBHOOK_SECRET`
- Freshness enforcement via `AJ_WEBHOOK_MAX_SKEW_SECONDS` (default `300`)
- Replay rejection using nonce + webhook id with `AJ_WEBHOOK_REPLAY_TTL_SECONDS` (default `600`)
- Timing-safe signature comparison
- Fail-closed if verification cannot be completed or the secret is missing

Do not change webhook signing logic without an explicit security review.

---

## 6. Permission Model

Agent and tool actions pass through a permission enforcement layer. See:

- `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`
- `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`

Key rules:

- High-risk actions require approval before execution.
- Tools must be registered in the MCP secure execution layer to be callable.
- The browser execution layer (BEL) operates under its own policy engine with explicit allowlists.
- Permission denials are logged and surfaced to operators.

---

## 7. Approval Gating

Every state-mutating action moves through the approval lifecycle:

```
draft → pending_approval → approved → executed
                        ↘ rejected
                        ↘ revision_requested
```

Properties operators rely on:

- The orchestrator does not auto-execute after validation.
- The execution coordinator refuses runs that are not in `approved`.
- The publisher writes deterministic local artifacts only after execution.
- Every transition is recorded as a structured event.

Agents extending workflows MUST preserve approval gating.

---

## 8. Local vs Production Guidance

| Concern              | Local default                                   | Production guidance                                          |
|----------------------|-------------------------------------------------|--------------------------------------------------------------|
| Model provider       | Ollama at `http://localhost:11434`              | Pin `ACTIVE_MODEL_PROVIDER=ollama` and set `OLLAMA_BASE_URL` |
| Memory               | File-backed under `memory/`                     | Same; ensure path is writable and backed up                  |
| Approvals            | Local CLI/Telegram                              | Telegram with restricted user/chat IDs                       |
| Webhook secret       | Optional in dev                                 | Required; rotate periodically                                |
| Hermes bind host     | `127.0.0.1`                                     | `0.0.0.0` only when fronted by a controlled network/proxy    |
| Telemetry            | Optional                                        | Prometheus + Grafana via `monitoring/` stack                 |
| Supabase keys        | Service role for server use                     | Service role only on server side; never ship to client       |

See `docs/deployment/production-readiness.md` and `docs/deployment/staging-runbook.md` for the full configuration.

---

## 9. Dependency Scanning Policy

Automated checks (see `.github/workflows/security-audit.yml`):

- `npm audit --audit-level=high` blocks on high or critical findings.
- Secret scanning runs on every PR.
- Dependency review surfaces newly introduced risks.

Operators should also:

- Update dependencies in a dedicated PR with focused review.
- Pin major versions where stability matters more than freshness.
- Audit transitive dependencies before introducing a new direct dependency.

---

## 10. Operator Hygiene Expectations

- Use `npm run cli -- healthcheck` before promoting an environment.
- Rotate `AJ_WEBHOOK_SECRET`, Telegram bot tokens, and Stripe webhook secrets on a regular cadence.
- Never share `.env` files over chat or unencrypted channels.
- Keep approval channels (Telegram chat IDs) on a strict allowlist.
- Treat `data/secrets/` as metadata only; do not store raw credentials there even though the scaffold exists.
- Remove access promptly when contributors leave.

---

## 11. Reporting Cadence

We aim to:

- Acknowledge reports within 5 business days.
- Provide a remediation plan or status update within 30 days.
- Publish a security note in `CHANGELOG.md` for any user-visible fix.
