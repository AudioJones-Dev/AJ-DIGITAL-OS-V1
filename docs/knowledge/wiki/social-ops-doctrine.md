---
type: workflow
status: draft
sources:
  - docs/specs/social-ops-mcp-orchestration-prd.md
  - docs/architecture/social-ops-connector-architecture.md
updated: 2026-06-27
owner: agent
---

# Social Ops Doctrine

## Purpose

This doctrine defines how AJ Digital should operate AI-assisted social media and campaign management for internal brands and agency clients.

The core rule: agents can prepare, analyze, draft, and queue work, but they do not receive unsupervised authority over client-facing publishing, profile changes, community replies, or ad mutations.

## Operating Truths

Facts:

- Social operations span creative production, scheduling, organic publishing, community handling, paid media, and reporting.
- Current MCP tooling is fragmented by provider.
- Canva MCP and Pomelli are creative tools, not final publishing authorities.
- Postiz MCP can support scheduling workflows, but it is not a full community-management layer.
- Google Ads MCP is documented as read-only in its current release.
- Platform APIs and permissions change frequently.

Inferences:

- AJ Digital needs a normalized social ops doctrine before live platform wiring.
- Client and brand boundaries are the main safety issue.
- Scheduling and publishing should remain separated from creative generation.
- Organic social and paid media should remain separate connector domains.

Assumptions:

- AJ Digital will manage both internal accounts and client accounts.
- Some clients will need different approval thresholds.
- Obsidian will be the human-facing doctrine and review layer after a vault path is approved.

Risks:

- Wrong-account posting.
- Off-brand or legally risky claims.
- Publishing drafts before review.
- Cross-client asset or credential leakage.
- AI replies in a client voice without approval.
- Paid media changes with financial impact.

## Required Client Setup Before Automation

Each client or internal brand must have:

- client id
- brand id
- platform account map
- approved brand kit
- voice and tone rules
- visual guidelines
- forbidden claims
- required disclaimers
- campaign SOP
- hook library
- content loop library
- posting cadence
- approval policy
- asset storage policy
- reporting cadence
- escalation owner

## Platform Domains

### Creative

Tools:

- Canva
- Pomelli
- Codex/image generation
- future asset manager

Allowed:

- draft assets
- resize assets
- export assets for review
- search approved brand assets

Not allowed without approval:

- upload to live platform accounts
- replace profile or cover images
- use generated assets in client-facing work

### Scheduler

Tools:

- Postiz
- future scheduler connectors

Allowed:

- inspect connected accounts
- inspect platform schema
- prepare draft schedule
- report queue state

Not allowed without approval:

- schedule posts
- cancel scheduled posts
- publish immediately
- edit an approved queue item

### Organic Social

Platforms:

- Facebook
- Instagram
- LinkedIn
- TikTok
- YouTube
- X
- Threads

Allowed with guarded read:

- read account metadata
- read analytics
- read post status

Requires explicit approval:

- publish
- update bio
- update profile image
- update cover/banner
- reply to comments
- hide/delete/moderate comments
- pin posts
- change account settings

### Paid Media

Platforms:

- Meta Ads
- Google Ads
- LinkedIn Ads
- TikTok Ads

Allowed with guarded read:

- campaign performance review
- account discovery
- reporting

Requires explicit approval:

- campaign creation
- budget changes
- bid changes
- pause/resume
- creative upload
- audience changes
- publishing ads

## Approval Doctrine

Human approval is required before:

- external publishing
- social schedule activation
- profile or bio changes
- profile or cover image replacement
- comment replies or moderation
- ad campaign mutation
- any financial action
- credential or OAuth setup
- global MCP or tool config changes

Approval packets should include:

- client
- brand
- platform
- account
- action
- draft content or asset
- scheduled time
- risk classification
- rollback note
- approver
- approval timestamp

## Agent Lane Split

Claude / Obsidian lane:

- maintain doctrine
- update campaign retrospectives
- record decisions and open questions
- maintain client-specific notes
- prepare operator review briefs

Codex / repo lane:

- inspect AJ Digital OS code
- implement connector stubs
- add tests
- run validation
- report branch and working tree state
- avoid live credentials and external actions unless approved

Operator lane:

- approve gated actions
- provide credentials through approved secret channels
- decide client-specific posting authority
- review client-facing creative and copy
- approve live MCP wiring

## Campaign Workflow

1. Confirm client and brand context.
2. Confirm platform account map.
3. Build or update brand kit.
4. Define campaign brief.
5. Generate hooks and content loops.
6. Create draft assets.
7. Create draft schedule.
8. Submit approval packet.
9. Revise or approve.
10. Schedule or publish approved items.
11. Read analytics.
12. Update lessons, hooks, and SOPs.

## Minimum Campaign Brief

- campaign name
- client/brand
- offer
- audience
- platforms
- objective
- success metric
- start and end dates
- content loops
- hook angles
- asset requirements
- posting cadence
- approval owner
- reporting cadence
- risks and restrictions

## Do Not Automate Yet

- Cross-client publishing.
- Direct profile edits.
- Comment replies in client voice.
- Community moderation.
- Ad budget mutation.
- OAuth setup.
- Secret storage.
- Global MCP config edits.
- Production deployment.

## Next Doctrine Questions

- Where should the approved Obsidian vault copy live?
- Should platform calendars be per-client or global with tenant filters?
- Which internal AJ Digital accounts can use lower-friction approvals?
- Which clients require legal/claims review?
- Which connector should be wired first after stubs?
