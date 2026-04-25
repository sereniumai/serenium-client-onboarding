-- ============================================================================
-- Track when an invitation email was actually delivered
-- ----------------------------------------------------------------------------
-- We need a way to tell 'tracking-only' clients (ones we set up in admin to
-- track revenue but have never invited or notified) apart from real clients
-- who've been contacted. Without this, we can't decide whether to ask the
-- admin 'email the client about this new service?' on service-add.
--
-- Set whenever sendInvitationEmail succeeds. Backfills nothing -- existing
-- rows stay null. They can be flipped manually later if needed.
-- ============================================================================

alter table invitations
  add column if not exists email_sent_at timestamptz;
