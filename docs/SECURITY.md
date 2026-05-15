# Security — AJ Digital OS

This is the security index. Long-form policy lives in the specs and
runbooks linked below. The short version for agents is in `AGENTS.md` §4
and §7.

---

## 1. Threat model and trust boundaries

`docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` is the
authoritative threat model and trust-boundary document. It defines:

- the security principles (least privilege, zero trust for agents,
  verify before execute, secrets never in code, sandbox risky actions,
  log critical operations, human approval for destructive actions,
  client data isolation, reversible operations preferred);
- the threat model across malicious dependencies, prompt injection,
  exposed API keys, over-permissioned agents, browser session theft,
  data exfiltration, unsafe shell commands, remote repo manipulation,
  MCP server abuse, OAuth token leakage, credential reuse;
- the trust zones (local machine, repo, agent runtime, browser runtime,
  API services, cloud services, client data vault, production
  deployment, mobile dispatch / Telegram control).

## 2. Agent permission model

`docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md` defines
the L0-L5 permission ladder, the action categories (READ, WRITE,
COMMAND_SAFE/CAUTION/RESTRICTED, GIT_COMMIT, GIT_PUSH, REMOTE_CHANGE,
DEPLOYMENT, SECRET_ACCESS, SECRET_MODIFY, MCP_TOOL_CALL, BROWSER_ACTION,
CLIENT_DATA_ACCESS, DESTRUCTIVE_ADMIN), and the runtime enforcement
chain:

```
Agent Request -> Action Classifier -> Permission Policy
  -> Approval Gate -> Enforcement Engine -> Audit Logger
  -> Execute / Block / Require Approval
```

Runtime entry points:

- `src/security/permissions/enforced-execution.ts` (`executeWithEnforcement`)
- `src/security/permissions/enforcement-engine.ts`
- `src/security/permissions/action-classifier.ts`
- `src/security/permissions/permission-policy.ts`
- `src/security/permissions/approval-gate.ts`
- `src/security/permissions/audit-logger.ts`

## 3. Approval system

`docs/system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md` defines the approval
packet shape, lifecycle states, Telegram delivery contract, replay
protection, and operator decision paths. Runs cannot exit
`pending_approval` without a recorded decision.

Webhook signing contract is in `README.md` §"Webhook Security Contract"
and implemented in `src/api/`:

- HMAC SHA-256 using `AJ_WEBHOOK_SECRET`.
- Required headers `x-aj-signature`, `x-aj-timestamp`, `x-aj-nonce`,
  `x-aj-webhook-id`.
- Freshness window via `AJ_WEBHOOK_MAX_SKEW_SECONDS` (default 300).
- Nonce replay rejection via `AJ_WEBHOOK_REPLAY_TTL_SECONDS` (default 600).
- Fail-closed when verification can't complete or the secret is missing.

## 4. MCP secure execution

`docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md` defines:

- per-MCP-server capability and purpose registration,
- explicit tool allowlists,
- OAuth scope auditing,
- per-session permission logging,
- route through `src/security/mcp/mcp-secure-executor.ts`.

No MCP tool may be invoked outside the secure executor wrapper.

## 5. Client isolation and tenancy

`docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`
defines client workspaces, credential separation, retention rules,
redaction defaults, and tenant context handling. Runtime entry points:

- `src/security/tenancy/tenant-context.ts`
- `src/security/tenancy/tenant-policy.ts`

## 6. Secret hygiene

The operational rules are in `docs/ops/secret-hygiene.md`. Summary:

- Never commit `.env`, `env/.env`, real API keys, OAuth tokens, session
  cookies, `*.key`, `*.pem`, `*.p12`, `*.pfx`. All are blocked by
  `.gitignore`.
- `.env.example` is the only secret-shaped file allowed in the repo and
  must contain placeholders only.
- Treat any secret seen in terminal output, logs, screenshots, chat, or
  PR diffs as compromised. Rotate at the provider before doing anything
  else.
- Separate dev / staging / production credentials. Separate client
  credentials from internal AJ credentials.
- Webhook secrets are stored as environment variables only and never
  echoed.

CI enforcement:

- `.github/workflows/security-audit.yml` runs `npm audit --audit-level=high`
  on every PR and push to `main`.
- `.github/workflows/security-audit.yml` runs a secret-scanning job
  (`gitleaks`) on every PR and push to `main`. See the workflow for the
  current scanner choice.

## 7. Command safety

Classification lives in
`docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` §8 and is
enforced through the permission system. Restricted commands —
`rm -rf`, `del /s`, `git reset --hard`, `git push --force`,
`git branch -D`, `git push origin --delete`, production deploys, secret
rotation, database deletes — require explicit human approval every time
and are never run on agent initiative.

## 8. Logging and audit

Audit sinks:

- `src/control-plane/run-registry/run-audit-log.ts` — enforcement audit
  (JSONL).
- `src/bel/dag/dag-store.ts` — DAG run audit (JSONL).
- `src/cache/cache-audit-log.ts` — cache audit (JSONL).
- `src/core/events/event-ledger.ts` — system event ledger
  (`runtime/events/system-events.jsonl`).
- `src/attribution/attribution-tracker.ts` — MAP attribution events
  (`runtime/logs/attribution.jsonl`).

Severity model is in
`docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` §12.
Response steps: detect -> isolate -> revoke/rotate -> restore ->
document -> harden.

## 9. Disclosure process

If you believe you have found a vulnerability in AJ Digital OS:

- **Do not** open a public GitHub issue with reproduction details.
- Email the AJ Digital LLC security contact directly. Until a public
  contact channel is published, route disclosure through the repo owner
  on GitHub (private channel) with a subject line beginning
  `[security] aj-digital-os: <short title>`.
- Include: affected version or commit, reproduction steps, observed
  impact, suggested severity (Sev 1-4 per
  `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`), and any
  proof-of-concept artifacts (encrypted if sensitive).
- Expected acknowledgment: within 3 business days. Expected initial
  triage: within 7 business days.
- We will keep you informed through remediation and credit responsibly
  disclosed reports unless you ask to remain anonymous.

The root `SECURITY.md` is a stub that points back here.

## 10. Related docs

- `AGENTS.md` — agent operating contract (short form).
- `CLAUDE.md` — Claude-specific overlay.
- `docs/ops/secret-hygiene.md` — operational secret rules.
- `docs/ops/first-boot-runbook.md` — first-boot hardening.
- `docs/ops/git-sync-runbook.md` — safe git sync practices.
- `docs/operator-playbook.md` — operator response procedures.
- `docs/recovery-playbook.md` — incident recovery.
