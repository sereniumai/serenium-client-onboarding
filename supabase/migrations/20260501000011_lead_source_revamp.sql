-- ============================================================================
-- Lead source enum revamp
-- ----------------------------------------------------------------------------
-- New canonical list:
--   referral, facebook_ad, google_ads, outreach, socials, networking,
--   other, unsure
--
-- 'cold_outbound' becomes 'outreach' (same idea, plainer word).
-- 'website' is dropped, the few that come through there map to 'socials'
--   or 'other' depending on context, but in our case it's been used by no
--   one yet so we just remove.
-- ============================================================================

-- Migrate existing values to the new vocabulary. Safe even on an empty table.
update organizations set lead_source = 'outreach' where lead_source = 'cold_outbound';
update organizations set lead_source = 'other'    where lead_source = 'website';

-- Swap the constraint.
alter table organizations drop constraint if exists organizations_lead_source_check;
alter table organizations add constraint organizations_lead_source_check
  check (lead_source in ('referral', 'facebook_ad', 'google_ads', 'outreach', 'socials', 'networking', 'other', 'unsure'));
