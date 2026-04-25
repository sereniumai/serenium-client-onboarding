-- ============================================================================
-- Revenue tracking + client BI
-- ----------------------------------------------------------------------------
-- Adds:
--   * revenue_lines     one row per (client, service, type, amount, period)
--   * business_goals    single-row, holds the current MRR target + date
--   * organizations     gains live_at, churned_at, lead_source columns
--
-- All admin-only. Clients never see any of this.
--
-- Design notes:
--   * Multiple lines per (org, service) supported by default. A Website service
--     can have one $4,000 one-time + one $300/mo retainer that starts in 90
--     days. Both rows live in revenue_lines.
--   * MRR is computed live from active rows, not stored. Active = type='monthly'
--     AND started_at <= now AND (ended_at IS NULL OR ended_at > now).
--   * On client churn the application sets ended_at on every active monthly
--     line in one shot, so MRR drops cleanly without each row needing a flip.
-- ============================================================================

create table revenue_lines (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_key     text not null,
  type            text not null check (type in ('one_time', 'monthly')),
  amount_cents    integer not null check (amount_cents >= 0),
  currency        text not null default 'CAD',
  started_at      date not null default current_date,
  ended_at        date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references profiles(id) on delete set null
);

create index on revenue_lines (organization_id);
create index on revenue_lines (service_key);
create index on revenue_lines (started_at);
create index on revenue_lines (type, started_at, ended_at) where type = 'monthly';

alter table revenue_lines enable row level security;

create policy "revenue_lines_admin_select" on revenue_lines for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "revenue_lines_admin_insert" on revenue_lines for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "revenue_lines_admin_update" on revenue_lines for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "revenue_lines_admin_delete" on revenue_lines for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- bump updated_at
create or replace function bump_revenue_lines_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger revenue_lines_bump_updated
before update on revenue_lines
for each row execute function bump_revenue_lines_updated_at();

-- ============================================================================
-- business_goals: single-row settings table for the MRR target
-- ============================================================================

create table business_goals (
  id                   uuid primary key default gen_random_uuid(),
  target_mrr_cents     integer not null default 10000000,  -- $100k default
  target_date          date    not null default '2026-12-31',
  updated_at           timestamptz not null default now(),
  updated_by           uuid references profiles(id) on delete set null
);

-- Seed a single row so the app always has something to read.
insert into business_goals default values;

alter table business_goals enable row level security;

create policy "business_goals_admin_select" on business_goals for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "business_goals_admin_update" on business_goals for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- organizations: live_at, churned_at, lead_source
-- ----------------------------------------------------------------------------
-- live_at and churned_at are set by the app when status flips. We backfill
-- live_at for any org that's already in the live state at migration time
-- using created_at as a best-effort guess; admin can edit later if needed.
-- ============================================================================

alter table organizations
  add column if not exists live_at      timestamptz,
  add column if not exists churned_at   timestamptz,
  add column if not exists lead_source  text check (lead_source in ('referral', 'facebook_ad', 'cold_outbound', 'website', 'other'));

-- Best-effort backfill: orgs already live get live_at = created_at, orgs
-- already churned get churned_at = updated_at. Adjust later in admin if wrong.
update organizations set live_at = created_at where status = 'live' and live_at is null;
update organizations set churned_at = now()    where status = 'churned' and churned_at is null;
