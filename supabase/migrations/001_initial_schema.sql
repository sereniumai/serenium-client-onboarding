-- Serenium Onboarding Portal — initial schema
-- Run in Supabase SQL Editor in order. Safe to re-run (uses IF NOT EXISTS where possible).

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- PROFILES (extends auth.users)
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  role text not null default 'client' check (role in ('client', 'admin')),
  avatar_url text,
  welcomed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists profiles_email_idx on profiles(email);
create index if not exists profiles_role_idx on profiles(role);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ORGANIZATIONS (clients)
-- ============================================================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  business_name text not null,
  logo_url text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  status text default 'onboarding' check (status in ('onboarding', 'live', 'paused', 'churned')),
  go_live_date timestamptz,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists organizations_slug_idx on organizations(slug);
create index if not exists organizations_status_idx on organizations(status);

-- ============================================================================
-- ORGANIZATION SERVICES (which services are enabled per org)
-- ============================================================================
create table if not exists organization_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  service_key text not null check (service_key in ('business_profile', 'facebook_ads', 'ai_sms', 'website')),
  enabled boolean default true,
  disabled_module_keys text[] default '{}',  -- steps hidden from this client
  enabled_at timestamptz default now(),
  unique (organization_id, service_key)
);

create index if not exists organization_services_org_idx on organization_services(organization_id);

-- ============================================================================
-- ORGANIZATION MEMBERS (which users belong to which orgs)
-- ============================================================================
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'member')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique (organization_id, user_id)
);

create index if not exists org_members_user_idx on organization_members(user_id);
create index if not exists org_members_org_idx on organization_members(organization_id);

-- ============================================================================
-- INVITATIONS (pending user invites)
-- ============================================================================
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'member' check (role in ('owner', 'member')),
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists invitations_token_idx on invitations(token);
create index if not exists invitations_email_idx on invitations(email);

-- ============================================================================
-- MODULE PROGRESS (per org, not per user)
-- ============================================================================
create table if not exists module_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  service_key text not null,
  module_key text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'complete')),
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  updated_at timestamptz default now(),
  unique (organization_id, service_key, module_key)
);

create index if not exists module_progress_org_idx on module_progress(organization_id);

-- ============================================================================
-- TASK COMPLETIONS (sub-checkboxes within modules)
-- ============================================================================
create table if not exists task_completions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  task_key text not null,  -- "<serviceKey>.<moduleKey>.<taskKey>"
  completed boolean default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  unique (organization_id, task_key)
);

create index if not exists task_completions_org_idx on task_completions(organization_id);

-- ============================================================================
-- SUBMISSIONS (autosaved form fields)
-- ============================================================================
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  field_key text not null,  -- "<serviceKey>.<moduleKey>.<fieldKey>"
  value jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id),
  unique (organization_id, field_key)
);

create index if not exists submissions_org_idx on submissions(organization_id);

-- ============================================================================
-- UPLOADS (file metadata — files themselves live in Storage)
-- ============================================================================
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  category text not null,  -- typically the field_key it was uploaded for
  file_name text not null,
  file_path text not null,  -- path in storage bucket
  file_size integer,
  mime_type text,
  uploaded_at timestamptz default now(),
  uploaded_by uuid references auth.users(id)
);

create index if not exists uploads_org_idx on uploads(organization_id);
create index if not exists uploads_category_idx on uploads(organization_id, category);

-- ============================================================================
-- STEP VIDEOS (global library — one Loom URL per step)
-- ============================================================================
create table if not exists step_videos (
  id uuid primary key default gen_random_uuid(),
  service_key text not null,
  module_key text not null,
  loom_url text not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id),
  unique (service_key, module_key)
);

-- ============================================================================
-- WELCOME VIDEO (singleton row, global)
-- ============================================================================
create table if not exists welcome_video (
  id int primary key default 1 check (id = 1),
  file_name text,
  file_path text,
  mime_type text,
  updated_at timestamptz default now()
);

-- ============================================================================
-- MONTHLY REPORTS
-- ============================================================================
create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  period text not null,  -- YYYY-MM
  title text not null,
  summary text,
  loom_url text,
  highlights text[] default '{}',
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

create index if not exists monthly_reports_org_period_idx on monthly_reports(organization_id, period desc);

create table if not exists report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references monthly_reports(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  uploaded_at timestamptz default now()
);

create index if not exists report_files_report_idx on report_files(report_id);

-- ============================================================================
-- REPORT VIEWS (per-user read state)
-- ============================================================================
create table if not exists report_views (
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  last_viewed_at timestamptz default now(),
  primary key (user_id, organization_id)
);

-- ============================================================================
-- ADMIN NOTES (internal-only)
-- ============================================================================
create table if not exists admin_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  author_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create index if not exists admin_notes_org_idx on admin_notes(organization_id);

-- ============================================================================
-- ACTIVITY LOG
-- ============================================================================
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists activity_log_org_idx on activity_log(organization_id, created_at desc);
