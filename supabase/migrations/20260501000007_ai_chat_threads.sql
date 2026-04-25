-- ============================================================================
-- AI chat threads
-- ----------------------------------------------------------------------------
-- Adds multi-conversation support to Aria. A thread groups messages so users
-- can keep separate chats (e.g. "Website setup" vs "Ad questions") instead of
-- one long stream. Existing messages are migrated into a "Default" thread per
-- user so nothing is lost.
-- ============================================================================

create table ai_chat_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  title           text not null default 'New chat',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on ai_chat_threads (user_id, updated_at desc);

alter table ai_chat_messages add column thread_id uuid references ai_chat_threads(id) on delete cascade;

-- Backfill: bucket every existing message into one "Default" thread per user.
do $$
declare
  rec record;
  new_thread_id uuid;
begin
  for rec in select distinct user_id, organization_id from ai_chat_messages where thread_id is null loop
    insert into ai_chat_threads (user_id, organization_id, title, created_at, updated_at)
    values (rec.user_id, rec.organization_id, 'Default', now(), now())
    returning id into new_thread_id;

    update ai_chat_messages
       set thread_id = new_thread_id
     where user_id = rec.user_id
       and (thread_id is null);
  end loop;
end $$;

alter table ai_chat_messages alter column thread_id set not null;

create index on ai_chat_messages (thread_id, created_at asc);

-- Keep thread updated_at fresh whenever a new message lands. Simple trigger
-- so the threads list can be sorted "most recent first" without a join.
create or replace function bump_thread_updated_at()
returns trigger
language plpgsql
as $$
begin
  update ai_chat_threads set updated_at = now() where id = new.thread_id;
  return new;
end $$;

create trigger ai_chat_messages_bump_thread
after insert on ai_chat_messages
for each row execute function bump_thread_updated_at();

-- RLS: same shape as ai_chat_messages. Users see only their own threads;
-- admins see all (mirrors the messages policy).
alter table ai_chat_threads enable row level security;

create policy "ai_chat_threads_select_own_or_admin"
  on ai_chat_threads for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "ai_chat_threads_insert_own"
  on ai_chat_threads for insert
  with check (auth.uid() = user_id);

create policy "ai_chat_threads_update_own_or_admin"
  on ai_chat_threads for update
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "ai_chat_threads_delete_own_or_admin"
  on ai_chat_threads for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
