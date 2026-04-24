-- ============================================================================
-- Serenium — Row Level Security policies
-- ============================================================================
-- Every table gets RLS turned on, plus policies that implement:
--   • Clients see only their org's data
--   • Admins see everything
--   • Users own their own profile / AI chat / welcome-video state
-- Without this, any signed-in user could query any other client's data.
-- ============================================================================

-- ─── Helpers ────────────────────────────────────────────────────────────────

-- Is the current user an admin?
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Is the current user a member of the given organization?
create or replace function is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

-- ─── Turn RLS on for every table ────────────────────────────────────────────
alter table profiles                enable row level security;
alter table organizations           enable row level security;
alter table organization_members    enable row level security;
alter table organization_services   enable row level security;
alter table invitations             enable row level security;
alter table module_progress         enable row level security;
alter table task_completions        enable row level security;
alter table submissions             enable row level security;
alter table uploads                 enable row level security;
alter table activity_log            enable row level security;
alter table admin_notes             enable row level security;
alter table monthly_reports         enable row level security;
alter table report_views            enable row level security;
alter table step_videos             enable row level security;
alter table welcome_video           enable row level security;
alter table welcomed_users          enable row level security;
alter table admin_flags             enable row level security;
alter table retell_numbers          enable row level security;
alter table followup_settings       enable row level security;
alter table followups_sent          enable row level security;
alter table ai_chat_messages        enable row level security;
alter table team_notifications_sent enable row level security;

-- ─── profiles ───────────────────────────────────────────────────────────────
create policy "profile: self read"        on profiles for select using (id = auth.uid());
create policy "profile: admin read"       on profiles for select using (is_admin());
create policy "profile: self update"      on profiles for update using (id = auth.uid());
create policy "profile: admin update"     on profiles for update using (is_admin());
-- INSERT handled by the on_auth_user_created trigger (security-definer).

-- ─── organizations ──────────────────────────────────────────────────────────
create policy "org: members read"         on organizations for select using (is_org_member(id) or is_admin());
create policy "org: admins all"           on organizations for all    using (is_admin()) with check (is_admin());

-- ─── organization_members ───────────────────────────────────────────────────
create policy "members: read fellow"      on organization_members for select using (is_org_member(organization_id) or is_admin());
create policy "members: admins all"       on organization_members for all    using (is_admin()) with check (is_admin());

-- ─── organization_services ──────────────────────────────────────────────────
create policy "services: members read"    on organization_services for select using (is_org_member(organization_id) or is_admin());
create policy "services: admins all"      on organization_services for all    using (is_admin()) with check (is_admin());

-- ─── invitations ────────────────────────────────────────────────────────────
-- Admins only. Signup uses a service-role edge function that bypasses RLS to
-- exchange a token for a profile row + membership.
create policy "invites: admins all"       on invitations for all using (is_admin()) with check (is_admin());

-- ─── module_progress / task_completions / submissions / uploads ─────────────
create policy "progress: members select" on module_progress for select using (is_org_member(organization_id) or is_admin());
create policy "progress: members write"  on module_progress for all    using (is_org_member(organization_id) or is_admin())
                                                                         with check (is_org_member(organization_id) or is_admin());

create policy "tasks: members select"    on task_completions for select using (is_org_member(organization_id) or is_admin());
create policy "tasks: members write"     on task_completions for all    using (is_org_member(organization_id) or is_admin())
                                                                         with check (is_org_member(organization_id) or is_admin());

create policy "subs: members select"     on submissions for select using (is_org_member(organization_id) or is_admin());
create policy "subs: members write"      on submissions for all    using (is_org_member(organization_id) or is_admin())
                                                                     with check (is_org_member(organization_id) or is_admin());

create policy "uploads: members select"  on uploads for select using (is_org_member(organization_id) or is_admin());
create policy "uploads: members write"   on uploads for all    using (is_org_member(organization_id) or is_admin())
                                                                 with check (is_org_member(organization_id) or is_admin());

-- ─── activity_log ───────────────────────────────────────────────────────────
create policy "activity: members read"   on activity_log for select using (is_org_member(organization_id) or is_admin());
create policy "activity: members write"  on activity_log for insert with check (is_org_member(organization_id) or is_admin());

-- ─── admin_notes (admin-only — invisible to clients) ────────────────────────
create policy "notes: admins all"        on admin_notes for all using (is_admin()) with check (is_admin());

-- ─── monthly_reports ────────────────────────────────────────────────────────
create policy "reports: members read"    on monthly_reports for select using (is_org_member(organization_id) or is_admin());
create policy "reports: admins write"    on monthly_reports for all    using (is_admin()) with check (is_admin());

-- ─── report_views (users own their own) ─────────────────────────────────────
create policy "report_views: own"        on report_views for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── step_videos (all authenticated can read, admins write) ─────────────────
create policy "step_videos: read"        on step_videos for select using (auth.role() = 'authenticated');
create policy "step_videos: admin write" on step_videos for all    using (is_admin()) with check (is_admin());

-- ─── welcome_video ──────────────────────────────────────────────────────────
create policy "welcome_video: read"        on welcome_video for select using (auth.role() = 'authenticated');
create policy "welcome_video: admin write" on welcome_video for all    using (is_admin()) with check (is_admin());

-- ─── welcomed_users (users own their own dismissal state) ───────────────────
create policy "welcomed_users: own"      on welcomed_users for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── admin_flags ────────────────────────────────────────────────────────────
-- Members need to read their org's flags (to know whether locked modules are unlocked).
create policy "flags: members read"      on admin_flags for select using (is_org_member(organization_id) or is_admin());
create policy "flags: admins write"      on admin_flags for all    using (is_admin()) with check (is_admin());

-- ─── retell_numbers ─────────────────────────────────────────────────────────
create policy "retell: members read"     on retell_numbers for select using (is_org_member(organization_id) or is_admin());
create policy "retell: admins write"     on retell_numbers for all    using (is_admin()) with check (is_admin());

-- ─── followup_settings / followups_sent (admin-only) ────────────────────────
create policy "followup_settings: admin" on followup_settings for all using (is_admin()) with check (is_admin());
create policy "followups_sent: admin"    on followups_sent    for all using (is_admin()) with check (is_admin());

-- ─── ai_chat_messages ──────────────────────────────────────────────────────
-- Each user can read/write their own chat. Admins read all for training/QA.
create policy "chat: own read"           on ai_chat_messages for select using (user_id = auth.uid() or is_admin());
create policy "chat: own write"          on ai_chat_messages for insert with check (user_id = auth.uid());
create policy "chat: own update"         on ai_chat_messages for update using (user_id = auth.uid());
create policy "chat: own delete"         on ai_chat_messages for delete using (user_id = auth.uid() or is_admin());

-- ─── team_notifications_sent (admin-only, written by edge functions) ────────
create policy "team_notifs: admin"       on team_notifications_sent for all using (is_admin()) with check (is_admin());
