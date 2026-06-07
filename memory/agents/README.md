# Agent Memory

## Purpose

Stores agent profiles, lane boundaries, capabilities, constraints, and handoff rules.

## What Belongs Here

- Agent role definitions
- Tool access constraints
- Read/write permissions
- Delegation boundaries
- Known failure modes by agent type

## What Does Not Belong Here

- Provider secrets or API keys
- Unbounded conversation history
- Client memory that belongs in `memory/clients/`
- Runtime execution logs

## Write Access

Human operators approve agent profiles. Agents may propose profile updates when a capability or boundary changes.

## Agent Read Access

Agents may read their own profile and relevant handoff rules through the Memory Router.

## Promotion Path

Approved profiles become canonical `agents` and `memory_records` rows once structured memory is implemented.
