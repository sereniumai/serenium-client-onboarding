import { supabase } from '../supabase';
import { toOrganization } from './mappers';
import type { Organization, OrgStatus, OrgPlan } from '../../types';

export async function listAllOrgs(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toOrganization);
}

export async function listOrgsForUser(userId: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organizations!inner(*)')
    .eq('user_id', userId);
  if (error) throw error;
  const rows = (data ?? []).map(row => (row as unknown as { organizations: Parameters<typeof toOrganization>[0] }).organizations);
  return rows.map(toOrganization);
}

export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toOrganization(data) : null;
}

export async function getOrgById(id: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toOrganization(data) : null;
}

export interface CreateOrgInput {
  businessName: string;
  slug?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  logoUrl?: string;
  plan?: OrgPlan;
  tags?: string[];
}

export async function createOrg(input: CreateOrgInput): Promise<Organization> {
  const slug = (input.slug ?? slugify(input.businessName)).trim();
  if (!slug) throw new Error('Organization slug is required');
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      slug,
      business_name: input.businessName,
      primary_contact_name: input.primaryContactName ?? null,
      primary_contact_email: input.primaryContactEmail ?? null,
      primary_contact_phone: input.primaryContactPhone ?? null,
      logo_url: input.logoUrl ?? null,
      plan: input.plan ?? null,
      tags: input.tags ?? [],
    })
    .select('*')
    .single();
  if (error) throw error;
  return toOrganization(data);
}

export interface UpdateOrgInput {
  businessName?: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  logoUrl?: string | null;
  status?: OrgStatus;
  plan?: OrgPlan | null;
  tags?: string[];
  goLiveDate?: string | null;
}

export async function updateOrg(id: string, patch: UpdateOrgInput): Promise<Organization> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.businessName !== undefined) dbPatch.business_name = patch.businessName;
  if (patch.primaryContactName !== undefined) dbPatch.primary_contact_name = patch.primaryContactName;
  if (patch.primaryContactEmail !== undefined) dbPatch.primary_contact_email = patch.primaryContactEmail;
  if (patch.primaryContactPhone !== undefined) dbPatch.primary_contact_phone = patch.primaryContactPhone;
  if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.plan !== undefined) dbPatch.plan = patch.plan;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (patch.goLiveDate !== undefined) dbPatch.go_live_date = patch.goLiveDate;

  const { data, error } = await supabase
    .from('organizations')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  // Audit: mark-live is the highest-stakes status change, log it.
  if (patch.status === 'live') {
    const { data: { user } } = await supabase.auth.getUser();
    supabase.from('activity_log').insert({
      organization_id: id,
      user_id: user?.id ?? null,
      action: 'admin_marked_live',
      metadata: { previous_status: 'onboarding' },
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[activity] admin_marked_live log failed', logErr);
    });
  }
  return toOrganization(data);
}

export async function deleteOrg(id: string): Promise<void> {
  // Audit BEFORE delete, the row is about to be gone.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: org } = await supabase.from('organizations').select('business_name, slug').eq('id', id).maybeSingle();
  if (org) {
    // Insert into a surviving audit row. Use activity_log with a marker that
    // the org is now gone, so retrospectives still work.
    supabase.from('activity_log').insert({
      organization_id: id,
      user_id: user?.id ?? null,
      action: 'admin_client_deleted',
      metadata: org as Record<string, unknown>,
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[activity] admin_client_deleted log failed', logErr);
    });
  }

  const { error } = await supabase.from('organizations').delete().eq('id', id);
  if (error) throw error;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
