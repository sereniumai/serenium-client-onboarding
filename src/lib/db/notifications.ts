import { supabase } from '../supabase';

export interface NotificationSetting {
  eventKey: string;
  audience: 'team' | 'client';
  label: string;
  category: string;
  sendEmail: boolean;
  sendBell: boolean;
  updatedAt: string;
}

export interface AdminNotification {
  id: string;
  eventKey: string;
  organizationId: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export async function listNotificationSettings(): Promise<NotificationSetting[]> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .order('category')
    .order('label');
  if (error) throw error;
  return (data ?? []).map(r => mapSetting(r as Record<string, unknown>));
}

export async function updateNotificationSetting(
  eventKey: string,
  patch: { sendEmail?: boolean; sendBell?: boolean },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.sendEmail !== undefined) updates.send_email = patch.sendEmail;
  if (patch.sendBell !== undefined) updates.send_bell = patch.sendBell;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase
    .from('notification_settings')
    .update(updates)
    .eq('event_key', eventKey);
  if (error) throw error;
}

export async function listAdminNotifications(opts?: { limit?: number }): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);
  if (error) throw error;
  return (data ?? []).map(r => mapNotification(r as Record<string, unknown>));
}

export async function countUnreadAdminNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

function mapSetting(r: Record<string, unknown>): NotificationSetting {
  return {
    eventKey:  r.event_key as string,
    audience:  ((r.audience as string) === 'client' ? 'client' : 'team'),
    label:     r.label as string,
    category:  r.category as string,
    sendEmail: r.send_email as boolean,
    sendBell:  r.send_bell as boolean,
    updatedAt: r.updated_at as string,
  };
}

function mapNotification(r: Record<string, unknown>): AdminNotification {
  return {
    id:             r.id as string,
    eventKey:       r.event_key as string,
    organizationId: (r.organization_id as string | null) ?? null,
    payload:        (r.payload as Record<string, unknown>) ?? {},
    readAt:         (r.read_at as string | null) ?? null,
    createdAt:      r.created_at as string,
  };
}
