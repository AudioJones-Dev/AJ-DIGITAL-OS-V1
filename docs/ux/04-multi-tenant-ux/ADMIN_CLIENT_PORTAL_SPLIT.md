# Admin / Client Portal Split

## Purpose

Define the boundary between admin-facing and client-facing surfaces.

## Status

DRAFT / RECOMMEND_ONLY.

## Standard

Admin and client portals SHOULD be separate surfaces when the audience, permissions, or risk model differs materially.

Client-facing context, standards references, and operating notes MAY live in AJ Digital OS.
Client implementation code SHALL live in separate repos; AJ Digital OS may only hold references or pointers to those repos.

The split SHALL preserve:

- tenant isolation
- shared identity rules
- consistent audit behavior
- clear support pathways

## Acceptance Criteria

- Client-facing screens do not expose admin-only controls.
- Client implementation code is not stored inside AJ Digital OS.
- AJ Digital OS can reference client repos without containing their code.
- Admin surfaces do not create ambiguity about tenant authority.
