import { db } from './mockDb';
import { SERVICES, getService, type ModuleDef } from '../config/modules';
import { evaluate } from './condition';
import type { ServiceKey, ModuleStatus } from '../types';

/** Returns true if module is hidden (conditional evaluates false). */
export function moduleIsHidden(organizationId: string, svcKey: ServiceKey, mod: ModuleDef): boolean {
  if (!mod.conditional) return false;
  return !evaluate(mod.conditional, organizationId, `${svcKey}.${mod.key}`);
}

/** Returns true if module is locked by admin flag. */
export function moduleIsAdminLocked(organizationId: string, mod: ModuleDef): boolean {
  if (!mod.lockedUntilAdminFlag) return false;
  return !db.getAdminFlag(organizationId, mod.lockedUntilAdminFlag);
}

export interface ModuleSummary {
  moduleKey: string;
  status: ModuleStatus;
  taskProgress: { done: number; total: number };
  fieldProgress: { done: number; total: number };
  canStart: boolean;
}

export function getOrgProgress(organizationId: string) {
  const enabledSvcs = db.listServicesForOrganization(organizationId);
  const enabled = enabledSvcs.map(s => s.serviceKey);
  const moduleProgress = db.listModuleProgress(organizationId);
  const taskCompletions = db.getTaskCompletions(organizationId);
  const submissions = db.listSubmissionsForOrg(organizationId);

  const perService: Record<ServiceKey, ModuleSummary[]> = {} as Record<ServiceKey, ModuleSummary[]>;
  let total = 0;
  let complete = 0;

  // Compute Business Profile completeness first — other services require it.
  let bpAllComplete = true;
  const bpEntry = enabledSvcs.find(s => s.serviceKey === 'business_profile');
  if (bpEntry) {
    const bpSvc = getService('business_profile');
    const bpDisabled = new Set(bpEntry.disabledModuleKeys ?? []);
    const bpEnabledMods = bpSvc?.modules.filter(m => !bpDisabled.has(m.key)) ?? [];
    for (const m of bpEnabledMods) {
      const mp = moduleProgress.find(p => p.serviceKey === 'business_profile' && p.moduleKey === m.key);
      if (mp?.status !== 'complete') { bpAllComplete = false; break; }
    }
    if (bpEnabledMods.length === 0) bpAllComplete = true;
  }

  for (const svcKey of enabled) {
    const svc = getService(svcKey);
    if (!svc) continue;
    const svcEntry = enabledSvcs.find(s => s.serviceKey === svcKey);
    const disabledModKeys = new Set(svcEntry?.disabledModuleKeys ?? []);
    const summaries: ModuleSummary[] = [];
    let prevComplete = true;
    const requiresBp = svcKey !== 'business_profile';

    for (const m of svc.modules) {
      if (disabledModKeys.has(m.key)) continue;
      if (moduleIsHidden(organizationId, svcKey, m)) continue;
      const mp = moduleProgress.find(p => p.serviceKey === svcKey && p.moduleKey === m.key);
      const status = mp?.status ?? 'not_started';

      const taskTotal = m.tasks?.filter(t => t.required !== false).length ?? 0;
      const taskDone = (m.tasks ?? []).filter(t =>
        taskCompletions.find(c => c.taskKey === `${svcKey}.${m.key}.${t.key}` && c.completed)
      ).length;

      const disabledFieldSet = new Set(svcEntry?.disabledFieldKeys ?? []);
      const requiredFields = m.fields?.filter(f => f.required && !disabledFieldSet.has(`${m.key}.${f.key}`)) ?? [];
      const fieldTotal = requiredFields.length;
      const fieldDone = requiredFields.filter(f =>
        submissions.find(s => s.fieldKey === `${svcKey}.${m.key}.${f.key}` && s.value != null && s.value !== '')
      ).length;

      const adminUnlocked = !moduleIsAdminLocked(organizationId, m);
      const canStart = adminUnlocked && (!m.requiresPrevious || prevComplete) && (!requiresBp || bpAllComplete);

      summaries.push({
        moduleKey: m.key, status,
        taskProgress: { done: taskDone, total: taskTotal },
        fieldProgress: { done: fieldDone, total: fieldTotal },
        canStart,
      });

      total += 1;
      if (status === 'complete') complete += 1;
      prevComplete = status === 'complete';
    }
    perService[svcKey] = summaries;
  }

  return {
    perService,
    enabledServices: enabled,
    overall: total === 0 ? 0 : Math.round((complete / total) * 100),
    totalModules: total,
    completeModules: complete,
  };
}

export function getEnabledModulesForService(organizationId: string, serviceKey: ServiceKey) {
  const svc = getService(serviceKey);
  if (!svc) return [];
  const svcEntry = db.listServicesForOrganization(organizationId).find(s => s.serviceKey === serviceKey);
  if (!svcEntry) return [];
  const disabled = new Set(svcEntry.disabledModuleKeys ?? []);
  return svc.modules.filter(m => !disabled.has(m.key) && !moduleIsHidden(organizationId, serviceKey, m));
}

export function moduleIsReady(org: string, svcKey: ServiceKey, moduleKey: string): boolean {
  const svc = getService(svcKey);
  if (!svc) return false;
  const m = svc.modules.find(x => x.key === moduleKey);
  if (!m) return false;
  const taskCompletions = db.getTaskCompletions(org);
  const submissions = db.listSubmissionsForOrg(org);
  const svcEntry = db.listServicesForOrganization(org).find(s => s.serviceKey === svcKey);
  const disabledFieldSet = new Set(svcEntry?.disabledFieldKeys ?? []);

  const requiredTasks = m.tasks?.filter(t => t.required !== false) ?? [];
  const tasksDone = requiredTasks.every(t =>
    taskCompletions.find(c => c.taskKey === `${svcKey}.${m.key}.${t.key}` && c.completed)
  );

  const requiredFields = m.fields?.filter(f => f.required && !disabledFieldSet.has(`${m.key}.${f.key}`)) ?? [];
  const fieldsDone = requiredFields.every(f =>
    submissions.find(s => s.fieldKey === `${svcKey}.${m.key}.${f.key}` && s.value != null && s.value !== '')
  );

  return tasksDone && fieldsDone;
}

export { SERVICES };
