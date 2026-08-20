# UX Documentation Standard

## Purpose

Define how UX doctrine documents are written for AJ Digital OS.

## Standard

UX documentation SHALL:

- describe the intended user or operator outcome
- define the tenant and role context
- state the visible state model
- specify approval, audit, and escalation behavior where relevant
- include acceptance criteria
- separate implemented facts from proposed doctrine
- use SHALL, MUST, SHOULD, and MAY for normative requirements

UX documentation SHALL NOT:

- assume a single-tenant system
- omit loading, empty, error, permission, or partial-success states
- hide agent actions that can affect client outcomes
- replace policy language with vague visual direction

## Required Sections

Every major UX doc SHOULD include:

- purpose
- scope
- doctrine
- state model
- acceptance criteria
- non-compliant patterns
- open questions
- source references

## Acceptance Criteria

- Another agent can implement a screen from the document without inventing missing behavior.
- Tenant context and role boundaries are explicit when relevant.
- The document names the failure states that matter.
- The document names the audit or approval implications when relevant.

## Source References

- [`../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md`](../../specs/AJ_DIGITAL_MULTI_TENANT_CRM_MODULE_SPEC.md)
- [`../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`](../../system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md)
- [`../../system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`](../../system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md)
