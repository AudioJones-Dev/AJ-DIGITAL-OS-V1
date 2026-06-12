# Edge Overlay (Stage 4) — Traefik + Homepage

**Status:** DRAFT, write-only. Nothing has been run. The 8 running containers are untouched.

## What this adds
A single control surface in front of the already-running `aj-digital-os` stack:
- **Traefik** (`:80`) — reverse proxy, hostname routing via **file provider** (no Docker socket, no labels on existing containers). Dashboard on `:8080` (local only).
- **Homepage** (`home.agentos.local`, also `:3030`) — landing tile board over all services.

It joins the **existing external network** `aj-digital-os_aj-os-net` and routes to live containers by name — so it requires **no recreate/restart** of the running stack.

## Files
- `docker-compose.traefik.yml` — traefik + homepage (external network)
- `traefik/traefik.yml` — static config (entrypoint :80, file provider, dashboard)
- `traefik/dynamic.yml` — routers + services → live containers
- `homepage/{settings,services,widgets}.yaml` — landing page

## Routing
| Hostname | → container:port |
|---|---|
| `home.agentos.local` / `agentos.local` | homepage:3000 |
| `os.agentos.local` | aj-digital-os:7420 |
| `chat.agentos.local` | open-webui:8080 |
| `flows.agentos.local` | n8n:5678 |
| `metrics.agentos.local` | grafana:3000 |
| `prom.agentos.local` | prometheus:9090 |

## Prerequisites before `up`
1. **Hosts file** (run as Administrator) — add to `C:\Windows\System32\drivers\etc\hosts`:
   ```
   127.0.0.1 agentos.local home.agentos.local os.agentos.local chat.agentos.local flows.agentos.local metrics.agentos.local prom.agentos.local
   ```
2. **Free ports:** 80, 8080, 3030 must be free (the running stack uses 7420/5432/6379/4317/5678/3000/3001/9090 — no overlap).
3. The `aj-digital-os` compose project must be running (it is).

## Run (gated — separate explicit approval)
```
docker compose -f docker-compose.traefik.yml up -d
```
Then open **http://home.agentos.local** (tile board) and **http://os.agentos.local** (control plane). Traefik dashboard: **http://localhost:8080/dashboard/**.

## Verify
- `docker compose -f docker-compose.traefik.yml ps` → traefik + homepage Up
- `curl -H "Host: os.agentos.local" http://localhost/` → control-plane status JSON

## Reversal
```
docker compose -f docker-compose.traefik.yml down
```
Removes only traefik + homepage; the 8 running services are unaffected. Delete the `traefik/`, `homepage/` dirs and the two new files to fully revert.

## Later hardening (not now)
- TLS: add a `websecure` :443 entrypoint + local certs (mkcert) or Let's Encrypt if exposed.
- Secure the Traefik dashboard (basic-auth middleware) instead of `api.insecure`.
- Optional: migrate the running stack onto `docker-compose.unified.yml` during a planned restart, then switch Traefik to the Docker label provider.
