// ============================================================================
// Shared recipient resolver for outbound client emails
// ============================================================================
// `organizations.primary_contact_email` is admin-set and frequently null for
// clients created via the wizard. The Send-follow-up modal already falls
// back to the first member's email on the UI side, but the actual server
// endpoints used to reject 400 "no primary contact email" in that case,
// silently failing the send. This helper unifies the lookup so every
// outbound endpoint (follow-ups, AI-ready, service-added) reaches the same
// recipient the admin saw in the UI.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface Recipient {
  email: string;
  /** First name only, used for email greetings. Falls back to "there". */
  firstName: string;
  businessName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolve the email + greeting name + business name for a given org.
 * Tries `organizations.primary_contact_*` first, then falls back to the
 * first organization_member's profile. Returns `null` only when there is
 * no member at all (which means the org genuinely has nobody to email).
 *
 * The supabase client passed in must be using the service-role key so it
 * can bypass RLS for the cross-table lookup.
 */
export async function resolveRecipient(
  admin: SupabaseClient,
  organizationId: string,
): Promise<Recipient | null> {
  const { data: org } = await admin
    .from('organizations')
    .select('primary_contact_email, primary_contact_name, business_name')
    .eq('id', organizationId)
    .maybeSingle();
  if (!org) return null;
  const o = org as {
    primary_contact_email: string | null;
    primary_contact_name: string | null;
    business_name: string;
  };

  let email = o.primary_contact_email && EMAIL_RE.test(o.primary_contact_email)
    ? o.primary_contact_email
    : null;
  let nameSource = o.primary_contact_name;

  if (!email) {
    // Fall back to the first member's profile email. Order by created_at so
    // the result is deterministic across calls; with org_members usually
    // having one or two rows the cost is trivial.
    const { data: members } = await admin
      .from('organization_members')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(1);
    const first = (members ?? [])[0] as
      | { profiles: { email: string | null; full_name: string | null } }
      | undefined;
    const memberEmail = first?.profiles?.email;
    if (memberEmail && EMAIL_RE.test(memberEmail)) {
      email = memberEmail;
      nameSource = nameSource || first?.profiles?.full_name || null;
    }
  }

  if (!email) return null;

  const firstName = (nameSource ?? '').split(' ')[0] || 'there';
  return {
    email,
    firstName,
    businessName: o.business_name,
  };
}
