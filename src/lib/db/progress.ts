import { supabase } from '../supabase';
import { toModuleProgress, toTaskCompletion } from './mappers';
import type { ModuleProgress, TaskCompletion, ModuleStatus, ServiceKey } from '../../types';

export async function listModuleProgress(orgId: string): Promise<ModuleProgress[]> {
  const { data, error } = await supabase
    .from('module_progress')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  return (data ?? []).map(toModuleProgress);
}

export async function setModuleStatus(args: {
  organizationId: string;
  serviceKey: ServiceKey;
  moduleKey: string;
  status: ModuleStatus;
  userId?: string;
}): Promise<void> {
  const row: Record<string, unknown> = {
    organization_id: args.organizationId,
    service_key: args.serviceKey,
    module_key: args.moduleKey,
    status: args.status,
  };
  if (args.status === 'complete') {
    row.completed_at = new Date().toISOString();
    row.completed_by = args.userId ?? null;
  } else {
    row.completed_at = null;
    row.completed_by = null;
  }
  const { error } = await supabase
    .from('module_progress')
    .upsert(row, { onConflict: 'organization_id,service_key,module_key' });
  if (error) throw error;

  if (args.status === 'complete' || args.status === 'in_progress') {
    await supabase.from('activity_log').insert({
      organization_id: args.organizationId,
      user_id: args.userId ?? null,
      action: args.status === 'complete' ? 'step_completed' : 'step_reopened',
      metadata: { service_key: args.serviceKey, module_key: args.moduleKey },
    });
  }
}

export async function listTaskCompletions(orgId: string): Promise<TaskCompletion[]> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  return (data ?? []).map(toTaskCompletion);
}

export async function setTaskCompletion(args: {
  organizationId: string;
  taskKey: string;
  completed: boolean;
  userId?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('task_completions')
    .upsert({
      organization_id: args.organizationId,
      task_key: args.taskKey,
      completed: args.completed,
      completed_at: args.completed ? new Date().toISOString() : null,
      completed_by: args.completed ? args.userId ?? null : null,
    }, { onConflict: 'organization_id,task_key' });
  if (error) throw error;
}

// ─── Admin flags ───────────────────────────────────────────────────────────
export async function listAdminFlags(orgId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('admin_flags')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  const out: Record<string, boolean> = {};
  for (const row of (data ?? []) as Array<{ flag_key: string; value: boolean }>) {
    out[row.flag_key] = row.value;
  }
  return out;
}

export async function setAdminFlag(orgId: string, flagKey: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('admin_flags')
    .upsert({
      organization_id: orgId,
      flag_key: flagKey,
      value,
    }, { onConflict: 'organization_id,flag_key' });
  if (error) throw error;
}
