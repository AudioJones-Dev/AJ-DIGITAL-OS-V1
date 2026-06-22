# AJ Digital Pricing Cost Model

## Status

Canonical pricing policy/spec for AJ Digital LLC proposal, SOW, implementation, and managed-service pricing.

## Purpose

AJ Digital separates engagement costs into clear buckets so delivery scope, operating costs, vendor ownership, implementation uncertainty, and new scope are priced and governed separately.

Client-facing explanation:

> AJ Digital separates fixed delivery work from variable operating costs, vendor costs, implementation variance, and new scope. This protects both parties from vague pricing, hidden overruns, and scope creep.

## Scope

This policy applies to AJ Digital pricing, proposal, SOW, diagnostic, implementation, and managed-retainer planning where AJ Digital is defining or reviewing client engagement costs.

This policy does not set public package prices, margin targets, payment terms, legal contract language, or vendor-specific retail pricing.

## Cost Buckets

### 1. Fixed Scope Costs

Definition: planned delivery work included in the approved scope.

Examples:

- Discovery.
- Architecture.
- Implementation labor.
- QA.
- Documentation.
- Project management.
- Training.
- Handoff.

Policy:

- Known labor, implementation, documentation, QA, training, and handoff must be priced directly.
- Fixed scope must map to approved outcomes, deliverables, acceptance criteria, and handoff expectations.
- Fixed scope must not silently include variable usage, client-owned subscription fees, or future feature expansion.

### 2. Variable Usage Costs

Definition: consumption-based costs that fluctuate with real client usage.

Examples:

- LLM tokens.
- Voice minutes.
- Telephony.
- STT/TTS.
- API calls.
- Hosting.
- Storage.
- Compute.
- Data transfer.
- Retries.

Policy:

- Variable usage costs should either be client-direct, passed through, or covered by a defined usage allowance with overage terms.
- Usage assumptions must be stated when they affect pricing, reserves, or retainer coverage.
- Proposals should separate estimated usage from fixed delivery work.

### 3. Third-Party Subscriptions

Definition: recurring tools, platforms, and vendors required to operate the system.

Examples:

- CRM licenses.
- OpenAI, Anthropic, or Gemini API accounts.
- Vapi, Retell, Bland, or Twilio.
- HubSpot or Salesforce.
- Zapier, Make, or n8n hosting.
- Monitoring tools.
- Data enrichment vendors.

Policy:

- Client-owned vendor accounts are preferred unless AJ Digital explicitly manages the vendor relationship.
- Third-party tools must be named explicitly when they are required for operation.
- Proposals must identify whether each required vendor is client-owned, AJ-managed, pass-through, optional, or future-phase.

### 4. Implementation Variance Reserve

Definition: a scoped contingency reserve for predictable unknowns inside the approved scope. It is not a feature expansion fund.

Covers:

- Latency issues.
- Compatibility fixes.
- API behavior variance.
- Schema drift.
- Integration debugging.
- Retry logic.
- Minor deployment adjustments.
- Prompt optimization within the approved use case.
- Support triage during initial deployment.

Recommended reserve bands:

| Engagement type | Reserve band |
| --- | --- |
| Strategy / Audit | 5-10% |
| Blueprint | 10% |
| Custom App Build | 10-15% |
| AI Agent Build | 12-15% |
| AI Receptionist / Voice AI | 15-20% |
| Managed Retainer | 10% internal buffer, optionally 5% disclosed |

Policy:

- Implementation variance must be scoped, capped, and tied to approved outcomes.
- The reserve may cover scope-consistent unknowns such as latency, compatibility, API behavior, integration drift, retries, and deployment adjustments.
- The reserve may not be used to absorb new features, new workflows, new integrations, major data cleanup, or materially different requirements.

### 5. Change Orders

Definition: anything materially outside the approved scope.

Triggers:

- New feature.
- New workflow.
- New integration.
- Major data cleanup.
- Expanded user roles.
- Additional training.
- Additional dashboards.
- New model or vendor requested by the client.
- Materially different business requirement.

Policy:

- New scope must trigger a change order.
- Change orders must identify the new outcome, affected systems, added costs, timeline impact, acceptance criteria, and any new vendor or usage exposure.
- A change order must not be hidden inside implementation variance or managed-retainer buffer without explicit approval.

## Internal Doctrine

- Known costs must be priced directly.
- Variable usage must be measured or passed through.
- Third-party tools must be named explicitly.
- Implementation variance must be scoped and capped.
- New scope must trigger a change order.
- No proposal should mix these buckets without explanation.

## Proposal And SOW Application

Each AJ Digital proposal or SOW should identify:

- Which deliverables belong to fixed scope.
- Which usage assumptions drive variable costs.
- Which third-party subscriptions are required, optional, or deferred.
- Whether an implementation variance reserve is included, internal, disclosed, or excluded.
- Which examples would trigger a change order.

## Acceptance Criteria

- File is documentation-only.
- Final file path is reported after creation or update.
- Existing pricing docs are not duplicated unnecessarily.
- If an existing pricing doctrine exists, update it instead of creating a conflicting duplicate.
- Final handoff reports files changed, summary, missing decisions, and recommended next step.
