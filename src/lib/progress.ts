import { db } from './mockDb';
import { SERVICES, getService } from '../config/modules';
import type { ServiceKey, ModuleStatus } from '../types';

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

  for (const svcKey of enabled) {
    const svc = getService(svcKey);
    if (!svc) continue;
    const svcEntry = enabledSvcs.find(s => s.serviceKey === svcKey);
    const disabledModKeys = new Set(svcEntry?.disabledModuleKeys ?? []);
    const summaries: ModuleSummary[] = [];
    let prevComplete = true;

    for (const m of svc.modules) {
      if (disabledModKeys.has(m.key)) continue;
      const mp = moduleProgress.find(p => p.serviceKey === svcKey && p.moduleKey === m.key);
      const status = mp?.status ?? 'not_started';

      const taskTotal = m.tasks?.filter(t => t.required !== false).length ?? 0;
      const taskDone = (m.tasks ?? []).filter(t =>
        taskCompletions.find(c => c.taskKey === `${svcKey}.${m.key}.${t.key}` && c.completed)
      ).length;

      const requiredFields = m.fields?.filter(f => f.required) ?? [];
      const fieldTotal = requiredFields.length;
      const fieldDone = requiredFields.filter(f =>
        submissions.find(s => s.fieldKey === `${svcKey}.${m.key}.${f.key}` && s.value != null && s.value !== '')
      ).length;

      const canStart = !m.requiresPrevious || prevComplete;

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
  return svc.modules.filter(m => !disabled.has(m.key));
}

export function moduleIsReady(org: string, svcKey: ServiceKey, moduleKey: string): boolean {
  const svc = getService(svcKey);
  if (!svc) return false;
  const m = svc.modules.find(x => x.key === moduleKey);
  if (!m) return false;
  const taskCompletions = db.getTaskCompletions(org);
  const submissions = db.listSubmissionsForOrg(org);

  const requiredTasks = m.tasks?.filter(t => t.required !== false) ?? [];
  const tasksDone = requiredTasks.every(t =>
    taskCompletions.find(c => c.taskKey === `${svcKey}.${m.key}.${t.key}` && c.completed)
  );

  const requiredFields = m.fields?.filter(f => f.required) ?? [];
  const fieldsDone = requiredFields.every(f =>
    submissions.find(s => s.fieldKey === `${svcKey}.${m.key}.${f.key}` && s.value != null && s.value !== '')
  );

  return tasksDone && fieldsDone;
}

export { SERVICES };
