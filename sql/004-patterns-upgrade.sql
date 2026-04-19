-- Patterns Table Upgrade — Cross-Client Learning Support
-- Migration: 004-patterns-upgrade
-- Adds columns to Neon patterns table for actionable intelligence
--
-- NOTE: This migration targets the Neon data layer.
-- The patterns table lives in Neon (not Supabase).
-- Apply via Neon SQL console or direct pg connection.

-- ─── Column Additions: patterns ────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'patterns' and column_name = 'applies_to_mission_type'
  ) then
    alter table patterns add column applies_to_mission_type text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'patterns' and column_name = 'applies_to_tier'
  ) then
    alter table patterns add column applies_to_tier text
      check (applies_to_tier in ('standard', 'professional', 'enterprise'));
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'patterns' and column_name = 'action_taken'
  ) then
    alter table patterns add column action_taken jsonb;
  end if;
end $$;

-- ─── Indexes for cross-client pattern queries ──────────────────────

create index if not exists idx_patterns_mission_type
  on patterns (applies_to_mission_type);

create index if not exists idx_patterns_tier
  on patterns (applies_to_tier);

create index if not exists idx_patterns_confidence
  on patterns (confidence);
