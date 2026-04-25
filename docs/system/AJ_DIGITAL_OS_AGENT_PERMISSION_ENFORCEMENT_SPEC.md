# AJ Digital OS - Agent Permission Enforcement Specification
**Version:** 1.0  
**Updated:** 2026-04-24  
**Owner:** AJ DIGITAL LLC  
**Status:** Implementation scaffold active

---

## 1. Purpose

The Agent Permission Enforcement System is the runtime control mechanism that determines whether an agent action is allowed, blocked, or requires human approval before execution.

It exists to enforce Security / Trust Layer controls across:

- local machine operations
- repository operations
- command execution
- MCP and ACP tool usage
- browser automation actions
- remote and deployment operations
- secret and credential operations
- client data access pathways

---

## 2. Architecture

Execution chain:

Agent Request
-> Action Classifier
-> Permission Policy
-> Approval Gate
-> Enforcement Engine
-> Audit Logger
-> Execute / Block / Require Approval

Components:

- action classifier: maps intended action into category, risk, reason, and approval hint
- permission policy: maps category and permission level to allowed/blocked/requires_approval
- approval gate: resolves approval state using current approval context
- enforcement engine: orchestrates full decision path and returns final decision payload
- audit logger: writes structured decision records to JSONL for auditability

---

## 3. Permission Levels

| Level | Name | Allowed | Blocked / Restricted |
|------|------|---------|----------------------|
| 0 | Read-only | inspect docs, read files, summarize repo | file writes, terminal execution, commits, pushes, deployments |
| 1 | Draft-only | plans, patch drafts, memory-only draft artifacts | direct filesystem writes, terminal execution, commits, pushes |
| 2 | Local execution | safe local commands, lint/test/build/typecheck, local validation, non-destructive writes | git push, production deploy, secret changes, destructive commands |
| 3 | Repo write | create/edit files, commits, branches, PR prep | force push, production deploy, branch deletion, secret modify without approval |
| 4 | Remote/system write | push to remote, merge, deploy staging, remote config changes (with approval) | production deploy and secret rotation without explicit approval |
| 5 | Destructive/admin | destructive and admin operations only with explicit human approval every time | never auto-approve destructive/admin actions |

Rules:

- default agent runtime should remain Level 0 to Level 2
- Level 3 and above requires explicit scoped task intent
- Level 4 and above requires confirmation plus validation
- Level 5 requires human approval every time

---

## 4. Action Categories

- READ
- WRITE
- COMMAND_SAFE
- COMMAND_CAUTION
- COMMAND_RESTRICTED
- GIT_COMMIT
- GIT_PUSH
- REMOTE_CHANGE
- DEPLOYMENT
- SECRET_ACCESS
- SECRET_MODIFY
- MCP_TOOL_CALL
- BROWSER_ACTION
- CLIENT_DATA_ACCESS
- DESTRUCTIVE_ADMIN

---

## 5. Command Classification

Safe commands:

- git status
- git diff
- git log
- npm run lint
- npm run test
- npm run build
- npm run typecheck

Caution commands:

- npm install
- npm ci
- pip install
- git pull
- git merge
- docker compose up
- database migrations

Restricted commands:

- rm -rf
- del /s
- git reset --hard
- git push --force
- git branch -D
- git push origin --delete
- production deploy operations
- secret rotation
- database deletes
- broad chmod/chown changes

Rule:

Restricted commands require explicit human approval and a rollback plan before execution.

---

## 6. Enforcement Flow

Input example:

{
  "agentId": "claude-code",
  "actionType": "terminal_command",
  "command": "git push origin main",
  "target": "origin/main",
  "clientId": null
}

Classifier output example:

{
  "category": "GIT_PUSH",
  "risk": "high",
  "requiresApproval": true,
  "reason": "Remote push modifies shared repository state."
}

Enforcement output example:

{
  "decision": "require_approval",
  "category": "GIT_PUSH",
  "risk": "high",
  "reason": "Approval required: Approval is required before execution.",
  "auditId": "b6d1f034-ef64-4ad0-87ba-3c2f04de7b5a"
}

---

## 7. Audit Schema

Audit log path:

- logs/security/agent-action-audit.jsonl

Each record includes:

- timestamp
- agentId
- permissionLevel
- actionType
- command/tool/action target
- category
- decision
- approval status
- risk
- reason
- clientId when applicable
- auditId

---

## 8. Approval Model

Approval states:

- not_required
- required
- approved
- denied
- expired

Current scaffold:

- approval is context-based (boolean plus optional expiry and denied flag)
- no UI in this phase
- designed for future integration with Telegram/mobile dispatch workflows

Extension layer:

- approval lifecycle service and schema are defined in `src/security/approvals/`
- see `docs/system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`

---

## 9. Integration Points

### Claude Code
- classify intended actions before any execution path
- enforce permission checks before file writes, command execution, and repo mutations

### Codex
- use the same action categories and policy map to normalize decisions across agent systems

### MCP
- treat MCP tool calls as privileged execution surfaces
- pass tool name and target into classifier for risk scoring
- route MCP tool execution through `src/security/mcp/mcp-secure-executor.ts`
- enforce registration, environment allowlists, and tenant policy before execution

### ACP
- enforce permission-level and approval gating on ACP-managed sessions
- include permission level and task identity in audit records

### Browser Execution Layer
- classify browser actions into BROWSER_ACTION category
- require approval for purchase/send/delete/account-changing operations

### Telegram/Mobile Dispatch
- approval gate can consume mobile approval results for high-risk and level 5 actions

### GitHub workflows
- use policy output to decide whether actions should stop, continue, or request human review

### Client data vault
- classify client data access separately and keep audit trail with clientId
- require tenant context for client-facing operations
- enforce tenant boundaries via `src/security/tenancy/tenant-policy.ts`

---

## 9.1 Runtime Enforcement Integration

The runtime wrapper `src/security/permissions/enforced-execution.ts` is the standard integration point for execution entrypoints.

`executeWithEnforcement(request, context, executor)` behavior:

- call `enforceAgentAction`
- if decision is `block`, throw and halt execution
- if decision is `require_approval`, return approval request and do not execute
- if decision is `allow`, execute the provided executor function
- all paths remain audit-logged via enforcement flow

Current wired path:

- MCP bridge dispatch path in `src/mcp/mcp-bridge.ts`
- this covers shell command execution, browser tool execution, and filesystem MCP reads routed via bridge
- MCP secure execution path in `src/security/mcp/mcp-secure-executor.ts`
- approval requests are created by enforcement engine for gated actions

---

## 10. Current Limitations

- approval gate is context-only and not yet connected to persistent approval state
- policy map is static and does not yet support per-client or per-environment overlays
- command classification is rule-based string matching and not semantic intent-aware
- audit storage is local JSONL; no centralized immutable sink yet
- no policy versioning or migration framework yet

---

## 11. Next Implementation Priorities

1. connect approval gate to persistent approval records and expiry enforcement
2. add policy overlays by environment, client, and runtime surface
3. add immutable audit ingestion pipeline with retention and alerting
4. add runtime enforcement hooks in BEL, MCP adapter, and control-plane command paths
5. add policy simulation mode for dry-run safety validation
6. add richer command parser and semantic risk classification

---

## 12. Runtime Assumptions

- repository is TypeScript with strict mode enabled
- source modules live under src and tests live under tests
- Vitest is used for test execution
- Node.js runtime has file system access for JSONL audit writes
- no production deployment logic is included in this scaffold
