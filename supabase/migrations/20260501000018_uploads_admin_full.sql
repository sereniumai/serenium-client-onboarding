-- The reports admin uploads to the `uploads` bucket at path `reports/{orgId}/...`.
-- The 20260501000004 storage migration only granted write to paths starting
-- with `orgs/` for org members. Reports paths fall outside that and the older
-- 20260424 admin-write policy never made it onto prod (or got dropped).
-- Add a single permissive policy: admins can do anything in the `uploads`
-- bucket. Org-member scoped policies stay untouched for non-admin paths.

drop policy if exists "uploads: admin all" on storage.objects;

create policy "uploads: admin all"
  on storage.objects
  for all
  to authenticated
  using      (bucket_id = 'uploads' and public.is_admin())
  with check (bucket_id = 'uploads' and public.is_admin());
