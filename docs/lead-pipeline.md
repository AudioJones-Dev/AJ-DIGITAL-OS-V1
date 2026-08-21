# Lead Pipeline — Florida Platform Lift Pros

Production-ready lead capture, storage, email notification, and lightweight CRM for **Florida Platform Lift Pros**.

---

## Architecture

```
Web Form (POST /api/leads)
        │
        ▼
  Zod Validation
        │
        ▼
  Lead Normalisation
  (phone / email)
        │
        ▼
  Lead Storage Provider ──────────────────────────────┐
  (lead-storage.ts)                                   │
  │                                                   │
  ├── LEAD_STORAGE_PROVIDER=mock   →  In-memory store │
  └── LEAD_STORAGE_PROVIDER=neon   →  Neon/Postgres   │
                                                      │
  ┌───────────────────────────────────────────────────┘
  │
  ▼
Resend Email Alert
(lead-email.ts)
  → sends to INTERNAL_ALERT_EMAIL
  → fail-open: lead stored even if email fails

Admin CRM (GET /admin/leads)
  → ADMIN_ACCESS_TOKEN guard
  → HTML dashboard or JSON (?format=json)

PATCH /api/leads/:id
  → update status / priority / notes / assigned_to
  → ADMIN_ACCESS_TOKEN guard
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Production | Postgres connection string (Neon recommended) |
| `LEAD_STORAGE_PROVIDER` | Always | `neon` (production) or `mock` (dev only) |
| `RESEND_API_KEY` | Production | Resend API key for email alerts |
| `INTERNAL_ALERT_EMAIL` | Production | Recipient for new-lead alerts (default: `contact@floridaplatformliftpros.com`) |
| `DEFAULT_FROM_EMAIL` | Production | Sender address for email alerts |
| `ADMIN_ACCESS_TOKEN` | Production | Token to protect `/admin/leads` and `PATCH /api/leads/:id` |
| `NEXT_PUBLIC_SITE_URL` | Optional | Site URL constant |
| `NEXT_PUBLIC_BUSINESS_PHONE` | Optional | Phone constant |
| `NEXT_PUBLIC_BUSINESS_EMAIL` | Optional | Email constant |

---

## Local Mock Mode

For local development, set:

```env
LEAD_STORAGE_PROVIDER=mock
```

Leads are stored in memory only — no database required. The mock store is cleared on server restart.

> **Warning:** The mock provider is automatically blocked in production. If `NODE_ENV=production` and `LEAD_STORAGE_PROVIDER=mock`, the server will throw at startup:
> ```
> Mock lead storage is not allowed in production.
> ```

---

## Production Database Mode (Neon)

1. Create a Neon project at [neon.tech](https://neon.tech).
2. Run the leads migration:
   ```sql
   -- paste contents of sql/006-leads.sql
   ```
3. Set env vars:
   ```env
   DATABASE_URL=postgres://user:pass@host/dbname?sslmode=require
   LEAD_STORAGE_PROVIDER=neon
   ```

The `DATABASE_URL` is used for leads. If `DATABASE_URL` is not set, it falls back to `NEON_DATABASE_URL`.

---

## Lead Submission API

### `POST /api/leads`

Submit a new lead from any web form.

**Required fields** (at least one of each group):
- Name: `name` OR `firstName` / `first_name`
- Contact: `email` OR `phone`
- Intent: `serviceNeeded` / `service_needed`

**Optional fields:**
`lastName`, `county`, `city`, `propertyType`, `timeline`, `message`, `leadSourcePage`, `utmSource`, `utmMedium`, `utmCampaign`

**Success response:**
```json
{ "ok": true, "id": "uuid-of-lead", "errors": [] }
```

**Validation error:**
```json
{ "ok": false, "id": null, "errors": ["serviceNeeded: Required"] }
```

---

## Resend Notification Flow

When a lead is submitted:

1. Lead is stored first (fail-safe order)
2. `sendLeadAlert(lead)` is called asynchronously
3. Email is sent to `INTERNAL_ALERT_EMAIL` via Resend HTTP API
4. If Resend fails:
   - The API response is **not** affected
   - Error is logged safely (no API keys or secrets logged)
   - Lead is already stored

Email subject format:
```
New Florida Platform Lift Pros Lead — [service_needed]
```

---

## Admin CRM Dashboard

### `GET /admin/leads`

Protected admin page showing all leads.

**Authentication:**
- Pass `?token=<ADMIN_ACCESS_TOKEN>` in the query string
- OR send `X-Admin-Token: <value>` header

**Responses:**
- HTML dashboard (default)
- JSON: add `?format=json` or `Accept: application/json` header

**Development behaviour:** If `ADMIN_ACCESS_TOKEN` is not set, access is permitted with a warning banner in the UI.

**Production behaviour:** If `ADMIN_ACCESS_TOKEN` is not set, access is denied.

---

## CRM Actions API

### `PATCH /api/leads/:id`

Update a lead's CRM fields.

**Authentication:** same as admin dashboard (token required in production).

**Updatable fields:**
| Field | Values |
|---|---|
| `status` | `new`, `contacted`, `qualified`, `estimate_scheduled`, `estimate_sent`, `won`, `lost`, `spam` |
| `priority` | `low`, `normal`, `high`, `urgent` |
| `notes` | free text (max 5000 chars) |
| `assigned_to` | assignee name/email |

**Example:**
```bash
curl -X PATCH http://localhost:7420/api/leads/<id>?token=<token> \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted","priority":"high"}'
```

---

## Database Schema

See `sql/006-leads.sql` for the full schema.

**Key fields:**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, auto-generated |
| `email` | TEXT NOT NULL | Required |
| `status` | TEXT | Enum, default `new` |
| `priority` | TEXT | Enum, default `normal` |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

---

## Manual QA Checklist

- [ ] Submit a lead via `POST /api/leads` — check `ok: true` and `id` returned
- [ ] Check lead appears in `/admin/leads?token=<token>`
- [ ] Verify email alert received at `INTERNAL_ALERT_EMAIL`
- [ ] Update lead status via `PATCH /api/leads/<id>?token=<token>`
- [ ] Confirm `LEAD_STORAGE_PROVIDER=mock` + `NODE_ENV=production` throws startup error
- [ ] Confirm no `.env.local`, `.env`, or real API keys committed to Git
- [ ] Confirm `npm run build` passes with no new errors
- [ ] Confirm `/admin/leads` returns 401 in production when `ADMIN_ACCESS_TOKEN` unset
- [ ] Verify Resend failure does not break lead submission (test with invalid key)
