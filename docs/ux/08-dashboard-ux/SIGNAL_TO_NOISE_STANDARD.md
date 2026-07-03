# Signal to Noise Standard

## Purpose

Define dashboard density and prioritization rules.

## Standard

Dashboards SHOULD cap visible top-level metrics to the smallest useful set.

Dashboards SHOULD:

- suppress redundant widgets
- avoid duplicate representations of the same fact
- use progressive disclosure for detail
- separate alerting from reporting

## Acceptance Criteria

- The dashboard is scannable in a few seconds.
- Important alerts are not buried under decorative metrics.
