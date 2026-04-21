# Task Category And Folder Spec

## Purpose

This document defines the first internal category and folder taxonomy for future local UI work, integration routing, and organized assistant workflows.

The goal is to create a stable schema before building a richer UI.

## Default Categories

The initial category set is:

1. `research`
2. `lead-gen`
3. `content`
4. `ops`
5. `client-work`
6. `review`

These categories are also represented in the code scaffold so later channel adapters, connectors, and UI flows can default tasks into predictable buckets.

## Category Definitions

### Research

Use for:

- discovery
- analysis
- market scanning
- topic exploration

Default folder intent:

- inbox for unstructured investigation work

### Lead Gen

Use for:

- prospecting
- outbound planning
- qualification
- CRM-oriented lead support

Default folder intent:

- lead pipeline queues and campaign buckets

### Content

Use for:

- editorial planning
- writing
- publishing support
- social/content asset generation

Default folder intent:

- content studio and publishing queues

### Ops

Use for:

- recurring operations
- scheduling
- systems maintenance
- assistant/admin support

Default folder intent:

- operational queues and system tasks

### Client Work

Use for:

- client-specific scoped work
- delivery folders
- account-level coordination

Default folder intent:

- one workspace or nested folder tree per client

### Review

Use for:

- approval
- QA
- sign-off
- revision handling

Default folder intent:

- review desk and decision queues

## Folder Model

The initial folder model should support:

- stable `folderId`
- display name
- category assignment
- optional parent folder
- optional client scope
- metadata for future UI state

This supports:

- nested client folders later
- category-first navigation
- future drag/drop or queue views
- channel or connector-specific default destinations

## Recommended Folder Rules

- every task should belong to one primary category
- folders should be stable ids, not name-derived keys
- client folders should stay under `client-work` by default
- approval/revision queues should map to `review`
- exploratory assistant tasks should default to `research` unless a stronger signal exists

## Future UI Use

The future local UI should use categories and folders for:

- left-nav organization
- inbox and queue grouping
- saved views
- connector-specific destinations
- chat/session context scoping

This patch only defines the schema and taxonomy. It does not implement a task board or folder UI.
