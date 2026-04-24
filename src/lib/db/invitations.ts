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
  return toInvitation(data);
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
