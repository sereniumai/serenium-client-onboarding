import { db } from './mockDb';
import { SERVICES, getService, type ModuleDef, type Field } from '../config/modules';
import { evaluate } from './condition';
import type { ServiceKey, ModuleStatus } from '../types';

/**
 * Does a submission satisfy "filled" for its field type?
 *
 * Naive `value != null && value !== ''` passes for empty objects/arrays and for
 * composite fields where every sub-input is blank. This function knows what
 * "empty" actually means per type.
 *
 * The optional `context` gives access to organization-scoped state (needed for
 * `logo_picker`, which references the uploads table).
 */
export function submissionIsFilled(
  field: Field,
  value: unknown,
  context?: { organizationId: string; fieldKey: string },
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
        // No required sub-fields, at least one sub-field must be non-empty.
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
      if (!context) return !!data.mode; // best-effort fallback when no org context
      if (data.mode === 'upload') {
        return db.listUploads(context.organizationId, context.fieldKey).length > 0;
      }
      if (data.mode === 'reuse') {
        const reuseKey = field.logoReuseFieldKey ?? 'business_profile.logo_files.logo_files';
        return db.listUploads(context.organizationId, reuseKey).length > 0;
      }
      return false;
    }

    case 'weekly_availability': {
      if (typeof value !== 'object' || Array.isArray(value)) return false;
      const days = value as Record<string, { closed?: boolean; open?: string; close?: string }>;
      // At least one day must be open with both open and close times.
      return Object.values(days).some(d => !d.closed && !!d.open && !!d.close);
    }

    case 'checkbox':
      return value === true;

    case 'slider':
      return typeof value === 'number';

    default:
      return true; // non-empty scalar already passed the early-return check above.
  }
}

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


  for (const svcKey of enabled) {
    const svc = getService(svcKey);
    if (!svc) continue;
    const svcEntry = enabledSvcs.find(s => s.serviceKey === svcKey);
    const disabledModKeys = new Set(svcEntry?.disabledModuleKeys ?? []);
    const summaries: ModuleSummary[] = [];

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
      const fieldDone = requiredFields.filter(f => {
        const fieldKey = `${svcKey}.${m.key}.${f.key}`;
        const sub = submissions.find(s => s.fieldKey === fieldKey);
        return sub ? submissionIsFilled(f, sub.value, { organizationId, fieldKey }) : false;
      }).length;

      // Clients can open any step at any time. The only remaining lock is admin-flag
      // gating (e.g. AI Receptionist call-forwarding waits for admin to flip the switch).
      const adminUnlocked = !moduleIsAdminLocked(organizationId, m);
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
  const fieldsDone = requiredFields.every(f => {
    const fieldKey = `${svcKey}.${m.key}.${f.key}`;
    const sub = submissions.find(s => s.fieldKey === fieldKey);
    return sub ? submissionIsFilled(f, sub.value, { organizationId: org, fieldKey }) : false;
  });

  return tasksDone && fieldsDone;
}

export { SERVICES };

/**
 * Find the next actionable module for a client, the next step they should tackle.
 * Skips: disabled services/modules, hidden (conditional-false) modules, admin-locked modules,
 * and already-completed modules. Walks services in dashboard order, wrapping around so that
 * if the current service is fully done, it returns the next service's first incomplete step.
 */
export function findNextActionableModule(
  organizationId: string,
  after?: { serviceKey: ServiceKey; moduleKey: string },
): { serviceKey: ServiceKey; module: ModuleDef } | null {
  const enabledSvcs = db.listServicesForOrganization(organizationId);
  const progress = db.listModuleProgress(organizationId);

  const servicesInOrder = SERVICES.filter(s => enabledSvcs.some(e => e.serviceKey === s.key));

  // Build a flat, in-order list of candidate modules (skipping disabled/hidden/locked).
  type Candidate = { serviceKey: ServiceKey; module: ModuleDef };
  const candidates: Candidate[] = [];
  for (const svc of servicesInOrder) {
    const svcEntry = enabledSvcs.find(e => e.serviceKey === svc.key);
    const disabled = new Set(svcEntry?.disabledModuleKeys ?? []);
    for (const m of svc.modules) {
      if (disabled.has(m.key)) continue;
      if (moduleIsHidden(organizationId, svc.key, m)) continue;
      if (moduleIsAdminLocked(organizationId, m)) continue;
      candidates.push({ serviceKey: svc.key, module: m });
    }
  }

  const isComplete = (svcKey: ServiceKey, modKey: string) =>
    progress.find(p => p.serviceKey === svcKey && p.moduleKey === modKey)?.status === 'complete';

  // Start searching just after the current module, if provided; wrap around to beginning.
  const startIdx = after
    ? candidates.findIndex(c => c.serviceKey === after.serviceKey && c.module.key === after.moduleKey) + 1
    : 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[(startIdx + i) % candidates.length];
    if (!isComplete(c.serviceKey, c.module.key)) return c;
  }
  return null;
}
