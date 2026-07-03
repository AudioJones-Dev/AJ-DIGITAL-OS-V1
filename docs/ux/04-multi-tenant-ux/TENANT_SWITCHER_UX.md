# Tenant Switcher UX

## Purpose

Define the tenant switcher behavior.

## Standard

The switcher SHALL:

- show the current tenant
- show only allowed tenants
- confirm switching when the action can affect context-sensitive work
- preserve auditability of the switch

The switcher SHOULD:

- make search and scanning easy for users with many tenants
- warn before leaving an in-progress tenant-scoped task

## Acceptance Criteria

- The current tenant is always visible.
- Switching tenants cannot happen silently.
