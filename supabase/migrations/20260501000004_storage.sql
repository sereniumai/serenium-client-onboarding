-- ============================================================================
-- Serenium — Storage bucket + access policies
-- ============================================================================
-- Files are stored in a private bucket named `uploads`. Path convention:
--   orgs/{organization_id}/{uuid}-{filename}
--
-- RLS on storage.objects scopes access by the organization_id embedded in the
-- object's name. Members of that org can upload/read/delete; admins can
-- access everything.
-- ============================================================================

-- ─── Bucket ─────────────────────────────────────────────────────────────────
-- 10 MB per file, private. MIME restrictions left null (we allow anything;
-- client-side validation gates what actually gets uploaded).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 10485760, null)
on conflict (id) do nothing;

-- ─── Policies ───────────────────────────────────────────────────────────────

create policy "uploads: members insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = 'orgs'
    and public.is_org_member(nullif(split_part(name, '/', 2), '')::uuid)
  );

create policy "uploads: members select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'uploads'
    and (
      public.is_admin()
      or (
        split_part(name, '/', 1) = 'orgs'
        and public.is_org_member(nullif(split_part(name, '/', 2), '')::uuid)
      )
    )
  );

create policy "uploads: members delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'uploads'
    and (
      public.is_admin()
      or (
        split_part(name, '/', 1) = 'orgs'
        and public.is_org_member(nullif(split_part(name, '/', 2), '')::uuid)
      )
    )
  );

create policy "uploads: members update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'uploads'
    and (
      public.is_admin()
      or (
        split_part(name, '/', 1) = 'orgs'
        and public.is_org_member(nullif(split_part(name, '/', 2), '')::uuid)
      )
    )
  );
