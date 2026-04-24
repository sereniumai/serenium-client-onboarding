import { supabase } from '../supabase';
import { toActivityLog } from './mappers';
import { impersonationMetadata } from '../impersonation';
import type { ActivityLogEntry, ActivityAction } from '../../types';

export async function listActivityForOrg(orgId: string, limit = 200): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toActivityLog);
}

export async function logActivity(args: {
  organizationId: string;
  userId?: string | null;
  action: ActivityAction;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('activity_log').insert({
    organization_id: args.organizationId,
    user_id: args.userId ?? null,
    action: args.action,
    metadata: { ...impersonationMetadata(), ...(args.metadata ?? {}) },
  });
  if (error) throw error;
}
