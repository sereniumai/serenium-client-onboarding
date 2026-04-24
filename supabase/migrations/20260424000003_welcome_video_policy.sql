-- Allow any authenticated user to read + list welcome videos.
-- Writes still go through admin-only RLS.

create policy "welcome video: authenticated read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'uploads'
    and name like 'welcome/%'
  );

create policy "welcome video: admin write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and name like 'welcome/%'
    and public.is_admin()
  );

create policy "welcome video: admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'uploads'
    and name like 'welcome/%'
    and public.is_admin()
  );

create policy "welcome video: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'uploads'
    and name like 'welcome/%'
    and public.is_admin()
  );
