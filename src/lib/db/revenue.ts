import { supabase } from '../supabase';
import type { RevenueLine, BusinessGoal, ServiceKey, RevenueType } from '../../types';

interface Row {
  id: string;
  organization_id: string;
  service_key: string;
  type: 'one_time' | 'monthly';
  amount_cents: number;
  currency: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

function toLine(r: Row): RevenueLine {
  return {
    id: r.id,
    organizationId: r.organization_id,
    serviceKey: r.service_key as ServiceKey,
    type: r.type,
    amountCents: r.amount_cents,
    currency: r.currency,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
  };
}

export async function listRevenueLines(): Promise<RevenueLine[]> {
  const { data, error } = await supabase
    .from('revenue_lines')
    .select('*')
    .order('started_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toLine);
}

export async function listLinesForOrg(organizationId: string): Promise<RevenueLine[]> {
  const { data, error } = await supabase
    .from('revenue_lines')
    .select('*')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toLine);
}

export interface CreateLineInput {
  organizationId: string;
  serviceKey: ServiceKey;
  type: RevenueType;
  amountCents: number;
  startedAt?: string;     // ISO date, defaults today
  endedAt?: string | null;
  notes?: string | null;
  currency?: string;
}

export async function createRevenueLine(input: CreateLineInput): Promise<RevenueLine> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('revenue_lines')
    .insert({
      organization_id: input.organizationId,
      service_key: input.serviceKey,
      type: input.type,
      amount_cents: input.amountCents,
      started_at: input.startedAt ?? new Date().toISOString().slice(0, 10),
      ended_at: input.endedAt ?? null,
      notes: input.notes ?? null,
      currency: input.currency ?? 'CAD',
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toLine(data as Row);
}

export interface UpdateLineInput {
  amountCents?: number;
  type?: RevenueType;
  startedAt?: string;
  endedAt?: string | null;
  notes?: string | null;
}

export async function updateRevenueLine(id: string, patch: UpdateLineInput): Promise<RevenueLine> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.amountCents !== undefined) dbPatch.amount_cents = patch.amountCents;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.startedAt !== undefined) dbPatch.started_at = patch.startedAt;
  if (patch.endedAt !== undefined) dbPatch.ended_at = patch.endedAt;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  const { data, error } = await supabase
    .from('revenue_lines')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toLine(data as Row);
}

export async function deleteRevenueLine(id: string): Promise<void> {
  const { error } = await supabase.from('revenue_lines').delete().eq('id', id);
  if (error) throw error;
}

/** Soft-cancel: end every active monthly line for a service today. */
export async function endActiveLinesForService(orgId: string, serviceKey: ServiceKey): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('revenue_lines')
    .update({ ended_at: today })
    .eq('organization_id', orgId)
    .eq('service_key', serviceKey)
    .eq('type', 'monthly')
    .is('ended_at', null);
  if (error) throw error;
}

// ─── Business goals (single-row settings) ──────────────────────────────────

export async function getBusinessGoal(): Promise<BusinessGoal | null> {
  const { data, error } = await supabase
    .from('business_goals')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as { id: string; target_mrr_cents: number; target_date: string; updated_at: string; updated_by: string | null };
  return {
    id: r.id,
    targetMrrCents: r.target_mrr_cents,
    targetDate: r.target_date,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}

export async function updateBusinessGoal(id: string, patch: { targetMrrCents?: number; targetDate?: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const dbPatch: Record<string, unknown> = { updated_by: user?.id ?? null, updated_at: new Date().toISOString() };
  if (patch.targetMrrCents !== undefined) dbPatch.target_mrr_cents = patch.targetMrrCents;
  if (patch.targetDate !== undefined) dbPatch.target_date = patch.targetDate;
  const { error } = await supabase.from('business_goals').update(dbPatch).eq('id', id);
  if (error) throw error;
}

// ─── Computed metrics ──────────────────────────────────────────────────────

/** Returns lines where the line is active on `date` (yyyy-mm-dd or Date). */
function isActiveOn(line: RevenueLine, date: Date): boolean {
  const d = date.toISOString().slice(0, 10);
  if (line.startedAt > d) return false;
  if (line.endedAt && line.endedAt <= d) return false;
  return true;
}

/** Sum of monthly retainer amounts active on the given date (default today). */
export function computeMRR(lines: RevenueLine[], on: Date = new Date()): number {
  return lines
    .filter(l => l.type === 'monthly' && isActiveOn(l, on))
    .reduce((sum, l) => sum + l.amountCents, 0);
}

/** Sum of one-time amounts billed in the given calendar month plus monthly
 *  amounts that were active for any part of that month. */
export function revenueForMonth(lines: RevenueLine[], year: number, month: number): number {
  // month is 1-indexed (1 = Jan)
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const startStr = monthStart.toISOString().slice(0, 10);
  const endStr = monthEnd.toISOString().slice(0, 10);

  let total = 0;
  for (const l of lines) {
    if (l.type === 'one_time') {
      if (l.startedAt >= startStr && l.startedAt <= endStr) total += l.amountCents;
      continue;
    }
    // monthly: contribute amount if active for any day of this month
    const startsBeforeOrInMonth = l.startedAt <= endStr;
    const endsAfterMonthStart = !l.endedAt || l.endedAt > startStr;
    if (startsBeforeOrInMonth && endsAfterMonthStart) total += l.amountCents;
  }
  return total;
}

export function revenueYTD(lines: RevenueLine[], year: number): number {
  const today = new Date();
  const upTo = today.getUTCFullYear() === year ? today.getUTCMonth() + 1 : 12;
  let total = 0;
  for (let m = 1; m <= upTo; m++) total += revenueForMonth(lines, year, m);
  return total;
}
