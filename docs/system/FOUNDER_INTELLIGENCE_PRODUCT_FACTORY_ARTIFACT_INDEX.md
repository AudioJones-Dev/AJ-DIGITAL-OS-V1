# Founder Intelligence Product Factory Artifact Index

**Type:** Artifact index and control document
**Status:** Draft for approval
**Owner:** Audio (Tyrone Alexander Nelms) - AJ Digital LLC
**Location:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_ARTIFACT_INDEX.md`
**Companion doctrine:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Companion playbook:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Template directory:** `docs/system/templates/`

---

## 1. Purpose

This document is the canonical artifact index for the Founder Intelligence Product Factory.

It controls how AJ Digital selects, sequences, and approves the reusable artifact templates that turn the framework into an operating delivery system. It is not a new doctrine and does not replace the Founder Intelligence Product Factory doctrine or playbook.

Use this index to determine:

- which artifact template is required by each framework layer;
- when the artifact is used;
- which decision gate the artifact supports;
- what inputs are required;
- what outputs are expected;
- who approves the artifact;
- what downstream work depends on it.

## 2. Source Documents

| Source | Path | Role |
| --- | --- | --- |
| Founder Intelligence Product Factory doctrine | `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md` | Defines the framework, layers, doctrine, and decision gates |
| Founder Intelligence Product Factory playbook | `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md` | Defines execution workflow, checkpoints, dispatch prompts, and definition of done |
| Template directory | `docs/system/templates/` | Stores reusable artifact templates used to execute the framework |

Source-of-truth rule:

```txt
Doctrine defines the framework.
Playbook defines execution.
Templates define repeatable outputs.
This index controls artifact selection and sequencing.
```

## 3. Artifact Usage Order

Use artifacts in the same order as the Product Factory layers unless a documented operator decision narrows the scope.

```txt
1. Opportunity Brief
2. Market Gap Analysis
3. Demand Validation Report
4. Founder Intelligence Diagnostic
5. Revenue Leak Assessment
6. Product Requirements Document
7. Architecture Specification
8. System Design Document
9. Operational Readiness Review
10. Growth Intelligence Review
```

Operational rule:

```txt
No downstream artifact should be created from assumptions that an upstream artifact was supposed to validate.
```

## 4. Layer-To-Artifact Map

| Framework Layer | Required Template | When Used | Required Inputs | Expected Outputs | Approval Owner | Downstream Dependency |
| --- | --- | --- | --- | --- | --- | --- |
| Opportunity Intelligence | `OPPORTUNITY_BRIEF_TEMPLATE.md` | At the start of any opportunity, product, system, automation, agent, or diagnostic initiative | Candidate problem, target segment, initial evidence, known alternatives | Opportunity summary, target segment, evidence, demand signals, risks, recommendation | Founder / operator | Market Gap Analysis and Demand Validation Report |
| Opportunity Intelligence | `MARKET_GAP_ANALYSIS_TEMPLATE.md` | When market, competitor, review, or acquisition-market evidence is needed before validation | Opportunity Brief, competitor list, review sources, market signals | Gap map, alternative landscape, unmet needs, differentiation hypothesis | Founder / operator or strategy owner | Demand Validation Report |
| Opportunity Intelligence | `DEMAND_VALIDATION_REPORT_TEMPLATE.md` | Before moving from opportunity research into founder diagnostic or product specification | Opportunity Brief, Market Gap Analysis where relevant, interviews, review mining, internal evidence | Validation decision, evidence strength, buyer/user evidence, gate recommendation | Founder / operator | Founder Intelligence Diagnostic |
| Founder Intelligence | `FOUNDER_INTELLIGENCE_DIAGNOSTIC_TEMPLATE.md` | When diagnosing operational reality before prescribing software, automation, or AI agents | Validated opportunity, founder/operator interviews, workflow evidence, current tools, source-of-truth inventory | Workflow map, bottlenecks, revenue leaks, attribution gaps, communication breakdowns, system opportunity | Founder / operator | Revenue Leak Assessment and PRD |
| Founder Intelligence | `REVENUE_LEAK_ASSESSMENT_TEMPLATE.md` | When revenue flow, lead handling, follow-up, attribution, or sales conversion is central to the project | Founder Intelligence Diagnostic, CRM/lead data where approved, sales process notes, follow-up rules | Leak register, lead flow analysis, attribution analysis, prioritized fixes, system implications | Founder / operator | PRD and Architecture Specification |
| Product Intelligence | `PRD_TEMPLATE.md` | Before architecture or build work begins | Demand Validation Report, Founder Intelligence Diagnostic, Revenue Leak Assessment where relevant, constraints, success metrics | Problem, outcome, scope, requirements, non-functional requirements, assumptions, risks, approval gate | Product owner and founder / operator | Architecture Specification and System Design Document |
| Architecture Intelligence | `ARCHITECTURE_SPEC_TEMPLATE.md` | Before implementation of serious software, automation, AI agent, integration, or operational platform work | Approved PRD, existing repo/system context, constraints, integration needs, security requirements | Architecture summary, system boundaries, frontend/backend/API/data/auth/security/observability/deployment plan | Technical owner and founder / operator | System Design Document and build plan |
| Architecture Intelligence | `SYSTEM_DESIGN_TEMPLATE.md` | When the architecture needs implementation-level design, data model, state flow, integration, or operational handoff detail | Approved PRD, Architecture Specification, diagnostic artifacts, existing systems | Component design, data model, state transitions, integration map, event model, permissions, failure handling | Technical owner and founder / operator | Build implementation and Operational Readiness Review |
| Operational Intelligence | `OPERATIONAL_READINESS_REVIEW_TEMPLATE.md` | Before launch, handoff, production-impacting deploy, or operational adoption claim | Built system, validation evidence, review notes, deployment notes, owner assignments, monitoring plan | Readiness decision, validation evidence, ownership, monitoring, documentation, rollback, launch risks | Technical owner and operator | Launch decision and Growth Intelligence Review |
| Growth Intelligence | `GROWTH_INTELLIGENCE_REVIEW_TEMPLATE.md` | After launch when adoption, retention, ROI, attribution, or expansion decisions are being evaluated | Live usage evidence, customer success feedback, attribution data, ROI data, support load | Growth decision, adoption evidence, ROI review, attribution review, growth backlog, non-scaling list | Founder / operator and growth owner | Next iteration, expansion, maintain, pause, or retire decision |

## 5. Gate-To-Artifact Map

| Decision Gate | Required Artifacts | Supporting Templates | Gate Cannot Pass If |
| --- | --- | --- | --- |
| Opportunity Validation Gate | Opportunity Brief, Demand Validation Report | `OPPORTUNITY_BRIEF_TEMPLATE.md`, `MARKET_GAP_ANALYSIS_TEMPLATE.md`, `DEMAND_VALIDATION_REPORT_TEMPLATE.md` | Buyer/user is unclear, demand evidence is weak, alternatives are ignored, or disconfirming evidence is absent |
| Founder Diagnostic Gate | Founder Intelligence Diagnostic, Revenue Leak Assessment where relevant | `FOUNDER_INTELLIGENCE_DIAGNOSTIC_TEMPLATE.md`, `REVENUE_LEAK_ASSESSMENT_TEMPLATE.md` | Bottlenecks are generic, no measurable leak or constraint exists, or the recommendation jumps to tools |
| PRD Approval Gate | Product Requirements Document | `PRD_TEMPLATE.md` | Scope is open-ended, requirements are untestable, success criteria are vague, or assumptions are hidden |
| Architecture Approval Gate | Architecture Specification, System Design Document where relevant | `ARCHITECTURE_SPEC_TEMPLATE.md`, `SYSTEM_DESIGN_TEMPLATE.md` | System boundaries, data ownership, auth, integrations, observability, or rollback are unclear |
| Build Approval Gate | Approved PRD, approved architecture, approved system design where relevant | `PRD_TEMPLATE.md`, `ARCHITECTURE_SPEC_TEMPLATE.md`, `SYSTEM_DESIGN_TEMPLATE.md` | Build task is broad, validation plan is absent, or serious edits lack explicit `proceed` |
| Operational Readiness Gate | Operational Readiness Review | `OPERATIONAL_READINESS_REVIEW_TEMPLATE.md` | Local validation is overclaimed as production readiness, ownership is missing, monitoring is absent, or rollback is unclear |
| Growth Review Gate | Growth Intelligence Review | `GROWTH_INTELLIGENCE_REVIEW_TEMPLATE.md` | Adoption, ROI, attribution, retention, or operational capacity evidence is insufficient for expansion |

## 6. Template Inventory

| Template | Artifact | Framework Layer | Primary Use | Required / Conditional |
| --- | --- | --- | --- | --- |
| `OPPORTUNITY_BRIEF_TEMPLATE.md` | Opportunity Brief | Opportunity Intelligence | Define the opportunity and initial evidence | Required for all new Product Factory initiatives |
| `MARKET_GAP_ANALYSIS_TEMPLATE.md` | Market Gap Analysis | Opportunity Intelligence | Evaluate competitors, alternatives, unmet needs, and distribution context | Required for market-facing products; conditional for internal-only workflow fixes |
| `DEMAND_VALIDATION_REPORT_TEMPLATE.md` | Demand Validation Report | Opportunity Intelligence | Decide whether demand is validated enough to proceed | Required before diagnostic-to-product progression |
| `FOUNDER_INTELLIGENCE_DIAGNOSTIC_TEMPLATE.md` | Founder Intelligence Diagnostic | Founder Intelligence | Diagnose workflow reality, bottlenecks, source-of-truth gaps, and system opportunity | Required for Founder Intelligence, AgentOS, ResponseOS, and client operating-system work |
| `REVENUE_LEAK_ASSESSMENT_TEMPLATE.md` | Revenue Leak Assessment | Founder Intelligence | Analyze lead flow, follow-up, attribution, and sales leakage | Required when revenue flow or attribution is in scope |
| `PRD_TEMPLATE.md` | Product Requirements Document | Product Intelligence | Convert validated problem into buildable requirements | Required before architecture or implementation |
| `ARCHITECTURE_SPEC_TEMPLATE.md` | Architecture Specification | Architecture Intelligence | Define system architecture, boundaries, data, security, observability, deployment, and rollback | Required before serious build work |
| `SYSTEM_DESIGN_TEMPLATE.md` | System Design Document | Architecture Intelligence | Detail flows, components, data model, integrations, events, permissions, and failure handling | Required for multi-component or production-impacting systems |
| `OPERATIONAL_READINESS_REVIEW_TEMPLATE.md` | Operational Readiness Review | Operational Intelligence | Decide whether the system is ready for launch, handoff, or operational adoption | Required before launch or readiness claims |
| `GROWTH_INTELLIGENCE_REVIEW_TEMPLATE.md` | Growth Intelligence Review | Growth Intelligence | Evaluate adoption, ROI, attribution, retention, and expansion readiness | Required before scaling or expansion |

Current known template gap:

```txt
Build Intelligence does not yet have a dedicated Implementation Plan or Test Evidence template in this inventory.
Until created, Build Intelligence depends on the approved PRD, Architecture Specification, System Design Document, pull request notes, validation output, and session closeout.
```

## 7. Required Artifacts By Project Type

| Project Type | Required Artifact Package | Conditional Artifacts | Notes |
| --- | --- | --- | --- |
| Founder Intelligence System | Opportunity Brief, Demand Validation Report, Founder Intelligence Diagnostic, Revenue Leak Assessment, PRD, Architecture Specification, System Design Document, Operational Readiness Review | Market Gap Analysis, Growth Intelligence Review | Use Growth Intelligence Review after launch or when expansion is being considered |
| AgentOS installation | Opportunity Brief, Founder Intelligence Diagnostic, PRD, Architecture Specification, System Design Document, Operational Readiness Review | Demand Validation Report, Revenue Leak Assessment, Growth Intelligence Review | Demand validation may be compressed only if the installation is for a validated internal/client need |
| ResponseOS workflow | Founder Intelligence Diagnostic, Revenue Leak Assessment, PRD, Architecture Specification, System Design Document, Operational Readiness Review | Opportunity Brief, Demand Validation Report, Growth Intelligence Review | Revenue leak and follow-up evidence are usually central |
| Internal AJ Digital product | Opportunity Brief, Demand Validation Report, PRD, Architecture Specification, Operational Readiness Review | Market Gap Analysis, System Design Document, Growth Intelligence Review | System Design Document is required if the product is multi-component or production-impacting |
| Client software product | Opportunity Brief, Market Gap Analysis, Demand Validation Report, Founder Intelligence Diagnostic, PRD, Architecture Specification, System Design Document, Operational Readiness Review | Revenue Leak Assessment, Growth Intelligence Review | Client-facing work should not skip validation without operator approval |
| SaaS product | Opportunity Brief, Market Gap Analysis, Demand Validation Report, PRD, Architecture Specification, System Design Document, Operational Readiness Review, Growth Intelligence Review | Founder Intelligence Diagnostic, Revenue Leak Assessment | Growth review is required before scaling acquisition or feature expansion |
| AI agent | Opportunity Brief, Founder Intelligence Diagnostic, PRD, Architecture Specification, System Design Document, Operational Readiness Review | Demand Validation Report, Revenue Leak Assessment, Growth Intelligence Review | Must document human approval, permissions, data access, observability, and rollback |
| Automation system | Founder Intelligence Diagnostic, PRD, Architecture Specification, System Design Document, Operational Readiness Review | Opportunity Brief, Revenue Leak Assessment, Growth Intelligence Review | Do not automate unclear or unowned processes |
| Operational intelligence platform | Opportunity Brief, Founder Intelligence Diagnostic, PRD, Architecture Specification, System Design Document, Operational Readiness Review, Growth Intelligence Review | Market Gap Analysis, Demand Validation Report, Revenue Leak Assessment | Dashboards must map to decisions and owners |

## 8. AI Assistant Usage Rules

1. Use the artifact that matches the current layer. Do not ask an assistant to produce downstream artifacts before the upstream gate passes.
2. Do not give multiple assistants the same broad prompt. Assign one bounded artifact or review task per assistant.
3. ChatGPT is preferred for opportunity framing, founder diagnosis, synthesis, strategic review, and growth analysis.
4. Claude is preferred for PRD drafting, architecture planning, and documentation synthesis when repo mutation is not required.
5. Codex is preferred for repo-local execution, validation, diffs, commits, and code-aware documentation changes.
6. Obsidian or the governed vault is appropriate for working notes, diagnostic capture, and durable business memory, subject to memory governance.
7. Hermes and OpenClaw are execution or automation lanes only after the relevant specification, architecture, and approval gates pass.
8. AI outputs must separate facts, inferences, assumptions, open questions, and risks where evidence is incomplete.
9. AI assistants must not expose secrets, hardcode credentials, invent architecture, overwrite doctrine, or claim production readiness from local validation alone.
10. Every artifact produced by an AI assistant requires human review before it becomes canonical.

## 9. Human Approval Rules

| Approval Point | Approval Owner | Required Before |
| --- | --- | --- |
| Opportunity selection | Founder / operator | Demand validation, diagnostic work, or product specification |
| Demand validation | Founder / operator | Founder Intelligence or Product Intelligence progression |
| Founder diagnostic findings | Founder / operator | PRD creation and system recommendation |
| Revenue leak prioritization | Founder / operator | Product scope and automation design |
| PRD scope and exclusions | Product owner and founder / operator | Architecture work |
| Architecture boundaries and tradeoffs | Technical owner and founder / operator | Build work |
| Serious or irreversible edits | Founder / operator using `proceed` | File mutation, production-impacting changes, public copy changes, secret/client-data work |
| Operational readiness | Technical owner and operator | Launch, handoff, or readiness claims |
| Growth expansion | Founder / operator and growth owner | Scaling, new feature expansion, or increased operational complexity |

Human approval rule:

```txt
No serious or irreversible action proceeds without explicit approval.
For repo execution, the approval phrase is: proceed
```

## 10. Definition Of Complete Artifact Package

A complete artifact package is the minimum set of approved outputs required to move a Product Factory initiative from concept to governed operation.

### Full Product Factory Package

Required:

- Opportunity Brief
- Market Gap Analysis
- Demand Validation Report
- Founder Intelligence Diagnostic
- Revenue Leak Assessment where revenue flow is in scope
- Product Requirements Document
- Architecture Specification
- System Design Document
- Operational Readiness Review
- Growth Intelligence Review after launch or before expansion

Complete means:

- each required artifact has an owner;
- each artifact has required inputs documented;
- facts, inferences, assumptions, risks, and open questions are separated where relevant;
- the matching decision gate is passed or explicitly blocked;
- skipped artifacts have documented rationale;
- downstream dependencies are named;
- human approval is recorded;
- no artifact makes unsupported production-readiness, ROI, attribution, or scaling claims.

### Minimum Internal Workflow Package

Required:

- Founder Intelligence Diagnostic
- PRD
- Architecture Specification
- Operational Readiness Review

Conditional:

- Opportunity Brief when the problem is not already validated.
- Revenue Leak Assessment when revenue flow or attribution is affected.
- System Design Document when the workflow is multi-component or production-impacting.

### Minimum Market-Facing Product Package

Required:

- Opportunity Brief
- Market Gap Analysis
- Demand Validation Report
- PRD
- Architecture Specification
- System Design Document
- Operational Readiness Review
- Growth Intelligence Review before scaling.

### Minimum AI Agent / Automation Package

Required:

- Founder Intelligence Diagnostic
- PRD
- Architecture Specification
- System Design Document
- Operational Readiness Review

Conditional:

- Revenue Leak Assessment when the agent or automation affects lead flow, follow-up, attribution, sales, or revenue operations.
- Growth Intelligence Review before expanding autonomy, scope, or volume.

Completion rule:

```txt
The artifact package is not complete because documents exist.
It is complete only when the right artifacts are filled, reviewed, approved, and connected to their decision gates.
```

