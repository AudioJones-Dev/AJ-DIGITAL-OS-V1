-- 005 — Distribution Routing Layer
-- Phase 3: proof → distribution assets → queue → publish → metrics

-- ── Distribution Assets ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS distribution_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE,
  source_deliverable_id uuid REFERENCES deliverables(id) ON DELETE SET NULL,
  channel         text NOT NULL,
  format          text NOT NULL,
  title           text NOT NULL,
  content         text NOT NULL DEFAULT '',
  cta             text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'failed')),
  scheduled_at    timestamptz,
  published_at    timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_assets_client
  ON distribution_assets (client_id);
CREATE INDEX IF NOT EXISTS idx_distribution_assets_status
  ON distribution_assets (status);
CREATE INDEX IF NOT EXISTS idx_distribution_assets_source
  ON distribution_assets (source_deliverable_id);
CREATE INDEX IF NOT EXISTS idx_distribution_assets_scheduled
  ON distribution_assets (status, scheduled_at)
  WHERE status = 'scheduled';

-- ── Distribution Metrics ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS distribution_metrics (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_asset_id   uuid NOT NULL REFERENCES distribution_assets(id) ON DELETE CASCADE,
  channel                 text NOT NULL,
  impressions             integer NOT NULL DEFAULT 0,
  clicks                  integer NOT NULL DEFAULT 0,
  engagements             integer NOT NULL DEFAULT 0,
  leads                   integer NOT NULL DEFAULT 0,
  captured_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_metrics_asset
  ON distribution_metrics (distribution_asset_id);
CREATE INDEX IF NOT EXISTS idx_distribution_metrics_channel
  ON distribution_metrics (channel);
