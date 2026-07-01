# AJ Digital Dashboard — Routing Canonicalization

*Architecture decision record + plan. Status: **decisions approved 2026-06-14**. Implementation is NOT done — each change below remains separately gated.*

## Decision Log

| Date | Decision | By |
|---|---|---|
| 2026-06-13 | Plan drafted (read-only diagnosis of `traefik/`, `homepage/`, `dashboard/`, `ui/dashboard/`, compose, edge docs). | Claude Code |
| 2026-06-14 | **Option A approved** + §11 routing defaults approved (rows 1–5 below). | Audio |

**Approved baseline (the decided defaults):**
1. `dash.ajdigital.app` is **reserved for the custom control plane** (built on `dashboard/`, the Next 15 app). The orphan Vercel/Clerk surface currently 404-ing there is to be **decommissioned**, not left dangling.
2. `ui/dashboard/` (Vite/React/Supabase) is **archived** — resolves the duplicate `aj-digital-os-dashboard` package-name collision; `dashboard/` is the single canonical operator dashboard.
3. `os.ajdigital.app` and `prom.ajdigital.app` are **never public**. `chat`/`flows`/`metrics` stay **LAN / Cloudflare-Access-only**. The Homepage tiles that point at hosts not in the tunnel ingress are **relabeled to match reality** (LAN-only vs Access-walled).
4. Control-plane auth = **Cloudflare Access** (consistent with `home.ajdigital.app`), so `dashboard/` needs no app-level auth library yet.
5. The `0.0.0.0` host-port bindings (Postgres/Redis/n8n/Grafana/Prometheus) are to be **loopback-bound** in the unified compose during a planned restart.

> Nothing in this record changes Docker/Traefik/Cloudflare/DNS/Vercel/compose/secrets. Implementation steps (§10) are gated and tracked separately.

---

## 1. Current State (confirmed by inspection)

- **Edge is live** (`docs/system/REMOTE_ACCESS_EDGE.md`, LIVE 2026-06-12): `browser → Cloudflare Access wall → tunnel "aj-engines" → localhost → Traefik :80 → Homepage`.
- **`home.ajdigital.app`** is the working launcher — Homepage container, routed by Traefik's **file provider** (`traefik/dynamic.yml`), exposed through the tunnel and **protected by Cloudflare Access** (`owner-only`, 2 operator emails).
- **`dash.ajdigital.app`** is **not** in Traefik and **not** in the tunnel ingress — a separate Vercel/Next/Clerk product returning a signed-out 404. The local `dashboard/` has **no Clerk dependency**, so the Vercel/Clerk surface is a **third, separate codebase**, not `dashboard/`.
- **Two local dashboard codebases:** `dashboard/` (Next.js 15 App Router, no backend deps — a clean scaffold) and `ui/dashboard/` (Vite 8 + React 19 + Supabase, has a built `dist/`).
- **Traefik routes 6 hostnames** (`home`, `os`, `chat`, `flows`, `metrics`, `prom`) to live containers; **Traefik dashboard runs `api.insecure: true` on :8080** (local-only, not tunnel-exposed).
- **Discrepancy:** Homepage tiles link `https://os|chat|flows|metrics|prom.ajdigital.app`, but the documented tunnel ingress exposes only `home` + three `*-engine` hosts — so those five tile links are likely **dead externally** (LAN/localhost only).

## 2. Canonical Hostname Roles

| Hostname | Role | Backing app | Deploy owner | Auth | Exposure | Status |
|---|---|---|---|---|---|---|
| `home.ajdigital.app` | Service launcher | Homepage | Local Docker → Traefik | Cloudflare Access | Public, Access-walled | current |
| `dash.ajdigital.app` | **Control plane** | `dashboard/` (Next 15) | TBD (decide at build) | Cloudflare Access | Access-walled (target) | target — orphan Vercel/Clerk to be decommissioned |
| `os.ajdigital.app` | Runtime/control API (Hermes) | `aj-digital-os` :7420 | Local Docker → Traefik | NONE (unauth) | **never public** | internal-only |
| `chat.ajdigital.app` | Chat | Open WebUI :8080 | Local Docker → Traefik | app login | LAN / Access-only | current (local) |
| `flows.ajdigital.app` | Workflows | n8n :5678 | Local Docker → Traefik | n8n auth | LAN / Access-only | current (local) |
| `metrics.ajdigital.app` | Observability | Grafana :3000 | Local Docker → Traefik | Grafana login | LAN / Access-only | current (local) |
| `prom.ajdigital.app` | Metrics source | Prometheus :9090 | Local Docker → Traefik | NONE | **never public** | internal-only |

## 3. Dashboard Product Boundaries

- **Homepage launcher** — read-only directory of links + uptime pings. Stays the front door; never grows command actions.
- **AJ Digital OS Control Plane** (`dash`, future) — the operator cockpit that talks to the Hermes API. Built on `dashboard/`.
- **Grafana** — observability viewer, linked not embedded; not the command center.
- **n8n** — automation engine, surfaced as a tile.
- **Open WebUI** — chat/workbench over Hermes/Ollama; adjacent, not core.

Rule: **Homepage = start, Control Plane = operate, Grafana = observe, n8n = automate, Open WebUI = chat.**

## 4. Repo Ownership Map

| Folder | Purpose | Disposition (approved) |
|---|---|---|
| `homepage/` | Live launcher config | **Keep** — canonical launcher; fix stale tile links (§decision 3). |
| `dashboard/` | Next 15 scaffold | **Promote** → canonical control plane for `dash`. |
| `ui/dashboard/` | Vite/React/Supabase parallel | **Archive** (§decision 2). |
| `traefik/` | Edge routing | **Keep** — harden `api.insecure` before any 443 entrypoint. |
| `monitoring/` | Prometheus + Grafana config | **Keep**. |

## 5. Security Boundary

| Surface | Required posture | Gap / action |
|---|---|---|
| `home.ajdigital.app` | Public + Access | OK (Access-only acceptable for a read-only launcher). |
| Traefik dashboard `:8080` (`api.insecure`) | Local-only, never public | OK now (not tunneled); harden before adding 443. |
| `os` (Hermes :7420) | Admin-only; never public while unauth | Loopback-bound; **do not add `os` tunnel ingress** until auth/Access exists. |
| `prom` (:9090) | Internal-only | Keep off the tunnel. |
| `0.0.0.0` host ports | Loopback / LAN-trusted | **Loopback-bind** Postgres/Redis/n8n/Grafana/Prometheus (§decision 5). |
| `dash` (Vercel/Clerk) | Defined owner | **Decommission** the orphan (§decision 1). |

## 6. Control Plane Target Architecture

```txt
browser ── Cloudflare (Access) ── tunnel "aj-engines" ── localhost ── Traefik :80
                                                                          ├─ home.ajdigital.app → Homepage (launcher)
                                                                          └─ dash.ajdigital.app → Control Plane (dashboard/)
                                                                                                    │ calls
                                                                                                    ▼
                                                                          Hermes control API (aj-digital-os :7420)
                                                                          observed by Grafana ← Prometheus (internal source)
```

Homepage stays a directory; `dashboard/` is the only surface that talks to Hermes; Grafana stays observability; Prometheus stays a source, never a product.

## 7. Migration Options (evaluated)

- **Option A (chosen):** keep `home` as launcher; reserve `dash` for the custom control plane. *Benefit:* zero disruption to the live Access-walled launcher; clean start-vs-operate split. *Complexity:* low. **Recommended & approved.**
- **Option B (rejected):** move launcher to `dash`, retire `home`. Breaks the live tunnel ingress + Access app binding (pinned to `home.ajdigital.app`). High risk.
- **Option C (rejected):** merge Homepage into the Next dashboard. Collapses the directory/operator boundary prematurely; larger attack surface on one public app.

## 8. Recommended Decision — **Option A (approved 2026-06-14)**

Preserves the one thing that works (the Access-walled `home` launcher), gives the orphaned `dashboard/` a defined destination (`dash`), keeps launcher/control-plane/observability boundaries clean, and is the only option that doesn't disturb the live tunnel + Access binding.

## 9. No-Code Next Steps

1. ✅ This record committed to `docs/architecture/` (this file).
2. Add the canonical hostname table to `EDGE_NOTES.md` / `REMOTE_ACCESS_EDGE.md` as the single source of truth.
3. Reconcile which of the 6 Traefik hosts are actually tunnel-exposed vs LAN-only (check `~/.cloudflared/config.yml`, operator-only).
4. ADR: "`dashboard/` is the canonical Control Plane; `ui/dashboard/` archived."

## 10. Later Implementation Steps (gated — do NOT execute without a scoped approval)

1. Decommission the orphan Vercel/Clerk `dash` project; wire `dashboard/` to `dash` behind Access.
2. Archive `ui/dashboard/`; rename to remove the `aj-digital-os-dashboard` package collision.
3. Relabel Homepage tiles to real reachability (or add Access-walled ingress for the intended hosts).
4. Harden the Traefik dashboard (basic-auth; drop `api.insecure`) before any 443 entrypoint.
5. Loopback-bind the `0.0.0.0` host ports in the unified compose during a planned restart.
6. Keep `os`/`prom` off the public tunnel until Hermes auth + a Prometheus access policy exist.

## 11. Open Questions — RESOLVED 2026-06-14

| # | Question | Decision |
|---|---|---|
| 1 | `dash` runtime: Vercel vs local+Traefik? | Decide at build; **reserve `dash` for the control plane** either way. |
| 2 | Orphan Vercel/Clerk `dash`: redirect or decommission? | **Decommission.** |
| 3 | `ui/dashboard/`: archive? | **Archive.** |
| 4 | Public exposure of `os/chat/flows/metrics/prom`? | `os`/`prom` **never public**; `chat`/`flows`/`metrics` **LAN/Access-only**; relabel tiles. |
| 5 | Control-plane auth: Access vs app-level? | **Cloudflare Access.** |

---

**Sources inspected (2026-06-13):** `traefik/traefik.yml`, `traefik/dynamic.yml`, `docker-compose.unified.yml`, `docker-compose.traefik.yml`, `homepage/services.yaml`, `dashboard/package.json`, `ui/dashboard/package.json`, `EDGE_NOTES.md`, `docs/system/REMOTE_ACCESS_EDGE.md`.

**Assumptions:** running stack matches `docker-compose.unified.yml` topology (not observed live); tunnel ingress as documented (authoritative `~/.cloudflared/config.yml` is operator-only); the Vercel/Clerk `dash` surface is a separate project (confirmed: no Clerk dep in local `dashboard/`).

**No-change confirmation:** documentation only. No Docker/Traefik/Cloudflare/DNS/Vercel/compose/secret changes; nothing deployed. This record captures approved decisions; implementation (§10) remains gated.
