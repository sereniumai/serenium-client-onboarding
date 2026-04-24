import { supabase } from '../supabase';
import { toSubmission } from './mappers';
import type { Submission } from '../../types';

export async function listSubmissionsForOrg(orgId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  return (data ?? []).map(toSubmission);
}

export async function getSubmission(orgId: string, fieldKey: string): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('organization_id', orgId)
    .eq('field_key', fieldKey)
    .maybeSingle();
  if (error) throw error;
  return data ? toSubmission(data) : null;
}

export async function upsertSubmission(args: {
  organizationId: string;
  fieldKey: string;
  value: unknown;
  userId?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .upsert({
      organization_id: args.organizationId,
      field_key: args.fieldKey,
      value: args.value as object,
      updated_at: new Date().toISOString(),
      updated_by: args.userId ?? null,
    }, { onConflict: 'organization_id,field_key' });
  if (error) throw error;
}

export async function deleteSubmission(orgId: string, fieldKey: string): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('organization_id', orgId)
    .eq('field_key', fieldKey);
  if (error) throw error;
}
