import { toast } from 'sonner';
import * as Sentry from '@sentry/react';
import { supabase } from '../supabase';
import { toInvitation } from './mappers';
import type { Invitation, MemberRole } from '../../types';

export async function listInvitationsForOrg(orgId: string, includeAccepted = false): Promise<Invitation[]> {
  let query = supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (!includeAccepted) query = query.is('accepted_at', null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toInvitation);
}

export async function createInvitation(args: {
  organizationId: string;
  email: string;
  fullName?: string;
  role?: MemberRole;
  ttlDays?: number;
  sendEmail?: boolean;
}): Promise<Invitation> {
  const ttlDays = args.ttlDays ?? 14;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: args.organizationId,
      email: args.email.toLowerCase().trim(),
      full_name: args.fullName ?? null,
      role: args.role ?? 'member',
      token,
      expires_at: expiresAt,
    })
    .select('*')
    .single();
  if (error) throw error;
  const inv = toInvitation(data);

  // Audit: who invited whom. Best-effort.
  const { data: { user } } = await supabase.auth.getUser();
  supabase.from('activity_log').insert({
    organization_id: args.organizationId,
    user_id: user?.id ?? null,
    action: 'admin_invitation_sent',
    metadata: { invitee_email: inv.email, invitation_id: inv.id },
  }).then(({ error: logErr }) => {
    if (logErr) console.warn('[activity] admin_invitation_sent log failed', logErr);
  });

  // Fire-and-forget email delivery. Failures don't block invitation creation
  // (admin still has a copyable link in the UI) but we do want the admin to
  // know so they can copy-paste the link into another channel.
  if (args.sendEmail !== false) {
    sendInvitationEmail(inv.id).catch(err => {
      console.warn('[invitation email] failed', err);
      Sentry.captureException(err, { extra: { invitationId: inv.id, email: inv.email } });
      toast.error("Couldn't send the invite email", {
        description: `Copy the invite link instead and send it to ${inv.email} yourself.`,
        duration: 8000,
      });
    });
  }
  return inv;
}

export async function sendInvitationEmail(invitationId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const res = await fetch('/api/send-invitation', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      invitationId,
      portalUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
    }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Unknown' }));
    throw new Error(error ?? `HTTP ${res.status}`);
  }
  // Mark the row so we can tell tracking-only clients (no email ever sent)
  // apart from real clients we've actually contacted. Best-effort.
  supabase
    .from('invitations')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', invitationId)
    .then(({ error }) => { if (error) console.warn('[invitation] email_sent_at flag failed', error); });
}

/**
 * Has anyone from this org ever been emailed an invite, or accepted one?
 * Tracking-only clients (added in admin without invites) return false and
 * should never receive any notifications from us.
 */
export async function orgHasBeenContacted(organizationId: string): Promise<boolean> {
  const { data: invs } = await supabase
    .from('invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .not('email_sent_at', 'is', null)
    .limit(1);
  if (invs && invs.length > 0) return true;
  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .not('accepted_at', 'is', null)
    .limit(1);
  return !!(members && members.length > 0);
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) throw error;
}

export interface InvitationLookup {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  fullName: string | null;
  role: MemberRole;
  expiresAt: string;
  acceptedAt: string | null;
}

export async function getInvitationByToken(token: string): Promise<InvitationLookup | null> {
  const { data, error } = await supabase.rpc('get_invitation_by_token', { invite_token: token });
  if (error) throw error;
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (!row) return null;
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    organizationName: row.organization_name as string,
    email: row.email as string,
    fullName: (row.full_name as string | null) ?? null,
    role: row.role as MemberRole,
    expiresAt: row.expires_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
  };
}

export async function acceptInvitation(token: string): Promise<{ organizationId: string; role: MemberRole }> {
  const { data, error } = await supabase.rpc('accept_invitation', { invite_token: token });
  if (error) throw error;
  const payload = data as { organization_id: string; role: MemberRole };
  return { organizationId: payload.organization_id, role: payload.role };
}

export function buildInviteUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/register?invite=${token}`;
}
