-- ============================================================================
-- Serenium, admin audit logging
-- ============================================================================
-- Adds the enum values and tables needed to audit admin actions:
--   • admin invitation sends
--   • admin "view as client" impersonations
--   • admin toggling a module / service / field on or off
--   • admin marking a client live
--   • admin notes created
--   • general config changes
--
-- PIPEDA: if a client asks "who accessed my data when?", we now have a
-- defensible answer. Without this, every admin action is invisible.
-- ============================================================================

-- 1. Extend activity_action enum. Postgres enums are add-only and rely on
-- IF NOT EXISTS for idempotency.
alter type activity_action add value if not exists 'admin_invitation_sent';
alter type activity_action add value if not exists 'admin_viewed_as_client';
alter type activity_action add value if not exists 'admin_marked_live';
alter type activity_action add value if not exists 'admin_disabled_module';
alter type activity_action add value if not exists 'admin_enabled_module';
alter type activity_action add value if not exists 'admin_disabled_service';
alter type activity_action add value if not exists 'admin_enabled_service';
alter type activity_action add value if not exists 'admin_note_added';
alter type activity_action add value if not exists 'admin_note_updated';
alter type activity_action add value if not exists 'admin_note_deleted';
alter type activity_action add value if not exists 'admin_config_changed';
alter type activity_action add value if not exists 'admin_client_deleted';

-- 2. Impersonation audit table. Separate from activity_log so it's not lost
-- when a client's org is deleted, and so it's queryable independently for
-- compliance reports.
create table if not exists admin_impersonation_audit (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  started_at      timestamptz not null default now(),
  ip_address      text,
  user_agent      text
);

create index if not exists admin_impersonation_audit_org_idx
  on admin_impersonation_audit(organization_id, started_at desc);
create index if not exists admin_impersonation_audit_admin_idx
  on admin_impersonation_audit(admin_id, started_at desc);

alter table admin_impersonation_audit enable row level security;

-- Only admins can see this log. Clients never know impersonation happened,
-- but we retain a full record for our own audit + any regulator request.
create policy "impersonation_audit: admins all"
  on admin_impersonation_audit for all
  using (public.is_admin())
  with check (public.is_admin());
