import { supabase } from '../supabase';
import type { AriaEscalation } from '../../types';

interface Row {
  id: string;
  organization_id: string;
  user_id: string;
  thread_id: string | null;
  question: string;
  context_snippet: string | null;
  page_context: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

function toEscalation(r: Row): AriaEscalation {
  return {
    id: r.id,
    organizationId: r.organization_id,
    userId: r.user_id,
    threadId: r.thread_id,
    question: r.question,
    contextSnippet: r.context_snippet,
    pageContext: r.page_context,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
  };
}

export async function listOpenEscalations(): Promise<AriaEscalation[]> {
  const { data, error } = await supabase
    .from('aria_escalations')
    .select('*')
    .is('resolved_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toEscalation);
}

export async function listEscalationsForOrg(organizationId: string): Promise<AriaEscalation[]> {
  const { data, error } = await supabase
    .from('aria_escalations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toEscalation);
}

export async function resolveEscalation(id: string, resolvedBy: string): Promise<void> {
  const { error } = await supabase
    .from('aria_escalations')
    .update({ resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq('id', id);
  if (error) throw error;
}

export async function reopenEscalation(id: string): Promise<void> {
  const { error } = await supabase
    .from('aria_escalations')
    .update({ resolved_at: null, resolved_by: null })
    .eq('id', id);
  if (error) throw error;
}
