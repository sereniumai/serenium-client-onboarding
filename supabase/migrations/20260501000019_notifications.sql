-- ============================================================================
-- Round 6 — admin in-app notifications + per-event channel control
-- ============================================================================
-- Two new tables that work together:
--
-- notification_settings  → admin-controlled per-event toggle for "send email"
--                          and "show in admin bell". One row per event_key.
--                          Seeded with sane defaults; admin can flip from the
--                          new Notifications page in the dashboard.
--
-- admin_notifications    → the bell feed itself. Every event the system fires
--                          writes a row here when its bell toggle is on.
--                          Read state tracked per-row; admin marks individual
--                          items read or "mark all read".
-- ============================================================================

-- ─── notification_settings ──────────────────────────────────────────────────
-- audience = 'team'   → email goes to Serenium ops, bell shows in admin
--          = 'client' → email goes to the client; no bell (clients have none)
create table if not exists notification_settings (
  event_key   text primary key,
  audience    text not null default 'team' check (audience in ('team','client')),
  send_email  boolean not null default true,
  send_bell   boolean not null default true,
  /* Human-readable label + group, set in seed below. Editable by admin if we
     ever want it, but right now the page reads from it for display. */
  label       text not null,
  category    text not null default 'general',
  updated_at  timestamptz not null default now()
);

-- For installs that ran an earlier draft of this migration without `audience`.
alter table notification_settings add column if not exists audience text not null default 'team';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notification_settings_audience_check') then
    alter table notification_settings add constraint notification_settings_audience_check check (audience in ('team','client'));
  end if;
end $$;

alter table notification_settings enable row level security;

drop policy if exists "notification_settings admin read"  on notification_settings;
drop policy if exists "notification_settings admin write" on notification_settings;

create policy "notification_settings admin read" on notification_settings
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "notification_settings admin write" on notification_settings
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Seed defaults. Round-6 split:
--   email + bell : login, facebook ads done, DNS access, AI message, AI live, onboarding done
--   bell only    : every other section / access event
insert into notification_settings (event_key, audience, label, category, send_email, send_bell) values
  -- Team-side
  ('signup:first_login',                                 'team', 'Client first login',                          'lifecycle', true,  true),
  ('onboarding:complete',                                'team', 'Onboarding 100% complete',                    'lifecycle', true,  true),
  ('service_completed:business_profile',                 'team', 'Business Profile completed',                  'service',   false, true),
  ('service_completed:facebook_ads',                     'team', 'Facebook Ads completed',                      'service',   true,  true),
  ('service_completed:google_ads',                       'team', 'Google Ads completed',                        'service',   false, true),
  ('service_completed:google_business_profile',          'team', 'Google Business Profile completed',           'service',   false, true),
  ('service_completed:ai_sms',                           'team', 'AI SMS completed',                            'service',   false, true),
  ('service_completed:ai_receptionist',                  'team', 'AI Receptionist completed',                   'service',   false, true),
  ('service_completed:website',                          'team', 'Website completed',                           'service',   false, true),
  ('module_completed:website.registrar_delegation',      'team', 'Registrar (DNS) access granted',              'access',    true,  true),
  ('module_completed:website.cms_access',                'team', 'CMS access granted',                          'access',    false, true),
  ('module_completed:website.analytics_and_search_console','team', 'Analytics + Search Console access granted', 'access',    false, true),
  ('module_completed:facebook_ads.grant_access',         'team', 'Meta Business Manager access granted',        'access',    false, true),
  ('module_completed:ai_receptionist.phone_number_setup','team', 'AI phone forwarding live',                    'access',    true,  true),
  ('aria:new_message',                                   'team', 'New Aria message from client',                'support',   true,  true),

  -- Client-side (email only, no bell)
  ('client:invitation',                                  'client', 'Invitation email (signup link)',            'lifecycle', true,  false),
  ('client:ai_ready',                                    'client', 'AI ready, finish phone forwarding',         'access',    true,  false),
  ('client:service_added',                               'client', 'New service added to account',              'lifecycle', true,  false),
  ('client:report_uploaded',                             'client', 'Monthly report uploaded',                   'reports',   true,  false)
on conflict (event_key) do nothing;

create or replace function touch_notification_settings()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_notification_settings on notification_settings;
create trigger trg_touch_notification_settings
  before update on notification_settings
  for each row execute function touch_notification_settings();


-- ─── admin_notifications ────────────────────────────────────────────────────
-- Bell feed. One row per fired event (when the bell toggle is on).
-- payload jsonb holds anything the bell UI wants to render:
--   { businessName, slug, primaryContact, deepLink, summary, ... }
-- Deep link is a route inside the admin portal we navigate to on click.
create table if not exists admin_notifications (
  id              uuid primary key default gen_random_uuid(),
  event_key       text not null,
  organization_id uuid references organizations(id) on delete cascade,
  payload         jsonb not null default '{}'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists admin_notifications_created_idx on admin_notifications(created_at desc);
create index if not exists admin_notifications_unread_idx  on admin_notifications(read_at) where read_at is null;
create index if not exists admin_notifications_org_idx     on admin_notifications(organization_id);

alter table admin_notifications enable row level security;

drop policy if exists "admin_notifications admin read"  on admin_notifications;
drop policy if exists "admin_notifications admin write" on admin_notifications;

create policy "admin_notifications admin read" on admin_notifications
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admin_notifications admin write" on admin_notifications
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );


