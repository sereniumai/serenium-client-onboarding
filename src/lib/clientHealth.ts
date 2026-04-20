import { differenceInDays } from 'date-fns';
import { db } from './mockDb';
import { getOrgProgress } from './progress';

export type HealthState = 'complete' | 'fresh' | 'healthy' | 'stalled';

export interface ClientHealth {
  state: HealthState;
  daysSinceActivity: number | null;
  daysSinceCreated: number;
  lastActivityAt: string | null;
  label: string;
}

const STALE_DAYS = 7;

export function getClientHealth(organizationId: string): ClientHealth {
  const org = db.getOrganization(organizationId);
  const progress = getOrgProgress(organizationId);
  const activity = db.listActivityForOrg(organizationId, 1);
  const now = new Date();

  const daysSinceCreated = org ? differenceInDays(now, new Date(org.createdAt)) : 0;
  const lastActivityAt = activity[0]?.createdAt ?? null;
  const daysSinceActivity = lastActivityAt ? differenceInDays(now, new Date(lastActivityAt)) : null;

  if (progress.totalModules > 0 && progress.overall === 100) {
    return { state: 'complete', daysSinceActivity, daysSinceCreated, lastActivityAt, label: 'Live' };
  }
  if (daysSinceCreated <= 2 && !lastActivityAt) {
    return { state: 'fresh', daysSinceActivity, daysSinceCreated, lastActivityAt, label: 'Just started' };
  }
  const referenceDays = daysSinceActivity ?? daysSinceCreated;
  if (referenceDays >= STALE_DAYS) {
    return { state: 'stalled', daysSinceActivity, daysSinceCreated, lastActivityAt, label: `Stalled · ${referenceDays}d` };
  }
  return { state: 'healthy', daysSinceActivity, daysSinceCreated, lastActivityAt, label: 'On track' };
}
