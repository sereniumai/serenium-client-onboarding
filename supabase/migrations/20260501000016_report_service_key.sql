-- Tag each monthly report with a single service key so the live-client
-- dashboard can render reports as Year → Month → Service. Existing reports
-- can be left null and back-filled by admin in the UI.

alter table monthly_reports
  add column if not exists service_key text;

create index if not exists monthly_reports_org_service_period_idx
  on monthly_reports (organization_id, service_key, period desc);
