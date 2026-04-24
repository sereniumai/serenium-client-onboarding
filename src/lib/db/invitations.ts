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

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  return data ? toInvitation(data) : null;
}

export function buildInviteUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/register?invite=${token}`;
}
