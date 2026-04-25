# AJ Digital OS - MCP Secure Execution Layer Specification
**Version:** 1.0  
**Updated:** 2026-04-24  
**Owner:** AJ DIGITAL LLC  
**Status:** Implementation-ready scaffold

---

## 1. Purpose

The MCP Secure Execution Layer ensures every MCP tool call is classified, policy-scoped, permission-checked, tenant-aware, and audited before execution.

No MCP tool should execute directly.

---

## 2. Architecture

Runtime path:

MCP Request -> Tool Policy Lookup -> Tenant Validation -> Permission Enforcement -> Approval Gate -> Execute/Block

Components:

- `mcp-security-types.ts`
- `mcp-tool-policy.ts`
- `mcp-secure-executor.ts`
- integration in `src/mcp/mcp-bridge.ts`

---

## 3. Core Concepts

Rules:

- unregistered tools are blocked by default
- policy includes risk, permissions, environment constraints, and tenant requirements
- privileged tool calls require approval
- tenant-required tools fail without tenant context
- all tool calls still pass through `enforceAgentAction`

---

## 4. Tool Policy Schema

```json
{
  "serverName": "mcp-bridge",
  "toolName": "browser_task",
  "category": "BROWSER_ACTION",
  "risk": "high",
  "allowedPermissionLevels": [2, 3, 4, 5],
  "requiresApproval": true,
  "allowedEnvironments": ["local", "dev", "staging"],
  "requiresTenantContext": true,
  "allowedTenantIds": ["optional"],
  "blockedTenantIds": ["optional"],
  "oauthScopes": ["browser:automation"]
}
```

---

## 5. Runtime Flow

1. Resolve MCP tool policy by `serverName/toolName`.
2. Block if missing policy.
3. Validate permission level and allowed environment.
4. Enforce tenant context requirements and tenant policy.
5. Call `executeWithEnforcement` to invoke Agent Permission Enforcement.
6. Return `executed`, `blocked`, or `approval_required`.

---

## 6. Examples

- unknown MCP tool -> blocked
- low-risk registered read tool -> executed
- browser tool without tenant context -> blocked
- privileged browser task without approval -> approval_required

---

## 7. Tests

Current tests cover:

- blocks unregistered MCP tool
- allows registered low-risk tool
- requires approval for privileged MCP tool
- blocks tenant-required tool without tenant context
- blocks tool outside allowed environment

---

## 8. Limitations

- static in-memory policy map
- no remote policy sync
- OAuth scopes documented but not validated against provider runtime yet

---

## 9. Future Implementation Path

1. policy source from signed config with versioning
2. dynamic policy reload with safe fallback
3. per-client MCP policy overlays
4. immutable MCP audit sink integration

---

## 10. Integration

With Agent Permission Enforcement:

- `mcpSecureExecute` calls `executeWithEnforcement` and inherits allow/block/approval decisions.

With Security / Trust Layer:

- MCP is treated as a privileged execution surface with explicit runtime guardrails.
