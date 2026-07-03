# Admin / Client Portal Split

## Purpose

Define the boundary between admin-facing and client-facing surfaces.

## Standard

Admin and client portals SHOULD be separate surfaces when the audience, permissions, or risk model differs materially.

The split SHALL preserve:

- tenant isolation
- shared identity rules
- consistent audit behavior
- clear support pathways

## Acceptance Criteria

- Client-facing screens do not expose admin-only controls.
- Admin surfaces do not create ambiguity about tenant authority.
