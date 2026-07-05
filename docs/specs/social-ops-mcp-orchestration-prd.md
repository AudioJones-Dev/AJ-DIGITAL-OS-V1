# Social Ops MCP Orchestration PRD

Status: Draft build spec
Owner: AJ Digital LLC
Updated: 2026-06-27
Scope: Agency social media operations, client campaign management, internal brand publishing, and guarded MCP/connector orchestration.

## Problem

AJ Digital manages internal and client marketing work across many surfaces: YouTube, Meta, LinkedIn, TikTok, X, Threads, Canva, Pomelli, Codex/image generation, brand kits, SOPs, hooks, loops, schedules, and reporting. Current MCP and platform tooling is fragmented. A single "meta social manager" does not cover the whole workflow safely.

The risk is operational sprawl: assets, approvals, schedules, platform credentials, analytics, and client-specific brand rules can drift across tools without one governed doctrine.

## Desired Outcome

Create a governed Social Ops layer inside AJ Digital OS that can plan, create, approve, schedule, publish, and analyze client and internal campaigns through normalized connectors and MCP-backed tools.

The first implementation should be doctrine-first and connector-aware:

- define client and brand operating rules before live posting
- normalize platform account ownership and permissions
- route creative tools separately from scheduler and publishing tools
- require human approval for external writes, profile edits, publishing, ad mutations, and community actions
- preserve tenant/client boundaries
- prepare Obsidian-compatible doctrine for human review

## Success Criteria

- Each client has a brand kit, guideline set, SOP, platform map, approval policy, and campaign schedule before automation is allowed.
- Social publishing and ads work are treated as separate capabilities.
- Creative generation tools never publish directly.
- Schedulers can draft or queue posts, but publishing remains approval-gated.
- External platform writes require tenant context, actor context, and explicit approval.
- Connector metadata records risk level, auth type, capabilities, and supported actions.
- Obsidian doctrine can be maintained from `docs/knowledge/wiki/social-ops-doctrine.md`.
- No secrets, OAuth tokens, platform credentials, or client-private data are stored in docs.

## Scope

Approved first-pass docs scope:

```txt
docs/specs/social-ops-mcp-orchestration-prd.md
docs/architecture/social-ops-connector-architecture.md
docs/knowledge/wiki/social-ops-doctrine.md
docs/knowledge/index.md
docs/knowledge/log.md
```

Future implementation scope, after approval:

```txt
src/connectors/adapters/
  postiz.connector.ts
  canva.connector.ts
  meta-organic.connector.ts
  meta-ads.connector.ts
  google-ads.connector.ts
  linkedin.connector.ts
  tiktok.connector.ts
  youtube.connector.ts
  x.connector.ts
  threads.connector.ts
tests/connectors/
docs/architecture/
docs/knowledge/wiki/
```

## Out Of Scope

- Installing or enabling MCP servers.
- Editing global Codex, Claude, or MCP config.
- OAuth setup or credential handling.
- Live publishing, profile edits, ad changes, comment replies, or community moderation.
- Runtime connector execution.
- Package installs or lockfile changes.
- Public marketing copy changes.
- Production deployment.

## Constraints

- Follow root `AGENTS.md`, `docs/OPERATING_POLICY.md`, and `docs/REPO_SAFETY_POLICY.md`.
- Treat all social accounts as client or internal tenant resources.
- Use existing `src/connectors/` patterns before creating new runtime surfaces.
- Do not bypass approval, tenant, attribution, or audit paths.
- Do not store raw platform payloads unless a later retention policy explicitly permits it.
- Do not store credentials in docs, config, examples, logs, or runtime JSONL.
- Do not claim a platform capability exists until verified against current official documentation or an authenticated account.

## Existing Assets Inspected

- `docs/architecture/integrations-and-secrets-spec.md`
- `docs/architecture/mcp-tool-architecture-spec.md`
- `docs/architecture/brand-context-system-spec.md`
- `docs/architecture/deliverable-approval-lifecycle-spec.md`
- `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`
- `docs/knowledge/README.md`
- `src/connectors/connector-types.ts`
- `src/connectors/connector-registry.ts`
- `src/connectors/connector-executor.ts`
- `src/connectors/adapters/*`
- `tests/connectors/connector.test.ts`

## External Source Snapshot

Checked 2026-06-27:

- Postiz MCP exposes tools for integration listing, schema lookup, post scheduling, image generation, and video generation. Its docs state comment reads/replies are not currently exposed through MCP.
- Canva MCP exposes design generation, editing, search, asset and brand management, export, resizing, and comments through a remote MCP server.
- Google Ads MCP is currently documented as read-only for account discovery and performance reporting.
- Meta Graph API supports Facebook Page and Instagram professional account publishing/management through official APIs, but permission and app-review requirements must be verified per account.
- Meta Ads AI Connectors appear ads-focused. Treat them separately from organic social publishing and community management.
- Pomelli is a Google Labs AI marketing tool for on-brand campaign assets. Treat it as creative generation/export, not a scheduling or publishing authority.

References:

- https://docs.postiz.com/mcp/introduction
- https://www.canva.dev/docs/mcp/
- https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server
- https://developers.facebook.com/documentation/pages-api
- https://developers.facebook.com/documentation/instagram-platform/content-publishing
- https://support.google.com/labs/answer/16715058

## Proposed Capability Model

### Creative Capabilities

- brand kit read
- asset search
- design generation
- design resize
- image generation
- video generation
- export asset

Default approval: guarded for drafts, explicit approval before external upload to a client account.

### Scheduler Capabilities

- list connected social accounts
- inspect platform-specific posting schema
- create draft post
- schedule post
- cancel scheduled post
- read queue status

Default approval: explicit approval for schedule, cancel, immediate publish, or edits to approved queue items.

### Organic Platform Capabilities

- publish post
- read insights
- read comments
- reply to comment
- hide/delete/moderate comment
- update page/profile bio
- update profile image
- update cover/banner image

Default approval: explicit approval for every external write or moderation action.

### Paid Media Capabilities

- read campaign performance
- inspect account structure
- create campaign draft
- update budget
- pause/resume entity
- upload creative
- publish ad entity

Default approval: read-only can be guarded; all mutations require explicit approval.

## Workflow

1. Client intake creates or confirms brand kit, platform map, SOP, claims constraints, and approval policy.
2. Campaign brief defines offer, audience, hooks, content loops, platforms, cadence, and measurement plan.
3. Creative tools generate draft assets from the approved brand kit.
4. Scheduler connector creates drafts or proposed schedule entries.
5. Operator reviews deliverables and approves, rejects, or requests revision.
6. Approved items are scheduled or published through the connector layer.
7. Analytics connectors read performance and produce a post-run report.
8. Doctrine updates capture lessons, changed hooks, platform constraints, and client-specific rules.

## Risk Classification

| Capability | Risk | Reason |
| --- | --- | --- |
| Read brand kit | Low | Internal/reference only |
| Generate draft creative | Medium | Brand and claims risk |
| Export/upload asset | High | Client-visible asset movement |
| Schedule post | High | External customer-facing action |
| Publish post | Restricted | External customer-facing action |
| Update bio/profile/cover | Restricted | Brand identity mutation |
| Reply/moderate community | Restricted | External communication in client voice |
| Read analytics | Medium | Client/private performance data |
| Mutate ad campaign | Restricted | Financial and public distribution impact |

## Proposed Plan

Phase 0: Doctrine and PRD.

- Create this PRD.
- Create connector architecture.
- Create Obsidian-ready doctrine page.
- Update knowledge index and log.

Phase 1: Stub connector specs.

- Add disabled-by-default connector definitions for social ops providers.
- Add local stubs only.
- Add tests that prove disabled, tenant-gated, and approval-gated behavior.

Phase 2: MCP adapter metadata.

- Represent Postiz, Canva, Meta Ads, and Google Ads as MCP-backed tool providers where appropriate.
- Keep MCP adapter metadata separate from connector execution authority.

Phase 3: Approval packet and deliverable routing.

- Create approval packets for creative assets, schedules, posts, and ads.
- Attach platform, account, campaign, client, and risk metadata.

Phase 4: Live connector wiring.

- Only after explicit approval.
- Use secret references, not raw credentials.
- Start with read-only analytics before external writes.

## Risks

- Platform APIs and MCP tool surfaces change frequently.
- Meta organic management, Meta ads management, and community moderation have different permission and compliance paths.
- Multi-client social ops can cross tenant boundaries if account maps are weak.
- AI-generated creative can violate brand, legal, platform, or client claims constraints.
- Scheduling tools may support a platform generally but not every content type.
- Pomelli and Canva outputs still require review before client-visible use.

## Open Questions

- Which platform should be wired first: Postiz scheduler, Canva creative, Meta organic, or analytics-only connectors?
- Should client social accounts be represented under CRM client records, brand manifests, or a new social account registry?
- What is the approved Obsidian vault path for doctrine sync?
- Should each client have one campaign calendar per platform or one normalized calendar with platform variants?
- Which actions can ever be auto-approved for internal AJ Digital accounts?
- Which clients require separate legal/claims review before posting?

## Acceptance Criteria For Next Implementation Pass

- No external connector is enabled by default.
- Tests prove social connectors cannot run when disabled.
- Restricted actions require tenant context and approval metadata.
- Local stubs do not call external platforms.
- Docs identify every live credential needed by variable/reference name only.
- Final handoff includes changed files, validation, risks, and explicit next operator decision.
