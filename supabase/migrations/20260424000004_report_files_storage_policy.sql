-- Allow org members + admins to read report files at reports/{orgId}/...
-- Writes stay admin-only.

create policy "report files: members select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = 'reports'
    and (
      public.is_admin()
      or public.is_org_member(nullif(split_part(name, '/', 2), '')::uuid)
    )
  );

create policy "report files: admin write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = 'reports'
    and public.is_admin()
  );

create policy "report files: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = 'reports'
    and public.is_admin()
  );

create policy "report files: admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = 'reports'
    and public.is_admin()
  );
