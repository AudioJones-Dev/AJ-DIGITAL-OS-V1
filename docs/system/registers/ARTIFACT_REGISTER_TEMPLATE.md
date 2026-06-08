# Artifact Register Template

```yaml
title: Artifact Register
status: Draft
owner: <owner>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
project: <project or portfolio name>
artifact_type: register
source_of_truth: docs/system/registers/ARTIFACT_REGISTER_TEMPLATE.md
```

**Register purpose:** Track all Founder Intelligence Product Factory artifacts.
**Framework source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Execution source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Artifact source:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_ARTIFACT_INDEX.md`

---

## 1. Purpose

The Artifact Register is the authoritative control plane for FIPF artifact progression.

It tracks which artifacts exist, which phase they belong to, who owns them, their status, approval state, dependencies, source location, evidence, and next action. It prevents a project from claiming readiness when required artifacts are missing, stale, unapproved, or disconnected from gates.

## 2. Artifact Types

| Artifact Type | Related Phase |
| --- | --- |
| Opportunity Brief | Opportunity |
| Market Gap Analysis | Opportunity |
| Demand Validation | Opportunity |
| Founder Diagnostic | Founder |
| Revenue Leak Assessment | Founder |
| PRD | Product |
| Architecture Spec | Architecture |
| System Design | Architecture |
| Operational Review | Operations |
| Growth Review | Growth |

## 3. Artifact Lifecycle

| Lifecycle State | Definition |
| --- | --- |
| Draft | Artifact is being created and is not approved |
| Review | Artifact is ready for review or gate evaluation |
| Approved | Artifact has required approval and can support downstream work |
| Archived | Artifact is retained for history and no longer active |
| Superseded | Artifact was replaced by a newer approved artifact |

## 4. Governance Fields

Every artifact update must include:

| Field | Requirement |
| --- | --- |
| Date | Date the artifact row or status changed |
| Owner | Person accountable for artifact completion |
| Status | Draft, Review, Approved, Archived, or Superseded |
| Evidence | Source material or review evidence supporting status |
| Approval | Approver and approval state |
| Next Action | Immediate action needed to progress or close the artifact |

## 5. Artifact Register

| Artifact ID | Date | Artifact Name | Artifact Type | Related Phase | Owner | Status | Approval State | Dependency | Source Location | Evidence | Next Action | Last Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ART-001 | `<YYYY-MM-DD>` | `<artifact name>` | Opportunity Brief / Market Gap Analysis / Demand Validation / Founder Diagnostic / Revenue Leak Assessment / PRD / Architecture Spec / System Design / Operational Review / Growth Review | Opportunity / Founder / Product / Architecture / Build / Operations / Growth | `<owner>` | Draft / Review / Approved / Archived / Superseded | Pending / Approved / Rejected / Not Required | `<dependency>` | `<path or location>` | `<evidence link>` | `<next action>` | `<YYYY-MM-DD HH:MM>` |

## 6. Artifact Progression Rules

1. Every required artifact from the artifact index must have a row.
2. No artifact may be marked Approved without an approval owner or approval evidence.
3. No downstream artifact may be marked Approved if its required upstream dependency is missing or rejected.
4. Superseded artifacts must point to the replacement artifact.
5. Archived artifacts must remain discoverable for audit.
6. Source Location must be a stable path, vault note, repo file, CRM object, dashboard, or other governed source reference.

## 7. Approval Requirements

| Artifact Type | Approval Owner |
| --- | --- |
| Opportunity Brief | Founder / operator |
| Market Gap Analysis | Founder / operator or strategy owner |
| Demand Validation | Founder / operator |
| Founder Diagnostic | Founder / operator |
| Revenue Leak Assessment | Founder / operator |
| PRD | Product owner and founder / operator |
| Architecture Spec | Technical owner and founder / operator |
| System Design | Technical owner and founder / operator |
| Operational Review | Technical owner and operator |
| Growth Review | Founder / operator and growth owner |

## 8. Cross-Register Rules

### Relationship To Other Registers

- Project Register uses artifact status to determine phase and gate readiness.
- Decision Register records approvals, supersession, and scope decisions that affect artifacts.
- Risk Register records risks discovered inside artifacts.
- Assumption Register records assumptions documented or validated by artifacts.

### Source-Of-Truth Requirements

- Artifact status lives here.
- Artifact content lives in its source location.
- The artifact index controls which artifacts are required.
- Do not use chat messages or working notes as artifact approval unless captured in a governed source location.

### Update Cadence

- Update when an artifact is created.
- Update when artifact status changes.
- Update before every gate.
- Update when an artifact is approved, archived, or superseded.

### Approval Requirements

- Artifact approval must match the approval owner defined in the artifact index and playbook.
- Approval state must not be inferred from document existence.

### Audit Requirements

- Every active project must have an Artifact Register row for each required artifact.
- Missing artifacts must be marked with a dependency or next action.
- Superseded artifacts must preserve source location and replacement reference.

