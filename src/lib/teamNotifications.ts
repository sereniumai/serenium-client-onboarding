import { supabase } from './supabase';
import { SERVICES } from '../config/modules';
import type { ServiceKey, ModuleProgress } from '../types';

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
  /** Progress BEFORE this mutation, so we can detect whole-service completion crossings. */
  previousProgress: ModuleProgress[];
  /** Progress AFTER this mutation. */
  nextProgress: ModuleProgress[];
  /** The most-recent change we just made. */
  justCompleted: { serviceKey: ServiceKey; moduleKey: string } | null;
  /** Which services are enabled for this org. Required for the whole-onboarding
   * completion check; without it the previous code was using
   * `nextProgress.every(...)` which fires the moment a single service is done
   * because module_progress rows only exist for touched modules. */
  enabledServices: ServiceKey[];
}

export async function fireTeamNotifications(args: FireArgs): Promise<void> {
  const eventKeys: string[] = [];

  // 1. Immediate module-completion events. Content is rendered server-side
  // from an allowlist, the client only triggers the event by key.
  if (args.justCompleted) {
    const key = `${args.justCompleted.serviceKey}.${args.justCompleted.moduleKey}`;
    if (IMMEDIATE_MODULE_EVENTS[key]) eventKeys.push(`module_completed:${key}`);
  }

  // 2. Whole-service completion, fires once per service.
  for (const svc of SERVICES) {
    const wasComplete = isServiceComplete(args.previousProgress, svc.key, svc.modules.map(m => m.key));
    const isComplete  = isServiceComplete(args.nextProgress,     svc.key, svc.modules.map(m => m.key));
    if (!wasComplete && isComplete) eventKeys.push(`service_completed:${svc.key}`);
  }

  // 3. Whole-onboarding completion, fires once when every module of every
  // ENABLED service is complete. Iterating enabledServices (not just the
  // module_progress rows that happen to exist) prevents the trigger from
  // firing the moment a single service finishes while others sit untouched.
  const wasAllComplete = isOnboardingComplete(args.previousProgress, args.enabledServices);
  const isAllComplete  = isOnboardingComplete(args.nextProgress,     args.enabledServices);
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

function isServiceComplete(progress: ModuleProgress[], svcKey: ServiceKey, moduleKeys: string[]): boolean {
  if (moduleKeys.length === 0) return false;
  return moduleKeys.every(mk =>
    progress.find(p => p.serviceKey === svcKey && p.moduleKey === mk)?.status === 'complete'
  );
}

function isOnboardingComplete(progress: ModuleProgress[], enabledServices: ServiceKey[]): boolean {
  if (enabledServices.length === 0) return false;
  return enabledServices.every(svcKey => {
    const svc = SERVICES.find(s => s.key === svcKey);
    if (!svc) return true;
    return isServiceComplete(progress, svcKey, svc.modules.map(m => m.key));
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
