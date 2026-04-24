-- Safety migration: ensures report_files has RLS policies even if the DB was
-- initialized from the 20260501* lineage (which previously omitted them).
-- Idempotent — safe to run on a DB where 002_rls_policies.sql already applied.

alter table if exists report_files enable row level security;

drop policy if exists "report_files_member_read" on report_files;
drop policy if exists "report_files_admin_all"   on report_files;

create policy "report_files_member_read" on report_files
  for select using (
    report_id in (
      select id from monthly_reports where public.is_org_member(organization_id)
    )
  );

create policy "report_files_admin_all" on report_files
  for all using (public.is_admin()) with check (public.is_admin());
