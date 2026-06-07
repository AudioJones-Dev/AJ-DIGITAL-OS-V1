# AJ Digital OS Auth And Model Cost Policy

## Problem

AJ Digital OS needs a clear boundary between subscription/session-based AI tools and paid API-backed automation. Without that boundary, interactive Claude Code or Codex work can drift into unnecessary API loops, creating avoidable cost, secret exposure, and unclear ownership between local agents, MCP tools, n8n routing, and production workflows.

## Desired Outcome

AJ Digital OS defaults to OAuth/session-first access for human-in-the-loop work and reserves paid APIs for explicit backend automation cases.

The operating posture is:

- OAuth/session-first
- MCP-controlled
- API-sparing
- A2A-ready
- Slack-thread-based when a messaging surface is introduced
- vault-approved before durable workflow or policy changes

## Success Criteria

- Interactive Claude Code uses Claude Pro/Max login allocation, not Anthropic API keys by default.
- Interactive Codex uses ChatGPT account sign-in, not OpenAI API keys by default.
- Slack, GitHub, Google Workspace, HubSpot, and similar account integrations prefer OAuth or app installation flows.
- MCP remains the controlled tool-access layer for files, commands, browser automation, and other privileged local capabilities.
- n8n remains a router/orchestrator and does not become the intelligence layer.
- Paid model APIs require explicit non-interactive execution context and explicit billing approval.
- API keys remain server-side secrets for background jobs, production automations, and client-facing workflows only.

## Scope

This policy applies to:

- model routing
- browser automation routing
- connector auth classification
- env-template guidance
- MCP tool access policy
- n8n webhook and orchestration usage
- future Slack/GitHub/Google/HubSpot connector work

## Out Of Scope

- Implementing live OAuth flows
- Implementing A2A handoff
- Replacing Claude Code, Codex, Hermes, OpenClaw, or MCP
- Refactoring Hermes core logic
- Refactoring existing API routes
- Moving or rotating secrets
- Changing production deployment behavior

## Constraints

- Do not use paid model APIs as the default route for interactive coding, planning, chat, or review.
- Do not require `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for default local development.
- Do not store raw OAuth tokens, refresh tokens, API keys, session cookies, or bot tokens in source-controlled files.
- Do not bypass MCP permission gates for local filesystem, shell, or browser work.
- Do not let n8n choose model intelligence directly; n8n routes work to controlled execution surfaces.
- Do not introduce Firebase.

## Existing Assets And Prior Work To Inspect

- `src/model-routing/route-policy.ts`
- `src/model-routing/model-router.ts`
- `src/model-routing/result-shape.ts`
- `src/core/config.ts`
- `src/services/runtime/runtime-healthcheck.ts`
- `src/security/mcp/mcp-tool-policy.ts`
- `src/mcp/mcp-bridge.ts`
- `src/services/n8n-client.ts`
- `src/connectors/`
- `.env.example`
- `docs/architecture/integrations-and-secrets-spec.md`
- `docs/architecture/api-integration-and-model-profile-spec.md`
- `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`

## Policy

### 1. Subscription And OAuth First

Use subscription login, OAuth, app installation, local session, or MCP before using a direct API key.

Preferred defaults:

| Surface | Preferred access |
| --- | --- |
| Claude Code | Claude Pro/Max login |
| Codex | ChatGPT account sign-in |
| Slack | OAuth app installation |
| GitHub | GitHub App or OAuth |
| Google Workspace | OAuth |
| HubSpot | OAuth |
| Obsidian/local vault | Local filesystem through allowed local access or MCP |
| n8n | Local/self-hosted router with scoped webhook/MCP credentials |

### 2. Paid APIs Are Explicit Backend Automation

Paid model APIs are allowed only when all of the following are true:

- the execution mode is non-interactive
- the caller sets `apiBillingAllowed=true`
- the caller provides or records a clear billing reason
- the workflow is a background job, production workflow, or client-facing automation
- required secrets are present through approved server-side secret handling

Approved examples:

- nightly digest generation
- Slack webhook processing where no subscription session can participate
- background report generation
- CRM updates
- calendar sync
- production SaaS workflows
- client-facing automations

Disallowed defaults:

- every Slack reply
- every internal agent tag
- every long brainstorming thread
- normal Claude Code work
- normal Codex work
- local repo review or planning

### 3. Router Enforcement

The model router must default interactive work to local, deterministic, or session-mediated execution.

Cloud API routes such as `openai` and `perplexity` require:

```ts
constraints: {
  executionMode: "background_job" | "production_workflow" | "client_facing_automation",
  apiBillingAllowed: true,
  apiBillingReason: "specific backend automation reason"
}
```

If these flags are absent, cloud API routes must downgrade to local/deterministic execution or block explicit cloud-provider requests.

### 4. MCP Role

MCP is the controlled tool-access layer. It should expose scoped capabilities such as file reads, safe commands, browser tasks, and approved connector actions. MCP calls are privileged execution surfaces and must remain policy checked.

### 5. n8n Role

n8n is a router/orchestrator. It may receive webhooks, dispatch workflow steps, and call controlled endpoints. It should not become the reasoning layer and should not independently route paid model calls without the same model-cost policy.

### 6. A2A Role

A2A is a later formal agent-to-agent delegation standard. It should not be used to bypass operator approval, MCP permissions, model-cost policy, or audit requirements.

## Proposed Plan

1. Document this policy as the durable source of truth.
2. Update env-template comments so API keys are clearly backend-automation-only.
3. Add explicit routing flags for execution mode and paid API allowance.
4. Change model-router defaults so interactive work does not route to paid APIs by default.
5. Classify GitHub as GitHub App/OAuth-oriented instead of a generic API-key connector.
6. Preserve n8n and MCP as separate layers with their existing responsibilities.

## Risks

- Local model output may be lower quality for planner or structured-output tasks until local prompting and validation mature.
- Existing scripts that assumed OpenAI defaults may need explicit paid API constraints.
- Background automation could fail closed until callers add `apiBillingAllowed=true` and a non-interactive execution mode.
- Future OAuth implementation still needs secure token storage and refresh handling.

## Open Questions

- Which jobs should be allowlisted for paid API use first?
- Should API billing reasons be audit-log required before production enablement?
- Should each brand/client have its own API-cost budget and provider allowlist?
- Should Slack thread routing use a separate approval mode before paid API dispatch?
