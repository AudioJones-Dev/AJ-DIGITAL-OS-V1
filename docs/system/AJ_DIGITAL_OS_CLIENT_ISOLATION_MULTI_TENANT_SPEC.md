# AJ Digital OS - Client Isolation and Multi-Tenant Specification
**Version:** 1.0  
**Updated:** 2026-04-24  
**Owner:** AJ DIGITAL LLC  
**Status:** Implementation-ready scaffold

---

## 1. Purpose

The Client Isolation / Multi-Tenant layer prevents cross-client contamination and enforces tenant-aware data and tool boundaries.

---

## 2. Architecture

Runtime path:

Tenant Context Validation -> Tenant Policy Check -> Permission Enforcement -> Execution

Components:

- `tenant-types.ts`
- `tenant-context.ts`
- `tenant-policy.ts`
- integration hooks in MCP secure execution and client-facing operations

---

## 3. Core Concepts

Tenant types:

- internal_aj
- client
- sandbox
- demo

Rules:

- client actions require tenant context
- agent must be assigned to tenant
- tool must be tenant-allowed
- environment must be tenant-allowed
- restricted data cannot be used in sandbox/demo
- tenantId is required in auditable operations where client scope exists

---

## 4. Tenant Context Schema

```json
{
  "tenantId": "client-acme",
  "tenantType": "client",
  "workspaceRoot": "c:/dev/AJ-DIGITAL-OS/data/clients/acme",
  "dataClassification": "confidential",
  "allowedAgents": ["agent-ops"],
  "allowedTools": ["read_file", "browser_task"],
  "allowedEnvironments": ["dev", "staging"],
  "retentionPolicy": "90-days",
  "createdAt": "ISO timestamp"
}
```

---

## 5. Runtime Flow

1. Validate tenant context shape.
2. Check agent assignment.
3. Check requested tool authorization.
4. Check environment authorization.
5. Check data classification constraints by tenant type.
6. Return allow/block decision with reason.

---

## 6. Examples

- unassigned agent in client tenant -> blocked
- unauthorized tool in tenant -> blocked
- restricted data requested in demo tenant -> blocked
- internal AJ context with assigned agent and allowed tool -> allowed

---

## 7. Tests

Current tests cover:

- validates tenant context
- blocks unassigned agent
- blocks unauthorized tool
- blocks environment outside allowed list
- blocks restricted data in sandbox/demo
- allows valid internal AJ context

---

## 8. Limitations

- no persistent tenant registry yet
- no cross-tenant exception workflow yet
- no external IAM integration yet

---

## 9. Future Implementation Path

1. add tenant registry persistence and versioning
2. bind tenant policy to client credential vault metadata
3. add explicit cross-tenant approval workflow
4. add tenant boundary monitoring and anomaly alerts

---

## 10. Integration

With Agent Permission Enforcement:

- tenant policy acts as a precondition for execution in client-scoped operations.

With Security / Trust Layer:

- tenant isolation becomes an operational control for data separation and least privilege.
