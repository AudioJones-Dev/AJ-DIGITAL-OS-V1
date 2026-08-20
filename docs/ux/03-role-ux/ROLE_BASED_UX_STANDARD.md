# Role-Based UX Standard

## Purpose

Define how role-based interface behavior should work in AJ Digital OS.

## Standard

Role-based UX SHALL:

- show only actions the role can use
- explain why unavailable actions are blocked or hidden when relevant
- preserve a visible tenant context for all privileged actions
- separate operator, admin, staff, and agent surfaces where necessary

Role-based UX SHOULD:

- reduce choice overload
- surface role-specific next actions
- prevent permission ambiguity

## Acceptance Criteria

- A role can tell what it can do from the UI.
- A blocked action has a visible reason when the reason matters.
- Role behavior is consistent across screens.
