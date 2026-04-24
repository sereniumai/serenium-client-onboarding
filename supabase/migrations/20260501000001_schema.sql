-- ============================================================================
-- Serenium onboarding portal — initial schema
-- ============================================================================
-- Mirror of src/types/index.ts + the storage shape currently served by mockDb.
-- Run first. RLS policies come in the next migration.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─── Enum types ─────────────────────────────────────────────────────────────
create type org_status      as enum ('onboarding','live','paused','churned');
create type org_plan        as enum ('starter','pro','custom');
create type member_role     as enum ('owner','member');
create type module_status   as enum ('not_started','in_progress','complete');
create type user_role       as enum ('admin','client');
create type activity_action as enum (
  'step_completed','step_reopened','file_uploaded','field_submitted',
  'report_published','report_updated','report_deleted',
  'service_enabled','service_disabled','member_joined','followup_sent'
);
create type followup_mode   as enum ('manual','auto');
create type chat_role       as enum ('user','assistant');

-- ─── profiles ───────────────────────────────────────────────────────────────
-- One row per auth.users. Created automatically by the trigger in migration 0003.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  email      text not null unique,
  role       user_role not null default 'client',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ─── organizations ──────────────────────────────────────────────────────────
create table organizations (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  business_name          text not null,
  logo_url               text,
  primary_contact_name   text,
  primary_contact_email  text,
  primary_contact_phone  text,
  status                 org_status not null default 'onboarding',
  plan                   org_plan,
  tags                   text[] default '{}',
  go_live_date           timestamptz,
  created_at             timestamptz not null default now()
);

create index on organizations (status);

-- ─── organization_members ───────────────────────────────────────────────────
create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id)      on delete cascade,
  role            member_role not null default 'member',
  invited_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  primary key (organization_id, user_id)
);

create index on organization_members (user_id);

-- ─── organization_services ──────────────────────────────────────────────────
create table organization_services (
  organization_id       uuid not null references organizations(id) on delete cascade,
  service_key           text not null,
  enabled               boolean not null default true,
  enabled_at            timestamptz not null default now(),
  disabled_module_keys  text[] default '{}',
  disabled_field_keys   text[] default '{}',
  primary key (organization_id, service_key)
);

-- ─── invitations ────────────────────────────────────────────────────────────
create table invitations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  email            text not null,
  full_name        text,
  role             member_role not null default 'member',
  token            text not null unique,
  expires_at       timestamptz not null,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index on invitations (token);
create index on invitations (organization_id);

-- ─── module_progress ────────────────────────────────────────────────────────
create table module_progress (
  organization_id uuid not null references organizations(id) on delete cascade,
  service_key     text not null,
  module_key      text not null,
  status          module_status not null default 'not_started',
  completed_at    timestamptz,
  completed_by    uuid references profiles(id),
  primary key (organization_id, service_key, module_key)
);

-- ─── task_completions ───────────────────────────────────────────────────────
create table task_completions (
  organization_id uuid not null references organizations(id) on delete cascade,
  task_key        text not null,
  completed       boolean not null default false,
  completed_at    timestamptz,
  completed_by    uuid references profiles(id),
  primary key (organization_id, task_key)
);

-- ─── submissions ────────────────────────────────────────────────────────────
-- Every client form answer lives here, keyed by <service>.<module>.<field>.
-- value is jsonb so structured/composite fields store cleanly.
create table submissions (
  organization_id uuid not null references organizations(id) on delete cascade,
  field_key       text not null,
  value           jsonb,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references profiles(id),
  primary key (organization_id, field_key)
);

create index on submissions (organization_id);

-- ─── uploads ────────────────────────────────────────────────────────────────
-- File metadata. The actual blob lives in the 'uploads' Storage bucket at
-- storage_path = 'orgs/{organization_id}/{uuid}-{filename}'.
create table uploads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category        text not null,             -- fieldKey this upload belongs to
  file_name       text not null,
  storage_path    text not null,
  file_size       bigint not null,
  mime_type       text not null,
  uploaded_at     timestamptz not null default now(),
  uploaded_by     uuid references profiles(id)
);

create index on uploads (organization_id, category);

-- ─── activity_log ───────────────────────────────────────────────────────────
create table activity_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid references profiles(id),
  action          activity_action not null,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index on activity_log (organization_id, created_at desc);

-- ─── admin_notes ────────────────────────────────────────────────────────────
create table admin_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id       uuid not null references profiles(id),
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index on admin_notes (organization_id);

-- ─── monthly_reports ────────────────────────────────────────────────────────
create table monthly_reports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period          text not null,            -- 'YYYY-MM'
  title           text not null,
  summary         text,
  loom_url        text,
  highlights      text[] default '{}',
  files           jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  created_by      uuid references profiles(id)
);

create index on monthly_reports (organization_id, period);

-- ─── report_views ───────────────────────────────────────────────────────────
create table report_views (
  user_id         uuid not null references profiles(id)      on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  last_seen_at    timestamptz not null default now(),
  primary key (user_id, organization_id)
);

-- ─── step_videos ────────────────────────────────────────────────────────────
-- Global: one Loom/YouTube URL per (service, module). Shared across all clients.
create table step_videos (
  service_key text not null,
  module_key  text not null,
  url         text not null,
  updated_at  timestamptz not null default now(),
  primary key (service_key, module_key)
);

-- ─── welcome_video ──────────────────────────────────────────────────────────
-- Single global welcome video shown on first login. One row enforced via CHECK.
create table welcome_video (
  id         int primary key default 1 check (id = 1),
  file_name  text,
  storage_path text,
  mime_type  text,
  updated_at timestamptz not null default now()
);

insert into welcome_video (id) values (1) on conflict do nothing;

-- ─── welcomed_users ─────────────────────────────────────────────────────────
create table welcomed_users (
  user_id uuid primary key references profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);

-- ─── admin_flags ────────────────────────────────────────────────────────────
-- Per-org booleans (e.g. ai_receptionist_ready_for_connection).
create table admin_flags (
  organization_id uuid not null references organizations(id) on delete cascade,
  flag_key        text not null,
  value           boolean not null default false,
  primary key (organization_id, flag_key)
);

-- ─── retell_numbers ─────────────────────────────────────────────────────────
create table retell_numbers (
  organization_id uuid primary key references organizations(id) on delete cascade,
  phone_number    text not null,
  updated_at      timestamptz not null default now()
);

-- ─── followup_settings ──────────────────────────────────────────────────────
-- Global singleton (templates + master toggle + CC list).
create table followup_settings (
  id       int primary key default 1 check (id = 1),
  settings jsonb not null
);

-- Seed default settings (three templates matching mockDb defaults).
insert into followup_settings (id, settings) values (1, '{
  "enabled": true,
  "notifyAdmins": [],
  "templates": [
    {"key":"gentle","label":"Gentle nudge","subject":"Just checking in on your onboarding","body":"Hi {{firstName}},\n\nJust checking in — wanted to make sure you haven''t hit any roadblocks in your Serenium onboarding.\n\nYou can pick up where you left off here: {{portalUrl}}\n\nCheers,\nSerenium team","autoSendAfterDays":3,"autoSendEnabled":true},
    {"key":"stronger","label":"Stronger follow-up","subject":"Let''s get your onboarding across the line","body":"Hi {{firstName}},\n\nIt''s been a little while since we''ve seen progress on {{businessName}}''s onboarding. The sooner we have what we need, the sooner we can start driving leads for you.\n\n{{portalUrl}}\n\nSerenium team","autoSendAfterDays":7,"autoSendEnabled":true},
    {"key":"final","label":"Final reminder","subject":"Last nudge on your Serenium setup","body":"Hi {{firstName}},\n\nHaven''t seen movement on {{businessName}}''s onboarding in a couple of weeks. If now isn''t the right time let us know and we''ll pause.\n\n{{portalUrl}}\n\nSerenium team","autoSendAfterDays":14,"autoSendEnabled":false}
  ]
}'::jsonb)
on conflict do nothing;

-- ─── followups_sent ─────────────────────────────────────────────────────────
create table followups_sent (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  template_key    text not null,
  subject         text not null,
  body            text not null,
  sent_at         timestamptz not null default now(),
  sent_by         uuid references profiles(id),
  mode            followup_mode not null default 'manual'
);

create index on followups_sent (organization_id, sent_at desc);

-- ─── ai_chat_messages ───────────────────────────────────────────────────────
create table ai_chat_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  role            chat_role not null,
  content         text not null,
  context         text,
  created_at      timestamptz not null default now()
);

create index on ai_chat_messages (user_id, created_at desc);
create index on ai_chat_messages (organization_id, created_at desc);

-- ─── team_notifications_sent ────────────────────────────────────────────────
-- De-duping log for the 11 team email notifications. `event_key` looks like
-- 'service_completed:website' or 'signup:first_login'. Uniqueness on
-- (org, event) means each event fires at most once.
create table team_notifications_sent (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_key       text not null,
  sent_at         timestamptz not null default now(),
  unique (organization_id, event_key)
);
