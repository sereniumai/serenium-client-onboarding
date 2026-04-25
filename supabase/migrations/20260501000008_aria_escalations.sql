-- ============================================================================
-- Aria escalations
-- ----------------------------------------------------------------------------
-- When Aria can't answer something and flags it to the Serenium team, we log
-- it here. The admin sees a bell + a per-client tab; the team gets an email
-- with deep-links. "Resolved" is set when the team marks it handled.
-- ============================================================================

create table aria_escalations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  thread_id       uuid references ai_chat_threads(id) on delete set null,
  question        text not null,
  context_snippet text,
  page_context    text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references profiles(id) on delete set null
);

create index on aria_escalations (organization_id, created_at desc);
create index on aria_escalations (resolved_at) where resolved_at is null;

alter table aria_escalations enable row level security;

-- Clients can insert their own escalations (Aria writes via the user's session
-- in the edge function, using the service role we'll bypass RLS). Read access
-- is admin-only — clients don't need to see this list.
create policy "aria_escalations_insert_own"
  on aria_escalations for insert
  with check (auth.uid() = user_id);

create policy "aria_escalations_select_admin"
  on aria_escalations for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "aria_escalations_update_admin"
  on aria_escalations for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "aria_escalations_delete_admin"
  on aria_escalations for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
