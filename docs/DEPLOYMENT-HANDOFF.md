# AJ Digital OS — Production Deployment Handoff

## What Copilot Completed (local repo)

| # | Task | Status |
|---|------|--------|
| 1 | Renamed `SUPABASE_ANON_KEY` → `SUPABASE_SERVICE_ROLE_KEY` everywhere | ✅ Done |
| 2 | Added production config guards in `src/server.ts` (fail-fast on missing env vars) | ✅ Done |
| 3 | Created `src/scripts/validate-production-ready.ts`; run it after build with `node --import ./dist/env.js dist/scripts/validate-production-ready.js` | ✅ Done |
| 4 | Verified Dockerfile, docker-compose.yml, Procfile, .dockerignore are current | ✅ Done |
| 5 | Audited logging — no secrets printed to stdout/stderr | ✅ Done |
| 6 | Documented explicit production-local sequence (`npm run build` -> validation script -> `node dist/server.js`); no dedicated npm alias exists in current `package.json` | ✅ Done |
| 7 | This deployment handoff document | ✅ Done |

---

## Required Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (not anon key) |
| `STRIPE_SECRET_KEY` | Yes | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` from Stripe dashboard |
| `NODE_ENV` | Recommended | Set to `production` |
| `HERMES_BIND_HOST` | Recommended | `0.0.0.0` in production (default: `127.0.0.1`) |
| `HERMES_STATUS_PORT` | Optional | HTTP port (default: `7420`) |

---

## NPM Scripts Reference

```bash
npm run build                   # TypeScript → dist/
node --import ./dist/env.js dist/scripts/validate-supabase-schema.js  # Check all 7 Supabase tables exist
node --import ./dist/env.js dist/scripts/validate-production-ready.js # Full production readiness check
node dist/server.js              # Start server after build/validation
```

---

## Deployment Options

### Docker (recommended)

```bash
docker compose up --build -d
```

- `docker-compose.yml` sets `HERMES_BIND_HOST=0.0.0.0` and `NODE_ENV=production`
- Health check: `GET /status` on port 7420
- Env vars loaded from `.env` file

### Heroku / Railway / Render

```bash
git push heroku main
```

- Uses `Procfile`: `web: node dist/server.js`
- Set env vars in the platform dashboard
- Set `HERMES_BIND_HOST=0.0.0.0`

### Manual / VPS

```bash
npm ci
npm run build
NODE_ENV=production HERMES_BIND_HOST=0.0.0.0 node dist/server.js
```

---

## Pre-Deployment Checklist (Manual Steps)

These items **cannot** be done by Copilot and require manual action:

- [ ] **Rotate all secrets** — Supabase service role key, Stripe keys, and webhook secret were exposed during development. Generate new ones before go-live.
- [ ] **Configure Stripe webhook endpoint** — In Stripe Dashboard → Webhooks, create an endpoint pointing to `https://<your-domain>/api/stripe/webhook` listening for `checkout.session.completed`.
- [ ] **Verify Supabase RLS policies** — Ensure service role key has write access to all 7 tables.
- [ ] **Set DNS / domain** — Point your domain to the deployment host.
- [ ] **Enable HTTPS** — Use a reverse proxy (nginx, Caddy) or platform-provided TLS.
- [ ] **Run `node --import ./dist/env.js dist/scripts/validate-production-ready.js`** on the deployed environment to confirm all checks pass.

---

## Architecture Quick Reference

```
Client Browser → Stripe Checkout → Stripe Webhook → POST /api/stripe/webhook
                                                      ↓
                                                Hermes Server (port 7420)
                                                      ↓
                                              Supabase PostgREST
                                              (7 tables via RLS)
```

**Routes:**
- `GET /status` — Health check
- `POST /api/stripe/webhook` — Stripe webhook handler (provisions client + agents)
- `POST /api/stripe/create-checkout-session` — Creates Stripe checkout
- `GET /replay/:runRef` — Mission run replay
- `GET /repairs` — Repair engine status

**Tables:** `clients`, `subscriptions`, `client_agents`, `missions`, `mission_runs`, `deliverables`, `assets`
