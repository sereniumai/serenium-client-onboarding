-- ============================================================================
-- Serenium — pre-launch production verification pack
-- ============================================================================
-- Run this in the Supabase SQL editor before inviting real clients.
-- Every section should return either empty, zero, or a happy-path row.
-- If anything is red-flag, see the comment next to the query.
-- ============================================================================

-- ─── 1. RLS coverage ────────────────────────────────────────────────────────
-- Any tables in public schema with RLS OFF? Must be empty.
select tablename
from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- ─── 2. Missing policies ────────────────────────────────────────────────────
-- Any tables with RLS ON but zero policies? Also must be empty (those tables
-- are effectively unreadable, which is usually a bug in the migration).
select t.tablename
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public' and t.rowsecurity = true
group by t.tablename
having count(p.policyname) = 0;

-- ─── 3. Profile trigger installed ──────────────────────────────────────────
-- Must return exactly 1 row.
select tgname, tgrelid::regclass as table, proname as function
from pg_trigger
join pg_proc on pg_proc.oid = pg_trigger.tgfoid
where tgname = 'on_auth_user_created';

-- ─── 4. Profile + user counts match ────────────────────────────────────────
-- user_count must equal profile_count. Mismatch means the trigger didn't
-- fire for some users, backfill them.
select
  (select count(*) from auth.users) as user_count,
  (select count(*) from public.profiles) as profile_count,
  (select count(*) from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null) as missing_profiles;

-- ─── 5. is_admin / is_org_member helpers are security definer ─────────────
-- Both rows should show prosecdef = true.
select proname, prosecdef as security_definer, provolatile as volatility
from pg_proc
where proname in ('is_admin', 'is_org_member') and pronamespace = 'public'::regnamespace;

-- ─── 6. Orphan organization_members ────────────────────────────────────────
-- Must be empty. Dangling rows mean a user_id or organization_id got deleted
-- without the FK catching it.
select om.user_id, om.organization_id
from public.organization_members om
left join auth.users u on u.id = om.user_id
left join public.organizations o on o.id = om.organization_id
where u.id is null or o.id is null;

-- ─── 7. Expired-but-unused invitations count ──────────────────────────────
-- Informational. High numbers mean clients aren't clicking invite links.
select count(*) as expired_pending_invitations
from public.invitations
where expires_at < now() and accepted_at is null;

-- ─── 8. Users with no org membership ──────────────────────────────────────
-- Informational. Clients without an org can't use the portal. Usually this
-- is just the admin account (contact@sereniumai.com) and is fine.
select u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
left join public.organization_members om on om.user_id = u.id
where om.organization_id is null
order by u.email;

-- ─── 9. Storage buckets + policies ─────────────────────────────────────────
-- Review which buckets exist and whether they're public. Onboarding buckets
-- should all be non-public.
select id, name, public, file_size_limit, allowed_mime_types, created_at
from storage.buckets
order by name;

-- ─── 10. Any row in team_notifications_sent yet? ───────────────────────────
-- Informational. Should grow as clients complete modules.
select count(*) as team_notifications_fired
from public.team_notifications_sent;

-- ─── 11. Admin impersonation audit table exists ────────────────────────────
-- Should return 1. If 0, run migration 20260424000005_admin_audit.sql.
select count(*) as table_exists
from information_schema.tables
where table_schema = 'public' and table_name = 'admin_impersonation_audit';

-- ─── 12. Latest 10 activity rows across the system ─────────────────────────
-- Sanity check that activity logging is producing rows.
select created_at, action, organization_id, user_id, metadata
from public.activity_log
order by created_at desc
limit 10;
