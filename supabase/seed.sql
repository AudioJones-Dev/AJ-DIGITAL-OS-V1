-- AJ Digital OS CRM dev seed.
-- Intended for local/dev Supabase reset only. Do not run against production.
-- Includes duplicate object IDs across tenants to prove composite tenant keys.

select set_config('app.tenant_id', 'aj-client-alpha', false);
select set_config('app.actor_id', 'seed-system', false);
select set_config('app.actor_type', 'system', false);
select set_config('app.platform_admin_mode', 'false', false);

insert into public.crm_tenants (
  tenant_id, name, status, tenant_type, owner_user_id, business_profile_id, default_pipeline_id, metadata
) values (
  'aj-client-alpha', 'AJ Client Alpha', 'active', 'client', 'owner-alpha', 'bp-alpha', 'pipeline-main',
  '{"seed":"p2a","purpose":"active-client"}'
) on conflict (tenant_id) do nothing;

insert into public.crm_tenant_memberships (tenant_id, user_id, role, status, permissions)
values ('aj-client-alpha', 'owner-alpha', 'tenant_admin', 'active', array['crm:admin', 'crm:write'])
on conflict (tenant_id, user_id) do nothing;

insert into public.crm_tenant_settings (tenant_id, setting_key, setting_value)
values ('aj-client-alpha', 'timezone', '{"value":"America/New_York"}')
on conflict (tenant_id, setting_key) do nothing;

insert into public.crm_tenant_module_flags (tenant_id, module_key, enabled, configuration)
values ('aj-client-alpha', 'crm_core', true, '{"seed":true}')
on conflict (tenant_id, module_key) do nothing;

insert into public.crm_companies (tenant_id, company_id, name, domain, industry, owner_user_id)
values ('aj-client-alpha', 'company-shared-001', 'Alpha Service Co', 'alpha.example', 'home_services', 'owner-alpha')
on conflict (tenant_id, company_id) do nothing;

insert into public.crm_contacts (
  tenant_id, contact_id, company_id, first_name, last_name, email, phone, lifecycle_stage, owner_user_id, source, consent_status
) values (
  'aj-client-alpha', 'contact-shared-001', 'company-shared-001', 'Alex', 'Alpha', 'alex.alpha@example.test',
  '+15550001001', 'lead', 'owner-alpha', 'website', 'opted_in'
) on conflict (tenant_id, contact_id) do nothing;

insert into public.crm_pipelines (tenant_id, pipeline_id, name, object_type)
values ('aj-client-alpha', 'pipeline-main', 'Alpha Sales Pipeline', 'opportunity')
on conflict (tenant_id, pipeline_id) do nothing;

insert into public.crm_pipeline_stages (tenant_id, pipeline_id, stage_id, name, stage_order, probability)
values
  ('aj-client-alpha', 'pipeline-main', 'stage-new', 'New', 1, 0.10),
  ('aj-client-alpha', 'pipeline-main', 'stage-won', 'Won', 2, 1.00)
on conflict (tenant_id, pipeline_id, stage_id) do nothing;

insert into public.crm_leads (
  tenant_id, lead_id, contact_id, company_id, status, source, score, urgency, owner_user_id
) values (
  'aj-client-alpha', 'lead-shared-001', 'contact-shared-001', 'company-shared-001', 'qualified',
  'website', 82, 'high', 'owner-alpha'
) on conflict (tenant_id, lead_id) do nothing;

insert into public.crm_opportunities (
  tenant_id, opportunity_id, pipeline_id, stage_id, contact_id, company_id, value, currency, status
) values (
  'aj-client-alpha', 'opportunity-shared-001', 'pipeline-main', 'stage-new', 'contact-shared-001',
  'company-shared-001', 5000, 'USD', 'open'
) on conflict (tenant_id, opportunity_id) do nothing;

insert into public.crm_connector_accounts (
  tenant_id, connector_account_id, connector_id, provider, status, external_account_id, scopes, metadata
) values (
  'aj-client-alpha', 'connector-alpha-google', 'google-workspace', 'google', 'active',
  'alpha-workspace', array['calendar.readonly'], '{"seed":true}'
) on conflict (tenant_id, connector_account_id) do nothing;

insert into public.crm_connector_credentials (
  tenant_id, credential_id, connector_account_id, credential_label, vault_provider, vault_reference, status, scopes, metadata
) values (
  'aj-client-alpha', 'credential-alpha-google', 'connector-alpha-google', 'Alpha Google OAuth reference',
  'deferred', 'vault://dev/aj-client-alpha/google-workspace', 'active', array['calendar.readonly'], '{"credential_material_stored":false}'
) on conflict (tenant_id, credential_id) do nothing;

insert into public.crm_audit_events (
  tenant_id, event_id, event_type, actor_type, actor_id, risk_level, approval_status, object_type, object_id, payload
) values (
  'aj-client-alpha', 'audit-alpha-seed-001', 'seed_created', 'system', 'seed-system', 'L0',
  'not_required', 'tenant', 'aj-client-alpha', '{"seed":true}'
) on conflict (tenant_id, event_id) do nothing;

insert into public.crm_attribution_events (
  tenant_id, event_id, event_type, actor_type, actor_id, related_contact_id, related_lead_id, related_opportunity_id, source, metadata
) values (
  'aj-client-alpha', 'attr-alpha-seed-001', 'lead_created', 'system', 'seed-system',
  'contact-shared-001', 'lead-shared-001', 'opportunity-shared-001', 'seed', '{"seed":true}'
) on conflict (tenant_id, event_id) do nothing;

select set_config('app.tenant_id', 'aj-sandbox-demo', false);

insert into public.crm_tenants (
  tenant_id, name, status, tenant_type, owner_user_id, business_profile_id, default_pipeline_id, metadata
) values (
  'aj-sandbox-demo', 'AJ Sandbox Demo', 'sandbox', 'sandbox', 'owner-demo', 'bp-demo', 'pipeline-main',
  '{"seed":"p2a","purpose":"sandbox-demo"}'
) on conflict (tenant_id) do nothing;

insert into public.crm_tenant_memberships (tenant_id, user_id, role, status, permissions)
values ('aj-sandbox-demo', 'owner-demo', 'tenant_admin', 'active', array['crm:admin', 'crm:write'])
on conflict (tenant_id, user_id) do nothing;

insert into public.crm_companies (tenant_id, company_id, name, domain, industry, owner_user_id)
values ('aj-sandbox-demo', 'company-shared-001', 'Sandbox Service Co', 'sandbox.example', 'demo', 'owner-demo')
on conflict (tenant_id, company_id) do nothing;

insert into public.crm_contacts (
  tenant_id, contact_id, company_id, first_name, last_name, email, phone, lifecycle_stage, owner_user_id, source, consent_status
) values (
  'aj-sandbox-demo', 'contact-shared-001', 'company-shared-001', 'Sam', 'Sandbox', 'sam.sandbox@example.test',
  '+15550002001', 'lead', 'owner-demo', 'demo', 'unknown'
) on conflict (tenant_id, contact_id) do nothing;

insert into public.crm_pipelines (tenant_id, pipeline_id, name, object_type)
values ('aj-sandbox-demo', 'pipeline-main', 'Sandbox Sales Pipeline', 'opportunity')
on conflict (tenant_id, pipeline_id) do nothing;

insert into public.crm_pipeline_stages (tenant_id, pipeline_id, stage_id, name, stage_order, probability)
values
  ('aj-sandbox-demo', 'pipeline-main', 'stage-new', 'New', 1, 0.10),
  ('aj-sandbox-demo', 'pipeline-main', 'stage-won', 'Won', 2, 1.00)
on conflict (tenant_id, pipeline_id, stage_id) do nothing;

insert into public.crm_leads (
  tenant_id, lead_id, contact_id, company_id, status, source, score, urgency, owner_user_id
) values (
  'aj-sandbox-demo', 'lead-shared-001', 'contact-shared-001', 'company-shared-001', 'working',
  'demo', 55, 'medium', 'owner-demo'
) on conflict (tenant_id, lead_id) do nothing;

insert into public.crm_opportunities (
  tenant_id, opportunity_id, pipeline_id, stage_id, contact_id, company_id, value, currency, status
) values (
  'aj-sandbox-demo', 'opportunity-shared-001', 'pipeline-main', 'stage-new', 'contact-shared-001',
  'company-shared-001', 1200, 'USD', 'open'
) on conflict (tenant_id, opportunity_id) do nothing;
