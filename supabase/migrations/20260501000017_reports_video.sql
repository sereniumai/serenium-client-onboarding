-- Second client-facing video — shown to live clients on the reports
-- dashboard. Mirrors the welcome-video pattern (auto-open once per user,
-- re-watchable from the sidebar) but lives on a separate URL slot and a
-- separate seen-state table so the two videos stay independent.

alter table welcome_video
  add column if not exists reports_video_url text;

create table if not exists reports_video_seen (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  seen_at    timestamptz not null default now()
);

alter table reports_video_seen enable row level security;

drop policy if exists "reports_video_seen self read"  on reports_video_seen;
drop policy if exists "reports_video_seen self write" on reports_video_seen;

create policy "reports_video_seen self read"  on reports_video_seen for select using (auth.uid() = user_id);
create policy "reports_video_seen self write" on reports_video_seen for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
