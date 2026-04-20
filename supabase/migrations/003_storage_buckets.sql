-- Serenium Onboarding Portal — Storage buckets + policies
-- Run AFTER 002_rls_policies.sql
-- Storage objects live in `storage.objects`; we RLS them by bucket name + path.

-- ============================================================================
-- BUCKET: org-assets (client uploads — photos, videos, testimonials, docs)
-- Path convention: {organization_id}/{category}/{timestamp}-{filename}
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('org-assets', 'org-assets', false)
on conflict (id) do nothing;

-- ============================================================================
-- BUCKET: report-files (monthly report attachments)
-- Path convention: {organization_id}/{report_id}/{filename}
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('report-files', 'report-files', false)
on conflict (id) do nothing;

-- ============================================================================
-- BUCKET: welcome-video (global singleton upload)
-- Path: welcome/{filename}
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('welcome-video', 'welcome-video', false)
on conflict (id) do nothing;

-- ============================================================================
-- BUCKET: logos (publicly readable so client logos can embed anywhere)
-- Path: {organization_id}/{filename}
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- ============================================================================
-- STORAGE POLICIES — org-assets
-- Members of the org (from path first segment) can read/write their files.
-- Admins can access everything.
-- ============================================================================
drop policy if exists "org_assets_member_rw"  on storage.objects;
drop policy if exists "org_assets_admin_all"  on storage.objects;

create policy "org_assets_member_rw" on storage.objects
  for all using (
    bucket_id = 'org-assets'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'org-assets'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "org_assets_admin_all" on storage.objects
  for all using (bucket_id = 'org-assets' and public.is_admin());

-- ============================================================================
-- STORAGE POLICIES — report-files (members read, admin all)
-- ============================================================================
drop policy if exists "report_files_member_read" on storage.objects;
drop policy if exists "report_files_admin_all"   on storage.objects;

create policy "report_files_member_read" on storage.objects
  for select using (
    bucket_id = 'report-files'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "report_files_admin_all" on storage.objects
  for all using (bucket_id = 'report-files' and public.is_admin());

-- ============================================================================
-- STORAGE POLICIES — welcome-video (all authed can read, admin writes)
-- ============================================================================
drop policy if exists "welcome_video_auth_read" on storage.objects;
drop policy if exists "welcome_video_admin_all" on storage.objects;

create policy "welcome_video_auth_read" on storage.objects
  for select using (bucket_id = 'welcome-video' and auth.uid() is not null);

create policy "welcome_video_admin_all" on storage.objects
  for all using (bucket_id = 'welcome-video' and public.is_admin());

-- ============================================================================
-- STORAGE POLICIES — logos (public read; admin + owner write)
-- ============================================================================
drop policy if exists "logos_public_read"   on storage.objects;
drop policy if exists "logos_admin_write"   on storage.objects;
drop policy if exists "logos_member_write"  on storage.objects;

create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_admin_write" on storage.objects
  for all using (bucket_id = 'logos' and public.is_admin());

create policy "logos_member_write" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );
