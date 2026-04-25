-- Per-client toggle for the "More from Serenium" upsell row on the client
-- dashboard. Default true so existing clients keep seeing it; admin can
-- flip it off for clients we don't want to upsell (e.g. an enterprise
-- bundle where everything is already in scope).

alter table organizations
  add column if not exists show_other_services boolean not null default true;
