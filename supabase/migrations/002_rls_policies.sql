-- Serenium Onboarding Portal — Row-Level Security
-- Run AFTER 001_initial_schema.sql

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function public.is_org_member(org_id uuid) returns boolean as $$
  select exists (
    select 1 from organization_members
    where user_id = auth.uid() and organization_id = org_id
  );
$$ language sql security definer stable;

-- ============================================================================
-- ENABLE RLS EVERYWHERE
-- ============================================================================
alter table profiles              enable row level security;
alter table organizations         enable row level security;
alter table organization_services enable row level security;
alter table organization_members  enable row level security;
alter table invitations           enable row level security;
alter table module_progress       enable row level security;
alter table task_completions      enable row level security;
alter table submissions           enable row level security;
alter table uploads               enable row level security;
alter table step_videos           enable row level security;
alter table welcome_video         enable row level security;
alter table monthly_reports       enable row level security;
alter table report_files          enable row level security;
alter table report_views          enable row level security;
alter table admin_notes           enable row level security;
alter table activity_log          enable row level security;

-- ============================================================================
-- PROFILES
-- ============================================================================
drop policy if exists "profiles_self_read"       on profiles;
drop policy if exists "profiles_self_update"     on profiles;
drop policy if exists "profiles_admin_all"       on profiles;
drop policy if exists "profiles_coworker_read"   on profiles;

create policy "profiles_self_read" on profiles
  for select using (id = auth.uid());

create policy "profiles_coworker_read" on profiles
  for select using (
    id in (
      select om.user_id from organization_members om
      where om.organization_id in (
        select organization_id from organization_members where user_id = auth.uid()
      )
    )
  );

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid());

create policy "profiles_admin_all" on profiles
  for all using (public.is_admin());

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
drop policy if exists "orgs_member_read" on organizations;
drop policy if exists "orgs_admin_all"   on organizations;

create policy "orgs_member_read" on organizations
  for select using (public.is_org_member(id));

create policy "orgs_admin_all" on organizations
  for all using (public.is_admin());

-- ============================================================================
-- ORGANIZATION SERVICES
-- ============================================================================
drop policy if exists "org_services_member_read" on organization_services;
drop policy if exists "org_services_admin_all"   on organization_services;

create policy "org_services_member_read" on organization_services
  for select using (public.is_org_member(organization_id));

create policy "org_services_admin_all" on organization_services
  for all using (public.is_admin());

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================
drop policy if exists "org_members_self_read"    on organization_members;
drop policy if exists "org_members_coworker_read" on organization_members;
drop policy if exists "org_members_admin_all"    on organization_members;

create policy "org_members_self_read" on organization_members
  for select using (user_id = auth.uid());

create policy "org_members_coworker_read" on organization_members
  for select using (public.is_org_member(organization_id));

create policy "org_members_admin_all" on organization_members
  for all using (public.is_admin());

-- ============================================================================
-- INVITATIONS (admin only, + public read-by-token for accept flow)
-- ============================================================================
drop policy if exists "invitations_admin_all" on invitations;
create policy "invitations_admin_all" on invitations
  for all using (public.is_admin());

-- ============================================================================
-- MODULE PROGRESS
-- ============================================================================
drop policy if exists "module_progress_member_all" on module_progress;
drop policy if exists "module_progress_admin_all"  on module_progress;

create policy "module_progress_member_all" on module_progress
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "module_progress_admin_all" on module_progress
  for all using (public.is_admin());

-- ============================================================================
-- TASK COMPLETIONS
-- ============================================================================
drop policy if exists "task_completions_member_all" on task_completions;
drop policy if exists "task_completions_admin_all"  on task_completions;

create policy "task_completions_member_all" on task_completions
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "task_completions_admin_all" on task_completions
  for all using (public.is_admin());

-- ============================================================================
-- SUBMISSIONS
-- ============================================================================
drop policy if exists "submissions_member_all" on submissions;
drop policy if exists "submissions_admin_all"  on submissions;

create policy "submissions_member_all" on submissions
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "submissions_admin_all" on submissions
  for all using (public.is_admin());

-- ============================================================================
-- UPLOADS
-- ============================================================================
drop policy if exists "uploads_member_all" on uploads;
drop policy if exists "uploads_admin_all"  on uploads;

create policy "uploads_member_all" on uploads
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "uploads_admin_all" on uploads
  for all using (public.is_admin());

-- ============================================================================
-- STEP VIDEOS (clients read, admins write)
-- ============================================================================
drop policy if exists "step_videos_auth_read"  on step_videos;
drop policy if exists "step_videos_admin_all"  on step_videos;

create policy "step_videos_auth_read" on step_videos
  for select using (auth.uid() is not null);

create policy "step_videos_admin_all" on step_videos
  for all using (public.is_admin());

-- ============================================================================
-- WELCOME VIDEO (all signed-in users can read, admins write)
-- ============================================================================
drop policy if exists "welcome_video_auth_read"  on welcome_video;
drop policy if exists "welcome_video_admin_all"  on welcome_video;

create policy "welcome_video_auth_read" on welcome_video
  for select using (auth.uid() is not null);

create policy "welcome_video_admin_all" on welcome_video
  for all using (public.is_admin());

-- ============================================================================
-- MONTHLY REPORTS
-- ============================================================================
drop policy if exists "monthly_reports_member_read" on monthly_reports;
drop policy if exists "monthly_reports_admin_all"   on monthly_reports;

create policy "monthly_reports_member_read" on monthly_reports
  for select using (public.is_org_member(organization_id));

create policy "monthly_reports_admin_all" on monthly_reports
  for all using (public.is_admin());

-- ============================================================================
-- REPORT FILES
-- ============================================================================
drop policy if exists "report_files_member_read" on report_files;
drop policy if exists "report_files_admin_all"   on report_files;

create policy "report_files_member_read" on report_files
  for select using (
    report_id in (
      select id from monthly_reports where public.is_org_member(organization_id)
    )
  );

create policy "report_files_admin_all" on report_files
  for all using (public.is_admin());

-- ============================================================================
-- REPORT VIEWS (per-user read tracking)
-- ============================================================================
drop policy if exists "report_views_self" on report_views;
create policy "report_views_self" on report_views
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- ADMIN NOTES (admin only — clients never see)
-- ============================================================================
drop policy if exists "admin_notes_admin_all" on admin_notes;
create policy "admin_notes_admin_all" on admin_notes
  for all using (public.is_admin());

-- ============================================================================
-- ACTIVITY LOG
-- ============================================================================
drop policy if exists "activity_log_member_read" on activity_log;
drop policy if exists "activity_log_insert_authed" on activity_log;
drop policy if exists "activity_log_admin_all"  on activity_log;

create policy "activity_log_member_read" on activity_log
  for select using (public.is_org_member(organization_id));

create policy "activity_log_insert_authed" on activity_log
  for insert with check (
    public.is_org_member(organization_id) or public.is_admin()
  );

create policy "activity_log_admin_all" on activity_log
  for all using (public.is_admin());
