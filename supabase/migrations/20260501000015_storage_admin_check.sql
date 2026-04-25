-- Storage admin policies were declared `for all using (...)` without a
-- matching `with check (...)`. Postgres treats `using` as a read filter
-- only — INSERT relies on `with check`, so admin uploads to the
-- report-files / org-assets / welcome-video buckets fail with
-- "new row violates row-level security policy". Re-create each policy
-- with both clauses.

drop policy if exists "report_files_admin_all" on storage.objects;
create policy "report_files_admin_all" on storage.objects
  for all
  using      (bucket_id = 'report-files' and public.is_admin())
  with check (bucket_id = 'report-files' and public.is_admin());

drop policy if exists "org_assets_admin_all" on storage.objects;
create policy "org_assets_admin_all" on storage.objects
  for all
  using      (bucket_id = 'org-assets' and public.is_admin())
  with check (bucket_id = 'org-assets' and public.is_admin());

drop policy if exists "welcome_video_admin_all" on storage.objects;
create policy "welcome_video_admin_all" on storage.objects
  for all
  using      (bucket_id = 'welcome-video' and public.is_admin())
  with check (bucket_id = 'welcome-video' and public.is_admin());
