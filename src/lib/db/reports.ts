import { supabase } from '../supabase';
import { toMonthlyReport } from './mappers';
import type { MonthlyReport, ReportFile, ServiceKey } from '../../types';

export async function listReportsForOrg(orgId: string): Promise<MonthlyReport[]> {
  const { data, error } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('organization_id', orgId)
    .order('period', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toMonthlyReport);
}

export async function getReport(id: string): Promise<MonthlyReport | null> {
  const { data, error } = await supabase.from('monthly_reports').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toMonthlyReport(data) : null;
}

export interface CreateReportInput {
  organizationId: string;
  period: string;                // YYYY-MM
  serviceKey?: ServiceKey;
  title: string;
  summary?: string;
  loomUrl?: string;
  highlights?: string[];
  files?: ReportFile[];
  createdBy?: string;
}

export async function createReport(input: CreateReportInput): Promise<MonthlyReport> {
  const { data, error } = await supabase
    .from('monthly_reports')
    .insert({
      organization_id: input.organizationId,
      period: input.period,
      service_key: input.serviceKey ?? null,
      title: input.title,
      summary: input.summary ?? null,
      loom_url: input.loomUrl ?? null,
      highlights: input.highlights ?? [],
      files: (input.files ?? []) as object,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  await supabase.from('activity_log').insert({
    organization_id: input.organizationId,
    user_id: input.createdBy ?? null,
    action: 'report_published',
    metadata: { period: input.period, title: input.title },
  });

  // Fire-and-forget client notification email. Edits don't trigger this ,
  // only the initial publish, so a typo fix later won't generate noise.
  notifyReportPublished(input.organizationId, data.id).catch(err =>
    console.warn('[report] notify email failed', err),
  );

  return toMonthlyReport(data);
}

async function notifyReportPublished(organizationId: string, reportId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await fetch('/api/notify-report-published', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ organizationId, reportId }),
  });
}

export async function updateReport(id: string, patch: Partial<CreateReportInput>): Promise<MonthlyReport> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.summary !== undefined) dbPatch.summary = patch.summary;
  if (patch.loomUrl !== undefined) dbPatch.loom_url = patch.loomUrl;
  if (patch.period !== undefined) dbPatch.period = patch.period;
  if (patch.serviceKey !== undefined) dbPatch.service_key = patch.serviceKey ?? null;
  if (patch.highlights !== undefined) dbPatch.highlights = patch.highlights;
  if (patch.files !== undefined) dbPatch.files = patch.files as object;

  const { data, error } = await supabase
    .from('monthly_reports')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  const report = toMonthlyReport(data);
  await supabase.from('activity_log').insert({
    organization_id: report.organizationId,
    action: 'report_updated',
    metadata: { period: report.period, title: report.title },
  });
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  const existing = await getReport(id);
  const { error } = await supabase.from('monthly_reports').delete().eq('id', id);
  if (error) throw error;
  if (existing) {
    await supabase.from('activity_log').insert({
      organization_id: existing.organizationId,
      action: 'report_deleted',
      metadata: { period: existing.period, title: existing.title },
    });
  }
}

export async function markReportsViewed(userId: string, orgId: string): Promise<void> {
  const { error } = await supabase
    .from('report_views')
    .upsert({ user_id: userId, organization_id: orgId, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id,organization_id' });
  if (error) throw error;
}

export async function getLastReportView(userId: string, orgId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('report_views')
    .select('last_seen_at')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();
  if (error) throw error;
  return (data as { last_seen_at: string } | null)?.last_seen_at ?? null;
}
