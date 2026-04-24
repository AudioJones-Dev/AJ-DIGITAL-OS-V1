# AJ Digital OS — Dashboard

Internal operator dashboard for AJ Digital OS. Built with Next.js 14 App Router + Tailwind CSS.

## Views

| Route | Description |
|---|---|
| `/runs` | Run list — Run ID, status badge, started-at |
| `/runs/[runId]` | Run detail — steps, observations, failures, timeline |
| `/hermes` | Hermes status — mission list + BEL capabilities |
| `/opportunities` | Intelligence opportunities from Hermes API |

## Getting started

```bash
cd dashboard
npm install
npm run dev        # http://localhost:3000
```

## Environment variables

Create `dashboard/.env.local` (or set in your environment):

```env
# Neon data layer (required for /runs)
NEON_DATABASE_URL=postgres://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require

# Hermes status API (defaults to http://localhost:3001)
HERMES_API_URL=http://localhost:3001
```

## Build

```bash
npm run build
npm start
```
