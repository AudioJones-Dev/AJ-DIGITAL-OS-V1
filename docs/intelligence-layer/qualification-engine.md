# Qualification Engine v1

## Purpose

The Qualification Engine provides deterministic business-readiness evaluation before AJ Digital OS deployment. It acts as the commercialization gate between inquiry and install decisions.

## Why qualification exists in AJ Digital OS

AJ Digital OS is designed to avoid deploying automation into structurally weak businesses. This module enforces foundation-first qualification so deployment decisions are tied to observable operational signals, not opinion.

## Scoring dimensions

The engine evaluates five dimensions using deterministic thresholds:

1. **Demand**: lead volume, demand signal quality, and offer clarity.
2. **Economics**: average customer value viability.
3. **Process maturity**: sales process, fulfillment capacity, SOP coverage.
4. **Data maturity**: CRM presence and usable database size.
5. **Attribution readiness**: tracking readiness, CRM continuity, source diversity.

Each dimension returns a normalized 0-100 score with rationale, then contributes to weighted readiness scoring:

- Demand: 20%
- Economics: 20%
- Process maturity: 25%
- Data maturity: 20%
- Attribution readiness: 15%

## Tier meanings

- **not_ready**: readiness score below 40 or hard disqualifiers present.
- **foundation**: readiness score 40-59 with gaps that need foundation alignment.
- **growth**: readiness score 60-79; deployable with targeted optimization.
- **scale**: readiness score 80+; structurally ready for fuller OS installation.

## Disqualifier philosophy

Hard disqualifiers are intentionally narrow and commercial in nature, used only for severe blockers such as no meaningful demand, very low customer value, absent sales process, or no CRM/data base.

## Next planned integrations

This module is extraction-ready and intended to connect to:

- Attribution engine
- Vertical template router
- Deployment planner

## Current implementation boundaries

The module is:

- deterministic
- business-readiness focused
- free of learned model dependencies
- free of external API dependencies
