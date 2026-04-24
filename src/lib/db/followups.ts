import { supabase } from '../supabase';
import { toFollowupSent } from './mappers';
import type { FollowupSettings, FollowupSent } from '../../types';

export async function getFollowupSettings(): Promise<FollowupSettings> {
  const { data, error } = await supabase
    .from('followup_settings')
    .select('settings')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return (data?.settings as FollowupSettings) ?? { enabled: true, notifyAdmins: [], templates: [] };
}

export async function saveFollowupSettings(settings: FollowupSettings): Promise<void> {
  const { error } = await supabase
    .from('followup_settings')
    .upsert({ id: 1, settings }, { onConflict: 'id' });
  if (error) throw error;
}

export async function listFollowupsSent(orgId: string): Promise<FollowupSent[]> {
  const { data, error } = await supabase
    .from('followups_sent')
    .select('*')
    .eq('organization_id', orgId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toFollowupSent);
}

export async function sendFollowup(args: {
  organizationId: string;
  templateKey: string;
  subject: string;
  body: string;
  sentBy?: string;
  mode?: 'manual' | 'auto';
}): Promise<FollowupSent> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/send-followup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Unknown' }));
    throw new Error(error ?? `HTTP ${res.status}`);
  }
  const { record } = (await res.json()) as { record: Record<string, unknown> };
  return toFollowupSent(record as Parameters<typeof toFollowupSent>[0]);
}
