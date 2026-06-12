# Remote Access — Cloudflare Tunnel + Access + Traefik

**Status:** LIVE (2026-06-12). No credentials in this document.

## Architecture

```txt
browser → Cloudflare edge (Access wall) → tunnel "aj-engines" → localhost → Traefik :80 → Homepage
```

## Components

| Piece | Value |
|---|---|
| Tunnel | `aj-engines`, ID `46a434a9-2c1a-4d75-bf10-0c8e9da3ffc8` |
| Binary | `C:\dev\_tools\cloudflared.exe`, autostarted by `C:\dev\_tools\start-all.ps1` (Startup folder → `AJ-OS-StartAll.vbs`): `cloudflared tunnel run aj-engines` |
| Config | `%USERPROFILE%\.cloudflared\config.yml` (credentials file + cert live beside it — NEVER commit) |
| Zero Trust org | `AJ Digital` / `ajdigital.cloudflareaccess.com` (created 2026-06-12) |
| Access app | `AJ OS Homepage`, ID `d2381d80-b764-43dd-814b-9da33e89d012`, domain `home.ajdigital.app`, self-hosted, 24h session, launcher hidden |
| Access policy | `owner-only`, ID `d13a4a91-6760-4774-b498-2b7bae3984cb`, Allow by email (2 operator emails) |

## Hostname map

| Public hostname | Tunnel target | Notes |
|---|---|---|
| `home.ajdigital.app` | `http://localhost:80` (Traefik → Homepage) | **Access-protected** |
| `ajos-engine.ajdigital.app` | `http://localhost:7421` | dashboard engine (own auth, 401 unauthenticated) |
| `responseos-engine.ajdigital.app` | `http://localhost:7422` | engine |
| `audiojones-engine.ajdigital.app` | `http://localhost:7423` | engine |

Traefik side: `traefik/dynamic.yml` router `home` matches `home.ajdigital.app` alongside the LAN-only `*.agentos.local` names.

**Deliberately NOT exposed:** Traefik dashboard (`:8080`), Hermes API (`:7420` — unauthenticated), `dash.ajdigital.app` (separate Vercel product), admin/client portals (separate deployments).

## Operational notes

- Windows bind-mount inotify does not propagate into the Traefik container — after editing `dynamic.yml`, `docker restart aj-traefik` (the `watch: true` hot-reload does not fire on this host).
- After editing tunnel `config.yml`: `cloudflared tunnel ingress validate`, then restart the cloudflared process.
- New public hostname recipe: Access app first (if protection needed) → ingress rule above the 404 fallback → Traefik router rule → `cloudflared tunnel route dns aj-engines <hostname>` → restart cloudflared → verify.

## Verification (run anytime)

```powershell
curl.exe -s -o NUL -w "%{http_code}" -H "Host: home.ajdigital.app" http://localhost   # 200
curl.exe -s -o NUL -w "%{http_code}" https://home.ajdigital.app                        # 302 → ajdigital.cloudflareaccess.com
curl.exe -s -o NUL -w "%{http_code}" https://ajos-engine.ajdigital.app                 # 401
```

## Rollback

Remove the `home.ajdigital.app` ingress rule + Traefik Host clause, delete the DNS CNAME (`cloudflared tunnel route` has no delete — use dashboard/API), restart cloudflared + aj-traefik. Access app can stay (harmless without DNS) or be deleted via API.
