-- ============================================================================
-- Channel spend tracking
-- ----------------------------------------------------------------------------
-- One row per lead source the agency actively spends on. Stores the rolling
-- monthly spend plus the date the spend started. Combined with the count of
-- clients acquired from each source (already in organizations.lead_source)
-- the Revenue page computes CAC and LTV/CAC ROI per channel.
--
-- Single rolling spend per source rather than full month-by-month history,
-- the agency is at 5 clients and doesn't need a time series yet. Future
-- migration can add a snapshots table without breaking this one.
-- ============================================================================

create table lead_source_spend (
  source              text primary key
                       check (source in ('facebook_ad', 'google_ads', 'referral', 'outreach', 'socials', 'networking', 'other')),
  monthly_spend_cents integer not null check (monthly_spend_cents >= 0),
  since               date    not null default current_date,
  notes               text,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references profiles(id) on delete set null
);

alter table lead_source_spend enable row level security;

create policy "lead_source_spend_admin_select" on lead_source_spend for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "lead_source_spend_admin_insert" on lead_source_spend for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "lead_source_spend_admin_update" on lead_source_spend for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "lead_source_spend_admin_delete" on lead_source_spend for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create or replace function bump_lead_source_spend_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger lead_source_spend_bump_updated
before update on lead_source_spend
for each row execute function bump_lead_source_spend_updated_at();
