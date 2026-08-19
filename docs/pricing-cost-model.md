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

## Client Usage And Cost Contingency Standard

### Objective

AJ Digital must not absorb open-ended API, model, telephony, compute, storage, data, or other consumption-based vendor exposure inside a fixed client fee unless that exposure is explicitly modeled, bounded, and approved.

The standard exists to preserve three things simultaneously:

1. Client price transparency.
2. Service continuity under normal usage.
3. Protection against margin erosion, vendor repricing, abnormal usage, and runaway automation.

### Billing Ownership Hierarchy

Use the following order unless the engagement has a documented reason to deviate:

1. **Client-direct billing** — the client owns the vendor account and pays the vendor directly.
2. **AJ-managed pass-through** — AJ Digital pays the vendor and bills the attributable client cost under explicit pass-through terms.
3. **Bundled allowance** — AJ Digital includes a defined quantity of usage inside a fixed or recurring fee and applies documented overage treatment above the allowance.
4. **AJ-absorbed usage** — permitted only when the expected cost is immaterial, bounded, deliberately priced into the engagement, and approved.

Client-direct billing is preferred when it improves portability, ownership, security, auditability, or long-term client control.

### Required Usage Model Before Pricing

Before a proposal or SOW treats variable usage as bundled or AJ-managed, estimate the applicable cost drivers.

At minimum, model the material dimensions that apply:

- Provider and service.
- Billing unit.
- Expected monthly volume.
- Expected low, baseline, and high usage cases.
- Retry and failure overhead where the vendor still charges for failed or repeated work.
- Peak or burst behavior.
- Taxes, carrier fees, data-transfer fees, or other mandatory surcharges when material.
- Any vendor minimum commitment.
- Any known currency or regional pricing exposure.

Do not base a durable client price on promotional credits, temporary free tiers, startup credits, or non-contractual discounts.

### Usage Allowances

If usage is included in a package or retainer, the proposal or SOW must define:

- The metric being measured.
- The included quantity or budget.
- The measurement period.
- Whether unused allowance rolls over.
- What happens when the allowance is exceeded.
- Whether the overage is automatic, capped, throttled, or subject to approval.
- Which vendor or system is the authoritative usage source.

Allowance units should map as directly as practical to auditable vendor or platform usage rather than to vague terms such as "reasonable use" or "unlimited AI."

### Overage Treatment

When client usage exceeds the included allowance, use one of these explicit treatments:

- Client pays the vendor directly for incremental usage.
- AJ Digital passes through the attributable incremental cost plus the engagement-defined administration or management charge.
- AJ Digital applies a pre-agreed overage rate derived from the underlying cost model.
- Non-critical consumption is paused or throttled until client approval.

Do not silently absorb sustained overage as part of the base fee.

All administration percentages, dollar fees, minute rates, token rates, or other commercial parameters are engagement-level values and are not set by this canonical policy.

### Usage Thresholds And Notifications

For AJ-managed or bundled variable usage, configure thresholds where the underlying systems allow it.

Default operating pattern:

- **Forecast / baseline:** establish expected usage before launch.
- **Early warning:** notify or surface a cost alert around 80% of the defined allowance or budget.
- **Allowance reached:** at 100%, apply the contracted overage, cap, approval, throttle, or pause behavior.
- **Material spike:** require operator review when actual or projected cost materially exceeds the approved baseline or monthly cost ceiling.

The exact threshold may be changed when a vendor bills in large indivisible blocks, has delayed metering, or when interruption would create unacceptable business risk.

### Abnormal Usage And Runaway-Cost Protection

Systems with agentic, recursive, retry-heavy, telephony, scraping, enrichment, or high-volume API behavior must have a cost-containment strategy appropriate to the service.

Possible controls include:

- Per-tenant spend ceilings.
- Per-workflow execution caps.
- Per-call or per-session duration limits.
- Token or model budget limits.
- Retry ceilings and backoff.
- Concurrency limits.
- Daily or monthly provider budgets.
- Rate limits.
- Queue limits.
- Automatic downgrade to a lower-cost model when approved by the product design.
- Human approval before high-cost actions.
- Pause or kill-switch behavior for non-critical workloads.

Critical client-facing services must define graceful-degradation behavior before using a hard stop that could interrupt customer communication or operations.

### Vendor Price Change Contingency

Third-party pricing is not controlled by AJ Digital.

If a vendor changes API, telephony, model, infrastructure, subscription, carrier, or other underlying pricing materially, AJ Digital must not be required to preserve an obsolete cost assumption indefinitely.

The engagement must therefore identify a repricing or reconfiguration path, which may include:

- Passing the changed vendor cost through to the client.
- Adjusting the included usage allowance.
- Adjusting the overage rate.
- Migrating to an approved alternative vendor or model.
- Redesigning the workflow to reduce consumption.
- Requiring a change order when the vendor change materially changes architecture, scope, or service levels.

Vendor repricing must be separated from discretionary AJ Digital scope expansion.

### Margin-Erosion Trigger

This policy does not establish a numeric gross-margin target, but variable vendor exposure must not make an engagement structurally unprofitable without an explicit strategic exception.

Trigger a pricing review when any of the following is true:

- Actual usage persistently exceeds the modeled high case.
- Vendor prices materially increase.
- Retry or failure behavior creates meaningful unplanned consumption.
- The client adds volume, locations, users, channels, workflows, or data sources that materially increase variable cost.
- The cost of an AJ-managed vendor relationship becomes disproportionate to the administration or management fee.
- A bundled allowance is repeatedly exceeded.

A pricing review may result in allowance changes, pass-through conversion, rate changes, architecture changes, a change order, or migration to client-direct billing.

### Cost Attribution And Observability

Where technically practical, variable costs must be attributable to the client or tenant that caused them.

Track applicable dimensions such as:

- Client or tenant.
- Provider.
- Model or service.
- Workflow or capability.
- Usage quantity.
- Estimated cost.
- Actual billed cost when available.
- Retries or failed attempts that incurred cost.
- Credits or adjustments.
- Time period.

Shared infrastructure that cannot be attributed precisely should use a documented allocation method rather than arbitrary assignment.

Cross-client usage must not be blended in a way that prevents AJ Digital from detecting an unprofitable tenant or abnormal consumption pattern.

### Client Usage Review Cadence

For new managed deployments with meaningful variable cost:

- Establish the pre-launch baseline.
- Review actual usage after the first complete billing cycle.
- Recalibrate assumptions after sufficient live data exists, commonly within the first 90 days.
- Continue periodic review for material vendor-price, usage-pattern, or scope changes.

The review cadence may be tighter for voice AI, high-volume agents, data enrichment, scraping, or other workloads with volatile unit economics.

### New Vendor Or Model Introduction

Adding or switching to a materially different provider, model, or usage-priced service requires a cost review before it becomes part of the client production design.

The review should identify:

- Unit economics.
- Billing ownership.
- Expected volume.
- Failure and retry cost.
- Portability or lock-in implications.
- Cost observability.
- Usage controls.
- Effect on the client allowance or pass-through model.

A lower advertised unit price alone is not sufficient reason to switch vendors if the change increases implementation, reliability, governance, or operational cost.

### Proposal And SOW Minimum Disclosure

When variable usage is material, the proposal or SOW should state:

- Which costs are fixed.
- Which costs are variable.
- Which third-party vendors are required.
- Who owns and pays each vendor account.
- Any included allowance.
- The overage treatment.
- The applicable usage cap or approval behavior.
- The vendor-price-change contingency.
- The assumptions used to estimate usage.
- Any client responsibilities that materially affect consumption.

Do not advertise "unlimited" usage unless the underlying economics are genuinely bounded and the term is contractually defined.

### Contingency Decision Matrix

| Condition | Default treatment |
| --- | --- |
| Normal usage within allowance | Continue service; no pricing action. |
| Usage approaches allowance | Surface warning and forecast likely overage. |
| Usage exceeds allowance | Apply documented overage, approval, cap, throttle, or client-direct billing treatment. |
| Abnormal spike or suspected runaway loop | Contain non-critical consumption, inspect cause, preserve critical service where safe, and notify the operator. |
| Vendor materially raises price | Recalculate economics and apply the engagement's pass-through, allowance, migration, or repricing path. |
| Client materially expands scope or volume | Re-estimate usage and issue a pricing review or change order when required. |
| Repeated margin erosion | Reprice, redesign, convert billing ownership, or discontinue the uneconomic configuration. |
| Usage cannot be attributed reliably | Improve observability or use a documented allocation method before scaling the shared cost model. |

## Internal Doctrine

- Known costs must be priced directly.
- Variable usage must be measured or passed through.
- Third-party tools must be named explicitly.
- Implementation variance must be scoped and capped.
- New scope must trigger a change order.
- No proposal should mix these buckets without explanation.
- No fixed fee should contain unbounded vendor exposure by accident.
- Client-direct vendor billing is preferred when practical.
- Bundled usage requires a measurable allowance and explicit overage treatment.
- Vendor repricing must have a documented contingency path.
- Abnormal usage must have cost-containment controls.
- Variable cost should be attributable by client or tenant where technically practical.
- Pricing must be reviewed when live unit economics diverge materially from the approved model.

## Proposal And SOW Application

Each AJ Digital proposal or SOW should identify:

- Which deliverables belong to fixed scope.
- Which usage assumptions drive variable costs.
- Which third-party subscriptions are required, optional, or deferred.
- Whether an implementation variance reserve is included, internal, disclosed, or excluded.
- Which examples would trigger a change order.
- Who owns billing for material usage-priced vendors.
- Whether usage is client-direct, pass-through, bundled, or intentionally absorbed.
- Included usage allowances and overage treatment when applicable.
- Usage thresholds, caps, or approval behavior when applicable.
- The vendor-price-change contingency when variable vendor pricing is material.

## Acceptance Criteria

- File is documentation-only.
- Final file path is reported after creation or update.
- Existing pricing docs are not duplicated unnecessarily.
- If an existing pricing doctrine exists, update it instead of creating a conflicting duplicate.
- Variable usage exposure is explicitly separated from fixed scope.
- Billing ownership and overage treatment are defined for material consumption-based costs.
- Vendor price changes and abnormal usage have an explicit contingency path.
- Numeric vendor rates and engagement-specific commercial parameters are not hard-coded into canonical doctrine.
- Cost attribution and usage review requirements are stated.
- Final handoff reports files changed, summary, missing decisions, and recommended next step.
