# Compose Reconciliation Notes — Stage 3a (2026-06-11)

**Status:** DRAFT for review. `docker-compose.unified.yml` is a new file; the two originals are **untouched**. Nothing has been run.

## Why
Two compose files existed and conflicted:
- `docker-compose.yml` (stack `aj-digital-os`, net `aj-os-net`, named volumes) — has the **app**, missing rich infra.
- `compose/docker-compose.yml` (stack `aj-digital-infra`, net `aj-digital-net`, data on `F:/CACHE`) — rich infra (ollama, qdrant, loki, full observability), **missing the app**, and colliding host ports + swapped grafana/open-webui ports.

Running both would collide on 5432/6379/5678/9090 and split the app onto a different network from its infra. `docker-compose.unified.yml` merges them into one coherent stack.

## Decisions applied (operator-approved "go with recommendations")
1. **One network** `aj-os-net` — app and infra reach each other by service name.
2. **Volumes → `${AJ_DATA_ROOT:-F:/CACHE}`** bind mounts (off the C: Docker vhdx). One env knob relocates all data — set `AJ_DATA_ROOT=J:/CACHE` (or similar) to move it.
3. **Ports:** grafana **3000**, open-webui **3001** (matches `.env.example`; resolves the swap).
4. **Dropped** `cadvisor` + `node-exporter` — they mount Linux host paths (`/`, `/sys`, `/var/run`) that don't work on Windows Docker Desktop. Re-add if/when on a WSL2/Linux host.
5. **Profiles:** core (always on) / `ai-ui` / `workflow` / `ops` / `full`.

## Profile layout
| Profile | Services | Run command |
|---|---|---|
| core (default) | aj-digital-os:7420, postgres:5432, redis:6379, otel:4317 | `docker compose -f docker-compose.unified.yml up -d` |
| ai-ui | + ollama:11434, open-webui:3001, qdrant:6333 | `… --profile ai-ui up -d` |
| workflow | + n8n:5678 | `… --profile workflow up -d` |
| ops | + prometheus:9090, grafana:3000, alertmanager:9093, blackbox, loki:3100 | `… --profile ops up -d` |
| full | everything | `… --profile full up -d` |

## Config sources (verified present)
- prometheus/alertmanager/blackbox/grafana → `./monitoring/…`
- otel → `./ops/otel/config.yaml`
- app → `Dockerfile` (build .) + `.env`

## NOT done yet (next gated steps)
- **Stage 3b (validate + run):** `docker compose -f docker-compose.unified.yml config` (lint), then `--profile core up -d`, confirm `http://localhost:7420/status` healthy. Requires Docker running; consider relocating the Docker vhdx off C: first (disk pressure).
- **Stage 4 (Traefik):** add a `traefik` service (:80/:443, dashboard secured) + per-service router labels + Homepage landing pane. Local hostnames: `os. / chat. / flows. / metrics. / home.agentos.local`.
- **Adopt:** once validated, replace `docker-compose.yml` with the unified file and retire `compose/docker-compose.yml` (keep under git history / `_archive`).

## Reversal
Delete `docker-compose.unified.yml` + this file — both are new/untracked; the two original compose files are unchanged.
