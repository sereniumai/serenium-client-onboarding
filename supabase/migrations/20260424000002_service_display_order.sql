-- Adds display_order to organization_services so admins can reorder how services
-- appear on the client's onboarding dashboard. Default 0, lower = earlier.
-- Existing rows get back-filled by insertion time to preserve current order.

alter table organization_services
  add column if not exists display_order integer not null default 0;

update organization_services os
set display_order = sub.rn
from (
  select organization_id, service_key,
    row_number() over (partition by organization_id order by enabled_at) - 1 as rn
  from organization_services
) sub
where os.organization_id = sub.organization_id
  and os.service_key = sub.service_key;

create index if not exists organization_services_order_idx
  on organization_services (organization_id, display_order);
