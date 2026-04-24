import { SERVICES, getService, type ModuleDef, type Field } from '../config/modules';
import { evaluate } from './condition';
import type {
  ServiceKey, ModuleStatus, Submission, ModuleProgress, TaskCompletion,
  OrganizationService, Upload,
} from '../types';

/**
 * Snapshot of everything needed to evaluate onboarding state for one org.
 * All progress helpers take a snapshot, they don't reach into a store.
 * This keeps them pure, cheap to memoize, and trivial to test.
 */
export interface OrgSnapshot {
  organizationId: string;
  services: OrganizationService[];      // only enabled services
  submissions: Submission[];
  moduleProgress: ModuleProgress[];
  taskCompletions: TaskCompletion[];
  uploads: Upload[];                    // used by logo_picker submissionIsFilled check
  adminFlags: Record<string, boolean>;
}

/** Does a submission satisfy "filled" for its field type? */
export function submissionIsFilled(
  field: Field,
  value: unknown,
  context?: { uploads: Upload[]; fieldKey: string },
): boolean {
  if (value == null || value === '') return false;

  switch (field.type) {
    case 'multiselect':
    case 'repeatable':
      return Array.isArray(value) && value.filter(v => v != null && v !== '').length > 0;

    case 'structured': {
      if (typeof value !== 'object' || Array.isArray(value)) return false;
      const data = value as Record<string, unknown>;
      const required = field.schema?.filter(s => s.required) ?? [];
      if (required.length === 0) {
        return Object.values(data).some(v => v != null && v !== '');
      }
      return required.every(s => {
        const v = data[s.key];
        return v != null && v !== '';
      });
    }

    case 'logo_picker': {
      if (typeof value !== 'object' || Array.isArray(value)) return false;
      const data = value as { mode?: string; url?: string };
      if (data.mode === 'url') return !!(data.url && data.url.trim());
      if (!context) return !!data.mode;
      if (data.mode === 'upload') {
        return context.uploads.filter(u => u.category === context.fieldKey).length > 0;
      }
      if (data.mode === 'reuse') {
        const reuseKey = field.logoReuseFieldKey ?? 'business_profile.logo_files.logo_files';
        return context.uploads.filter(u => u.category === reuseKey).length > 0;
      }
      return false;
    }

    case 'weekly_availability': {
      if (typeof value !== 'object' || Array.isArray(value)) return false;
      const days = value as Record<string, { closed?: boolean; open?: string; close?: string }>;
      return Object.values(days).some(d => !d.closed && !!d.open && !!d.close);
    }

    case 'checkbox':
      return value === true;

    case 'slider':
      return typeof value === 'number';

    default:
      return true;
  }
}

export function moduleIsHidden(snap: OrgSnapshot, svcKey: ServiceKey, mod: ModuleDef): boolean {
  if (!mod.conditional) return false;
  return !evaluate(mod.conditional, snap.submissions, `${svcKey}.${mod.key}`, { services: snap.services });
}

export function moduleIsAdminLocked(snap: OrgSnapshot, mod: ModuleDef): boolean {
  if (!mod.lockedUntilAdminFlag) return false;
  return !snap.adminFlags[mod.lockedUntilAdminFlag];
}

export interface ModuleSummary {
  moduleKey: string;
  status: ModuleStatus;
  taskProgress: { done: number; total: number };
  fieldProgress: { done: number; total: number };
  canStart: boolean;
}

export function getOrgProgress(snap: OrgSnapshot) {
  const enabled = snap.services.map(s => s.serviceKey);

  const perService: Record<ServiceKey, ModuleSummary[]> = {} as Record<ServiceKey, ModuleSummary[]>;
  let total = 0;
  let complete = 0;

  for (const svcKey of enabled) {
    const svc = getService(svcKey);
    if (!svc) continue;
    const svcEntry = snap.services.find(s => s.serviceKey === svcKey);
    const disabledModKeys = new Set(svcEntry?.disabledModuleKeys ?? []);
    const summaries: ModuleSummary[] = [];

    for (const m of svc.modules) {
      if (disabledModKeys.has(m.key)) continue;
      if (moduleIsHidden(snap, svcKey, m)) continue;
      const mp = snap.moduleProgress.find(p => p.serviceKey === svcKey && p.moduleKey === m.key);
      const status = mp?.status ?? 'not_started';

      const taskTotal = m.tasks?.filter(t => t.required !== false).length ?? 0;
      const taskDone = (m.tasks ?? []).filter(t =>
        snap.taskCompletions.find(c => c.taskKey === `${svcKey}.${m.key}.${t.key}` && c.completed)
      ).length;

      const disabledFieldSet = new Set(svcEntry?.disabledFieldKeys ?? []);
      const requiredFields = m.fields?.filter(f => {
    if (!f.required) return false;
    if (disabledFieldSet.has(`${m.key}.${f.key}`)) return false;
    if (f.conditional && !evaluate(f.conditional, snap.submissions, `${svcKey}.${m.key}`, { services: snap.services })) return false;
    return true;
  }) ?? [];
      const fieldTotal = requiredFields.length;
      const fieldDone = requiredFields.filter(f => {
        const fieldKey = `${svcKey}.${m.key}.${f.key}`;
        if (f.type === 'file' || f.type === 'file_multiple') {
          return snap.uploads.some(u => u.category === fieldKey);
        }
        const sub = snap.submissions.find(s => s.fieldKey === fieldKey);
        return sub ? submissionIsFilled(f, sub.value, { uploads: snap.uploads, fieldKey }) : false;
      }).length;

      const adminUnlocked = !moduleIsAdminLocked(snap, m);
      const canStart = adminUnlocked;

      summaries.push({
        moduleKey: m.key, status,
        taskProgress: { done: taskDone, total: taskTotal },
        fieldProgress: { done: fieldDone, total: fieldTotal },
        canStart,
      });

      total += 1;
      if (status === 'complete') complete += 1;
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

export function getEnabledModulesForService(snap: OrgSnapshot, serviceKey: ServiceKey) {
  const svc = getService(serviceKey);
  if (!svc) return [];
  const svcEntry = snap.services.find(s => s.serviceKey === serviceKey);
  if (!svcEntry) return [];
  const disabled = new Set(svcEntry.disabledModuleKeys ?? []);
  return svc.modules.filter(m => !disabled.has(m.key) && !moduleIsHidden(snap, serviceKey, m));
}

export function moduleIsReady(snap: OrgSnapshot, svcKey: ServiceKey, moduleKey: string): boolean {
  const svc = getService(svcKey);
  if (!svc) return false;
  const m = svc.modules.find(x => x.key === moduleKey);
  if (!m) return false;
  const svcEntry = snap.services.find(s => s.serviceKey === svcKey);
  const disabledFieldSet = new Set(svcEntry?.disabledFieldKeys ?? []);

  const requiredTasks = m.tasks?.filter(t => t.required !== false) ?? [];
  const tasksDone = requiredTasks.every(t =>
    snap.taskCompletions.find(c => c.taskKey === `${svcKey}.${m.key}.${t.key}` && c.completed)
  );

  const requiredFields = m.fields?.filter(f => {
    if (!f.required) return false;
    if (disabledFieldSet.has(`${m.key}.${f.key}`)) return false;
    if (f.conditional && !evaluate(f.conditional, snap.submissions, `${svcKey}.${m.key}`, { services: snap.services })) return false;
    return true;
  }) ?? [];
  const fieldsDone = requiredFields.every(f => {
    const fieldKey = `${svcKey}.${m.key}.${f.key}`;
    // File fields don't write to `submissions` - they write to `uploads`.
    // A required file field is "filled" when at least one upload exists.
    if (f.type === 'file' || f.type === 'file_multiple') {
      return snap.uploads.some(u => u.category === fieldKey);
    }
    const sub = snap.submissions.find(s => s.fieldKey === fieldKey);
    return sub ? submissionIsFilled(f, sub.value, { uploads: snap.uploads, fieldKey }) : false;
  });

  return tasksDone && fieldsDone;
}

export { SERVICES };

export function estimatedMinutesRemaining(snap: OrgSnapshot): number {
  let mins = 0;
  for (const svcEntry of snap.services) {
    const svc = getService(svcEntry.serviceKey);
    if (!svc) continue;
    const disabled = new Set(svcEntry.disabledModuleKeys ?? []);
    for (const m of svc.modules) {
      if (disabled.has(m.key)) continue;
      if (moduleIsHidden(snap, svcEntry.serviceKey, m)) continue;
      if (moduleIsAdminLocked(snap, m)) continue;
      const status = snap.moduleProgress.find(p => p.serviceKey === svcEntry.serviceKey && p.moduleKey === m.key)?.status;
      if (status === 'complete') continue;
      mins += m.estimatedMinutes ?? 3;
    }
  }
  return mins;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}

export function findNextActionableModule(
  snap: OrgSnapshot,
  after?: { serviceKey: ServiceKey; moduleKey: string },
): { serviceKey: ServiceKey; module: ModuleDef } | null {
  const servicesInOrder = SERVICES.filter(s => snap.services.some(e => e.serviceKey === s.key));

  type Candidate = { serviceKey: ServiceKey; module: ModuleDef };
  const candidates: Candidate[] = [];
  for (const svc of servicesInOrder) {
    const svcEntry = snap.services.find(e => e.serviceKey === svc.key);
    const disabled = new Set(svcEntry?.disabledModuleKeys ?? []);
    for (const m of svc.modules) {
      if (disabled.has(m.key)) continue;
      if (moduleIsHidden(snap, svc.key, m)) continue;
      if (moduleIsAdminLocked(snap, m)) continue;
      candidates.push({ serviceKey: svc.key, module: m });
    }
  }

  const isComplete = (svcKey: ServiceKey, modKey: string) =>
    snap.moduleProgress.find(p => p.serviceKey === svcKey && p.moduleKey === modKey)?.status === 'complete';

  const startIdx = after
    ? candidates.findIndex(c => c.serviceKey === after.serviceKey && c.module.key === after.moduleKey) + 1
    : 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[(startIdx + i) % candidates.length];
    if (!isComplete(c.serviceKey, c.module.key)) return c;
  }
  return null;
}
