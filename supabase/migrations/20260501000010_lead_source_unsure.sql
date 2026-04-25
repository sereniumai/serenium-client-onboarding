-- ============================================================================
-- Add 'unsure' to organizations.lead_source enum
-- ----------------------------------------------------------------------------
-- Lets the admin pick "Unsure / not tracked" when adding a client whose source
-- they don't know (legacy, walked-in, came from a fuzzy place). Keeps the
-- chart honest — better than forcing a guess into a real category.
-- ============================================================================

alter table organizations drop constraint if exists organizations_lead_source_check;
alter table organizations add constraint organizations_lead_source_check
  check (lead_source in ('referral', 'facebook_ad', 'cold_outbound', 'website', 'other', 'unsure'));
