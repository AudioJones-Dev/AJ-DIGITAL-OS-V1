# Grafana Observability & Executive Reporting Layer

Status: Repo Pointer
Phase: **Phase 0 — doctrine/spec only** (no runtime implementation authorized)

Canonical Source (do not duplicate here):
- SPEC: `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\02-OPERATING-SYSTEM\Architecture\GRAFANA_OBSERVABILITY_LAYER_SPEC.md`
- STANDARD: `G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\02-OPERATING-SYSTEM\Protocols\OBSERVABILITY_LAYER_STANDARD.md`

---

> **Grafana is not the AJ Digital OS. Grafana is the visibility layer that lets AJ Digital OS see itself.**
> This is a bounded repo pointer. The canonical spec + standard live in the Obsidian vault (above). Do not duplicate doctrine here.

## Role
Grafana is the **Observability & Executive Reporting Layer** of AJ Digital OS — a read-only visibility + alerting surface over telemetry and operational data. It is the technical framing of the **Founder Intelligence Command Center**.

## Layer placement
```txt
Obsidian/Vault → doctrine & memory   |  GitHub → versioned execution & audit
Postgres/App DBs → operational records
Prometheus/Loki/OpenTelemetry → metrics, logs, traces
n8n/Agents/Services → automation & execution
Grafana → observability, dashboards, alerts, executive reporting   ◀ THIS LAYER
dash.ajdigital.app / Homepage → command surface & launch/control UX
```

## Boundaries (see standard for binding SHALL/SHALL NOT)
- Read-only visibility + alerting. **Not** a system of record, CRM, project manager, business memory store, agent executor, approval inbox, or command launcher.
- Grafana does **not** own CRM data, project data, business memory, or agent execution — those live in their canonical systems and Grafana only observes them.
- Grafana must **not** replace Obsidian, GitHub, n8n, Homepage, dash.ajdigital.app, or the CRM. It sits beside them as the visibility surface.
- **Every panel is backed by an explicit, validated data source** — no panel implies data that isn't wired.
- Every alert maps to owner + severity + response path.
- Admin/datasource credentials are governed secrets (Doppler/`.env`); client metrics stay tenant-scoped; public/client exposure needs separate approval.
- **Runtime implementation is deferred to Phase 1+ inventory.** No dashboards, datasources, or alert rules are authorized by this pointer.

## Existing assets
- Panel inventory already drafted in [`docs/grafana-dashboard-map.md`](../grafana-dashboard-map.md) — adopt as the System/Infra MVP source (do not duplicate).

## Implementation phases
- **Phase 0 — Doctrine/spec only** ◀ current
- **Phase 1 — Inventory** existing Grafana/Prometheus/OpenTelemetry stack
- **Phase 2 — Define data source contracts**
- **Phase 3 — Create dashboard JSON templates**
- **Phase 4 — Wire system health dashboards**
- **Phase 5 — Wire agent/activity dashboards**
- **Phase 6 — Wire business/revenue dashboards** (only when sources are validated and wired)
- **Phase 7 — Configure alert routing**
- **Phase 8 — Integrate with dash.ajdigital.app / tablet command center**
- **Phase 9 — Client/tenant observability model**

**Next implementation task is Phase 1 (inventory + data contracts), NOT dashboard creation.**
