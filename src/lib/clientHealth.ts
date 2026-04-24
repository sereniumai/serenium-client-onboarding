import { differenceInDays } from 'date-fns';
import { getOrgProgress, type OrgSnapshot } from './progress';
import type { Organization } from '../types';

export type HealthState = 'complete' | 'fresh' | 'healthy' | 'stalled';

export interface ClientHealth {
  state: HealthState;
  daysSinceActivity: number | null;
  daysSinceCreated: number;
  lastActivityAt: string | null;
  label: string;
}

const STALE_DAYS = 7;

/**
 * Compute health state for a client. Pure, accepts pre-fetched data.
 *
 * lastActivityAt is the most recent activity_log entry's created_at, or null
 * if nothing is logged. When activity_log is re-ported (Phase 7), pass it in.
 */
export function getClientHealth(args: {
  org: Organization;
  snapshot: OrgSnapshot;
  lastActivityAt?: string | null;
}): ClientHealth {
  const { org, snapshot, lastActivityAt = null } = args;
  const progress = getOrgProgress(snapshot);
  const now = new Date();

  const daysSinceCreated = differenceInDays(now, new Date(org.createdAt));
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
