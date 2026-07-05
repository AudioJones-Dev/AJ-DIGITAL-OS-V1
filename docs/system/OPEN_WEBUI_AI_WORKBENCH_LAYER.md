# Open WebUI AI Workbench Layer

> **Doctrine in one line:** Open WebUI is **not** the brain of AJ Digital OS. It is the **workbench** where model behavior is tested before it becomes governed infrastructure.

This is the repo-side pointer for the Open WebUI AI Workbench Layer. The authoritative doctrine lives in the AJ Digital Vault:

- **Spec:** `02-OPERATING-SYSTEM/Architecture/OPEN_WEBUI_AI_WORKBENCH_LAYER_SPEC.md`
- **Standard:** `02-OPERATING-SYSTEM/Protocols/AI_WORKBENCH_LAYER_STANDARD.md`

This file exists so the repo records the layer's role, boundaries, and phase plan, and so future code/runtime work can link back to the governing doctrine. It is documentation only and configures nothing.

---

## What Open WebUI Is

The local AI workbench and model-interface layer: model access, local/cloud model routing, model presets, prompt testing, RAG/document experiments, tools/functions, filters, and pipelines. In AJ Digital OS these remain workbench/prototyping capabilities unless promoted into governed production.

## What Open WebUI Is Not

CRM, project management, Obsidian replacement, GitHub replacement, system of record, governance kernel, permanent business memory, production agent runtime, approval inbox, client portal, tenant boundary authority, dashboard/observability layer, or command launcher.

## Layer Placement

```txt
Obsidian / Vault        -> doctrine, decisions, operating memory
GitHub                  -> versioned execution, repos, PRs, audit trail
Postgres / App DBs      -> operational records
n8n / Agents / Services -> automation and execution
Open WebUI              -> AI workbench, model interface, prompt testing, RAG/testing surface
Grafana                 -> observability, dashboards, alerts, executive reporting
dash.ajdigital.app / Homepage -> command surface and launch/control UX
```

## Binding Constraints

- Open WebUI shall not be treated as the AJ Digital OS or the governance kernel.
- Open WebUI shall not replace Obsidian, GitHub, CRM, n8n, Grafana, Homepage, or dash.ajdigital.app.
- Open WebUI shall be treated as the AI workbench and model-interface layer.
- Knowledge/RAG collections shall not become the authoritative source of truth unless separately promoted into governed storage.
- Model presets shall be documented before being used for repeatable workflows.
- Tools/functions/pipelines shall be treated as experimental until reviewed and promoted.
- Production agent workflows shall run through governed agent/runtime standards, not ad hoc Open WebUI chats.
- No client-sensitive knowledge base shall be exposed across tenants; client/tenant context shall remain scoped and explicit.
- Remote/public access requires separate approval.
- Admin credentials, API keys, model-provider keys, and data-source credentials shall be governed secrets.
- Any integration that can write to external systems shall require a risk classification and approval gate.

## Prototype-To-Production Promotion

Any useful Open WebUI workflow must pass this gate before it is relied upon:

1. Capture prompt/model/tool behavior.
2. Document purpose and data sources.
3. Classify risk level.
4. Identify whether it reads, writes, or executes.
5. Move repeatable logic into GitHub-managed docs/code.
6. Assign an owner.
7. Add an observability/logging requirement.
8. Promote to a governed agent, n8n workflow, or application feature only after approval.

## Implementation Phases

- **Phase 0** — Doctrine/spec only, current state.
- **Phase 1** — Inventory current Open WebUI deployment.
- **Phase 2** — Inventory models/providers/endpoints.
- **Phase 3** — Inventory knowledge/RAG collections.
- **Phase 4** — Inventory tools/functions/pipelines/filters.
- **Phase 5** — Define approved workbench workflows.
- **Phase 6** — Define promotion process into governed agents, n8n workflows, or app features.
- **Phase 7** — Add observability/logging into Grafana/OpenTelemetry if applicable.
- **Phase 8** — Add Homepage / dash.ajdigital.app links.
- **Phase 9** — Define client/tenant-safe usage model.

---

*Status: Phase 0 doctrine/spec. Owner: Audio. This document does not modify Docker Compose, Open WebUI/Ollama runtime config, or any observability/runtime files.*
