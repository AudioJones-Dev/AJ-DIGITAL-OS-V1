-- AJ Digital OS — Operating Schema v1
-- Run with: node dist/cli.js db-migrate
--
-- Production-grade Postgres schema for the file-backed stores that
-- previously lived under runtime/ and data/. Tables are created
-- additively — re-running this script is safe.

-- ─── Control Runs ──────────────────────────────────────────────────
-- Replaces runtime/control-runs.json

CREATE TABLE IF NOT EXISTS control_runs (
  run_id          TEXT PRIMARY KEY,
  agent_id        TEXT NOT NULL,
  control_state   TEXT NOT NULL,
  previous_state  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by     TEXT,
  cancelled_by    TEXT,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_control_runs_state ON control_runs(control_state);
CREATE INDEX IF NOT EXISTS idx_control_runs_agent ON control_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_control_runs_created ON control_runs(created_at DESC);

-- ─── Approvals ─────────────────────────────────────────────────────
-- Replaces data/security/approvals.json

CREATE TABLE IF NOT EXISTS approvals (
  approval_id              TEXT PRIMARY KEY,
  requested_at             TIMESTAMPTZ NOT NULL,
  expires_at               TIMESTAMPTZ NOT NULL,
  requested_by_agent_id    TEXT NOT NULL,
  permission_level         INTEGER NOT NULL,
  action_category          TEXT NOT NULL,
  risk                     TEXT NOT NULL,
  reason                   TEXT NOT NULL,
  target                   TEXT,
  command                  TEXT,
  client_id                TEXT,
  environment              TEXT NOT NULL DEFAULT 'local',
  status                   TEXT NOT NULL DEFAULT 'pending',
  approved_by              TEXT,
  approval_channel         TEXT,
  audit_id                 TEXT
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_agent ON approvals(requested_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_approvals_expires ON approvals(expires_at);

-- ─── DAG Runs ──────────────────────────────────────────────────────
-- Replaces runtime/dag/dag-runs.json

CREATE TABLE IF NOT EXISTS dag_runs (
  run_id      TEXT PRIMARY KEY,
  dag_id      TEXT NOT NULL,
  tenant_id   TEXT,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  environment TEXT,
  nodes       JSONB NOT NULL DEFAULT '[]',
  edges       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dag_runs_status ON dag_runs(status);
CREATE INDEX IF NOT EXISTS idx_dag_runs_tenant ON dag_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dag_runs_dag ON dag_runs(dag_id);
CREATE INDEX IF NOT EXISTS idx_dag_runs_created ON dag_runs(created_at DESC);
