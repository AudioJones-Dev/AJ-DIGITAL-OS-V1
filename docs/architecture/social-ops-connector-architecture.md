# Social Ops Connector Architecture

Status: Draft architecture spec
Owner: AJ Digital LLC
Updated: 2026-06-27

## Purpose

This document defines how AJ Digital OS should model agency social media operations across MCP tools, platform APIs, schedulers, creative tools, and client governance.

The architecture keeps a strict separation:

- creative tools produce assets
- scheduler tools queue or publish content
- platform connectors represent account-specific authority
- governance decides what can happen
- approvals authorize external writes
- Obsidian doctrine stores durable operating knowledge

## Current Repo Fit

AJ Digital OS already has:

- `src/connectors/connector-types.ts`
- `src/connectors/connector-registry.ts`
- `src/connectors/connector-executor.ts`
- disabled-by-default connector adapters
- connector audit JSONL support
- connector attribution hooks
- `docs/architecture/mcp-tool-architecture-spec.md`
- `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`
- `docs/knowledge/` for Obsidian-compatible doctrine

Therefore social ops should extend the existing connector and tool registry model rather than create a separate automation runtime.

## Design Principles

- Connector contract first, MCP adapter second.
- Every client account is tenant-scoped.
- External writes require explicit approval.
- Creative generation and publishing authority are separate.
- Paid ads and organic social are separate domains.
- Platform-specific constraints are data, not prompt-only instructions.
- Runtime code should start with local stubs and tests before live API calls.

## Layer Model

```txt
Operator / Agent Request
  -> Campaign Doctrine
  -> Client + Brand Context
  -> Platform Account Map
  -> Capability Classification
  -> Approval Packet
  -> Connector Executor
  -> MCP Adapter or Native API Adapter
  -> Audit + Attribution
  -> Knowledge Update / Report
```

## Connector Types

### Creative Connectors

Examples:

- Canva MCP
- Pomelli manual/export workflow
- Codex/image generation
- future Figma or asset manager

Responsibilities:

- create or edit draft assets
- resize assets for platform specs
- export image/video/document formats
- search approved brand assets
- preserve asset provenance

Restrictions:

- cannot publish directly
- cannot update platform profiles directly
- cannot bypass brand or claims review

### Scheduler Connectors

Examples:

- Postiz MCP
- future Buffer/Hootsuite/Later connector

Responsibilities:

- list connected social integrations
- inspect platform schema
- create draft posts
- schedule approved posts
- report queue state

Restrictions:

- cannot create schedules without approval
- cannot immediately publish unless the approval packet explicitly allows it
- cannot reply to comments unless the tool actually exposes that capability and approval permits it

### Organic Platform Connectors

Examples:

- Meta organic Graph API
- LinkedIn Pages API
- TikTok content posting API
- YouTube Data API
- X API
- Threads API

Responsibilities:

- publish approved content
- read organic insights
- read community interactions where allowed
- perform profile/page updates where allowed

Restrictions:

- all writes are high or restricted risk
- all comment replies/moderation are restricted risk
- account/profile updates require explicit approval and rollback notes

### Paid Media Connectors

Examples:

- Meta Ads AI Connectors or Marketing API
- Google Ads MCP/API
- TikTok Ads
- LinkedIn Ads

Responsibilities:

- read account and campaign performance
- draft paid media changes
- mutate campaigns only after approval

Restrictions:

- read-only MCPs stay read-only
- budget, bid, pause, create, upload, or publish actions require explicit approval
- financial mutations require separate operator review

## Proposed Connector IDs

| Connector ID | Provider | Domain | Initial Status | Risk |
| --- | --- | --- | --- | --- |
| `postiz` | Postiz | scheduler | stubbed, disabled | high |
| `canva` | Canva | creative | metadata only, disabled | medium |
| `meta-organic` | Meta Graph API | organic | stubbed, disabled | restricted |
| `meta-ads` | Meta Ads | paid | metadata only, disabled | restricted |
| `google-ads` | Google Ads | paid analytics | metadata only, disabled | medium |
| `linkedin-organic` | LinkedIn | organic | stubbed, disabled | restricted |
| `tiktok-organic` | TikTok | organic | stubbed, disabled | restricted |
| `youtube` | YouTube | organic/video | stubbed, disabled | restricted |
| `x-organic` | X | organic | stubbed, disabled | restricted |
| `threads` | Threads | organic | stubbed, disabled | restricted |

## Capability Vocabulary

The existing `ConnectorCapability` type is intentionally generic. For social ops, payloads should carry a second-level capability string in metadata until a stronger typed domain model is approved.

Recommended social capability metadata:

- `brand.asset.read`
- `brand.asset.create`
- `brand.asset.export`
- `social.account.list`
- `social.schema.read`
- `social.post.draft`
- `social.post.schedule`
- `social.post.publish`
- `social.post.cancel`
- `social.insights.read`
- `social.comment.read`
- `social.comment.reply`
- `social.comment.moderate`
- `social.profile.update`
- `ads.account.read`
- `ads.performance.read`
- `ads.campaign.draft`
- `ads.campaign.mutate`

## Approval Rules

| Action Family | Approval |
| --- | --- |
| Read internal doctrine | none |
| Read connected account list | guarded |
| Read analytics | guarded with tenant context |
| Generate draft creative | guarded |
| Export creative for operator review | guarded |
| Upload creative to platform | explicit approval |
| Create or edit schedule | explicit approval |
| Publish immediately | explicit approval |
| Update bio/profile/cover image | explicit approval |
| Reply, hide, delete, pin, or moderate comments | explicit approval |
| Create, pause, budget, or publish ad campaign | explicit approval |

## Data Model Requirements

Future implementation should introduce or reuse records for:

- tenant/client id
- brand id
- platform account id
- platform account display name
- platform type
- auth profile reference
- allowed actions
- approval policy reference
- brand kit reference
- campaign id
- post id
- asset ids
- scheduled time
- publish status
- source creative tool
- source prompt or source brief reference
- analytics read timestamp

Do not store raw credentials, access tokens, OAuth refresh tokens, session cookies, or private client data in Markdown docs.

## Runtime Boundary

Initial runtime connectors should be local stubs:

- no network calls
- disabled by default
- deterministic responses
- test coverage for disabled state
- test coverage for tenant requirement
- test coverage for unsupported action handling

Live adapters require a separate approval gate because they touch external platforms, credentials, and client accounts.

## MCP Boundary

MCP-backed tools should be represented as tool providers/adapters, but MCP availability should not equal execution approval.

Examples:

- Postiz MCP may expose `schedulePostTool`, but AJ Digital OS should still require approval before scheduling.
- Canva MCP may expose design generation and export, but AJ Digital OS should still require brand/claims review before client use.
- Google Ads MCP is currently documented as read-only, so it should be treated as analytics/reporting until a write-capable path is separately approved.
- Meta Ads connector behavior must be verified against the authenticated account and current Meta documentation before assuming write authority.

## Obsidian Doctrine Boundary

The Obsidian-facing doctrine should live in `docs/knowledge/wiki/social-ops-doctrine.md` until a vault path is approved.

Claude/vault lane:

- maintain doctrine
- summarize campaign lessons
- track client-specific rules
- update decision logs
- prepare operator review notes

Codex/repo lane:

- inspect code
- implement connector stubs
- add tests
- run validation
- report Git state

Operator lane:

- approve external actions
- provide credentials through approved secret channels
- review client-facing output
- approve profile, publishing, ads, and community actions

## First Implementation Pass After Docs

1. Add disabled connector adapter stubs for `postiz`, `canva`, `meta-organic`, and `google-ads`.
2. Add them to `src/connectors/adapters/index.ts`.
3. Add tests proving they are disabled by default and return local stub responses when explicitly enabled in test setup.
4. Add no live credentials, no network calls, and no package changes.

## Validation Expectations

Docs-only:

```txt
git status --short
git diff --name-only
git diff --check
```

Source implementation:

```txt
npm run typecheck
npm test
npm run build
```

## Open Risks

- Platform APIs vary by account type, region, app review state, and permission grant.
- Some MCP tools support scheduling but not comments or moderation.
- Some paid media connectors may expose write tools, but financial risk still requires human approval.
- Agentic creative generation can produce off-brand, noncompliant, or unlicensed assets.
- Social account ownership must be verified before any external action.
