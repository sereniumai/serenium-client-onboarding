import { supabase } from '../supabase';
import { toOrganizationMember, toProfile } from './mappers';
import type { Profile, OrganizationMember, MemberRole } from '../../types';

export async function listMembersForOrg(orgId: string): Promise<Array<{ profile: Profile; member: OrganizationMember }>> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*, profile:profiles!organization_members_user_id_fkey(*)')
    .eq('organization_id', orgId);
  if (error) throw error;

  type Row = Parameters<typeof toOrganizationMember>[0] & { profile: Parameters<typeof toProfile>[0] };
  return ((data ?? []) as unknown as Row[]).map(r => ({
    profile: toProfile(r.profile),
    member: toOrganizationMember(r),
  }));
}

export async function addMember(orgId: string, userId: string, role: MemberRole = 'member'): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: userId,
      role,
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', orgId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function isOrgMember(orgId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
