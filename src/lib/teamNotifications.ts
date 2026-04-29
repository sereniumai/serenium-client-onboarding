import { supabase } from './supabase';
import { SERVICES } from '../config/modules';
import { getOrgProgress, type OrgSnapshot } from './progress';
import type { ServiceKey } from '../types';

/**
 * Module-level events that fire a team notification the moment they complete.
 * Service-level events (whole service finished) are computed dynamically
 * from the config, we notify on any service becoming fully complete.
 */
const IMMEDIATE_MODULE_EVENTS: Record<string, { subject: string; message: string }> = {
  'website.registrar_delegation': {
    subject: 'Registrar access granted',
    message: "The client has added contact@sereniumai.com as a delegate on their domain registrar. Confirm access + take next steps on DNS now.",
  },
  'website.cms_access': {
    subject: 'CMS access granted',
    message: "The client has added us as a WordPress admin. Log in, confirm access, and begin the site audit.",
  },
  'website.analytics_and_search_console': {
    subject: 'Analytics + Search Console access granted',
    message: "Admin access to Google Analytics + Search Console is in. Verify, configure conversion goals, and submit the sitemap if appropriate.",
  },
  'ai_receptionist.phone_number_setup': {
    subject: 'Call forwarding configured, live phone now routes to the AI',
    message: "Client has completed the phone forwarding steps. Test the AI immediately, their customers may already be reaching it.",
  },
  'facebook_ads.grant_access': {
    subject: 'Meta Business Manager access granted',
    message: "Partner access is in for the Meta Business Manager, Page, Instagram, Pixel, and Ad Account. Verify and begin campaign setup.",
  },
};

export interface FireArgs {
  organizationId: string;
  /** Snapshot BEFORE this mutation. Lets us detect completion *crossings*
   *  (was-incomplete -> is-complete) so the same email never fires twice. */
  previousSnapshot: OrgSnapshot;
  /** Snapshot AFTER this mutation, with the just-completed module's
   *  status flipped. */
  nextSnapshot: OrgSnapshot;
  /** The most-recent change we just made. */
  justCompleted: { serviceKey: ServiceKey; moduleKey: string } | null;
}

export async function fireTeamNotifications(args: FireArgs): Promise<void> {
  const eventKeys: string[] = [];

  // 1. Immediate module-completion events. Content is rendered server-side
  // from an allowlist, the client only triggers the event by key.
  if (args.justCompleted) {
    const key = `${args.justCompleted.serviceKey}.${args.justCompleted.moduleKey}`;
    if (IMMEDIATE_MODULE_EVENTS[key]) eventKeys.push(`module_completed:${key}`);
  }

  // 2 + 3. Service- and onboarding-completion crossings. Both are computed
  // off getOrgProgress (the same helper the dashboard uses) so we apply the
  // exact same filtering: per-org-disabled modules excluded, conditionally-
  // hidden modules excluded, admin-locked modules treated as "not the
  // client's responsibility" via canStart.
  const previousProgress = getOrgProgress(args.previousSnapshot);
  const nextProgress     = getOrgProgress(args.nextSnapshot);

  for (const svc of SERVICES) {
    if (!nextProgress.enabledServices.includes(svc.key)) continue;
    const wasComplete = isServiceComplete(previousProgress, svc.key);
    const isComplete  = isServiceComplete(nextProgress,     svc.key);
    if (!wasComplete && isComplete) eventKeys.push(`service_completed:${svc.key}`);
  }

  const wasAllComplete = isOnboardingComplete(previousProgress);
  const isAllComplete  = isOnboardingComplete(nextProgress);
  if (!wasAllComplete && isAllComplete) eventKeys.push('onboarding:complete');

  for (const eventKey of eventKeys) {
    fireOne(args.organizationId, eventKey).catch(err => console.warn('[team-notif] send failed', err));
  }
}

async function fireOne(orgId: string, eventKey: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await fetch('/api/send-team-notification', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ organizationId: orgId, eventKey }),
  });
}

type Progress = ReturnType<typeof getOrgProgress>;

/**
 * "Service complete" from the team's POV = the client has finished every
 * module they can start in that service. Modules that are admin-locked
 * (canStart=false), per-org-disabled, or conditionally hidden are filtered
 * out by getOrgProgress already; we only check the canStart subset here.
 *
 * If a service has zero canStart modules (e.g. AI Receptionist before we've
 * unlocked the phone-number module), there's nothing the client can finish,
 * so the service can't *transition* to complete via a client action — return
 * false. Once we unlock a module the canStart count flips to 1 and we'll
 * fire the email when the client subsequently completes it.
 */
function isServiceComplete(progress: Progress, svcKey: ServiceKey): boolean {
  const summaries = progress.perService[svcKey];
  if (!summaries) return false;
  const completable = summaries.filter(s => s.canStart);
  if (completable.length === 0) return false;
  return completable.every(s => s.status === 'complete');
}

/**
 * "Onboarding complete" = every enabled service is done from the client's
 * POV. A service with no canStart modules counts as done (there's nothing
 * the client could do for it — anything pending is on us). Without this
 * the email never fires for any client whose enabled services include one
 * that's still fully admin-locked.
 */
function isOnboardingComplete(progress: Progress): boolean {
  if (progress.enabledServices.length === 0) return false;
  return progress.enabledServices.every(svcKey => {
    const summaries = progress.perService[svcKey] ?? [];
    const completable = summaries.filter(s => s.canStart);
    if (completable.length === 0) return true;
    return completable.every(s => s.status === 'complete');
  });
}

/**
 * Signup / first-login is best detected once, at session-mount, for client role.
 * Call this from AuthContext when the first 'SIGNED_IN' fires for a user.
 */
export async function fireFirstLoginNotification(orgId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await fetch('/api/send-team-notification', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ organizationId: orgId, eventKey: 'signup:first_login' }),
  }).catch(() => {});
}
