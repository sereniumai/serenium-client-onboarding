import { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link, useLocation } from 'react-router-dom';
import { FinalCelebration } from '../../components/FinalCelebration';
import { PausedScreen } from '../../components/PausedScreen';
import { useImpersonation } from '../../hooks/useImpersonation';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { CircleProgress } from '../../components/CircleProgress';
import { LatestReportHero } from '../../components/LatestReportHero';
import { CompleteBanner } from '../../components/CompleteBanner';
import { StatusPill } from '../../components/StatusPill';
import { LoadingState } from '../../components/LoadingState';
import { timeOfDayGreeting } from '../../lib/greeting';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot } from '../../hooks/useOnboarding';
import { getOrgProgress, moduleIsAdminLocked } from '../../lib/progress';
import { getService, SELECTABLE_SERVICES } from '../../config/modules';
import { SERVICE_ICON } from '../../config/serviceIcons';
import type { ServiceKey } from '../../types';
import { cn } from '../../lib/cn';

function motivation(pct: number, hasReports: boolean, awaitingProvisioning: boolean) {
  if (awaitingProvisioning) return "Everything you can do is done. We're provisioning the last pieces on our end and will let you know the moment they're ready.";
  if (pct === 0) return "A few quick steps to give us what we need to launch your campaigns.";
  if (pct < 30)  return "Good start. Keep moving through the sections below.";
  if (pct < 60)  return "You're past the halfway mark. A few more to go.";
  if (pct < 90)  return "Almost done, we've got most of what we need.";
  if (pct < 100) return "One last step and we're ready to launch.";
  return hasReports
    ? "Your latest monthly report is ready below."
    : "Your first monthly report lands at month end.";
}

export function OnboardingDashboard() {
  const { orgSlug } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { active: impersonating } = useImpersonation();
  const { data: org, isLoading: orgLoading } = useOrgBySlug(orgSlug);
  const { snapshot, isLoading: snapLoading } = useOrgSnapshot(org?.id);

  // Scroll to a phase anchor when the sidebar link uses #phase-<key>, or
  // smoothly scroll back to the top when the hash clears. Depends only on
  // snapshot *existence* (not identity) so autosave-driven re-fetches of
  // the snapshot don't yank the page back to the top mid-scroll.
  // ALL hooks live above any early return - must be called in the same
  // order every render. Each one tolerates a null snapshot so they can
  // run on loading renders too.
  const hasSnapshot = !!snapshot;
  useEffect(() => {
    if (!hasSnapshot) return;
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else {
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 40);
    }
  }, [location.hash, hasSnapshot]);

  // Memoized - getOrgProgress walks every enabled service's modules and
  // every submission. React Query's structural sharing means the snapshot
  // reference only changes when actual data changes, so this skips the
  // walk on child-triggered re-renders.
  const progress = useMemo(() => (snapshot ? getOrgProgress(snapshot) : null), [snapshot]);
  const onboardingDone = !!progress && progress.totalModules > 0 && progress.overall === 100;
  const resume = useMemo(
    () => (snapshot && !onboardingDone ? findLastTouchedModule(snapshot) : null),
    [snapshot, onboardingDone],
  );

  // Admin landing on a client page without an active "View as client"
  // session almost always means they typed / bookmarked the URL. Bounce
  // them to the admin view of that client.
  if (user?.role === 'admin' && !impersonating && orgSlug) {
    return <Navigate to={`/admin/clients/${orgSlug}`} replace />;
  }

  if (orgLoading || snapLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState variant="inline" />
        </div>
      </AppShell>
    );
  }
  // A transient query miss (RLS cache lag right after a brand-new client
  // accepts an invite, a flaky network, etc.) used to bounce the user to
  // /login while still signed in, which is a dead-end. Show a recoverable
  // retry state instead so they can refresh their way out of it.
  if (!org || !snapshot || !progress) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <p className="eyebrow mb-3">Hmm</p>
          <h2 className="font-display font-bold text-2xl mb-3">We couldn't load your workspace.</h2>
          <p className="text-white/55 max-w-md mb-6 text-sm">
            This usually clears up after a refresh. If it keeps happening, drop us a line at <a href="mailto:contact@sereniumai.com" className="text-orange hover:text-orange-hover">contact@sereniumai.com</a> and we'll sort it out.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Refresh
          </button>
        </div>
      </AppShell>
    );
  }

  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  // Post-onboarding states handled here:
  // - status === 'live'       → reports unlocked. Same dashboard layout as
  //                            onboarding, with services shown as "Live ✓
  //                            Completed" and Reports as a sidebar item under
  //                            Dashboard. First visit shows a one-time
  //                            FinalCelebration overlay, then they stay on
  //                            the dashboard (no redirect).
  // - status === 'onboarding' + 100% done → pending review (waiting for team)
  // - otherwise → active onboarding dashboard
  // Paused / churned clients hit a soft block. Auth is fine, admin can flip
  // status back to 'live' and the same login walks straight in. All data is
  // preserved. Admins viewing as client (impersonating) see the paused
  // screen too so they can verify what the client experiences.
  if ((org.status === 'paused' || org.status === 'churned') && (user?.role !== 'admin' || impersonating)) {
    return <PausedScreen businessName={org.businessName} status={org.status} />;
  }
  const isLive = org.status === 'live';
  // First-visit celebration for newly-live clients. Same dashboard layout as
  // onboarding, just with services shown as completed; the celebration is a
  // one-time overlay rather than a redirect away from the dashboard.
  // Even at 100% during onboarding we keep the dashboard fully editable ,
  // clients often need to come back and tweak answers, and we may circle back
  // asking for more.

  // Reports placeholder shown in hero metadata only, empty until status flips to 'live'.
  const reports: Array<never> = [];
  const latestReport = undefined;

  return (
    <AppShell>
      {isLive && <LiveFirstVisitCelebration org={org} firstName={firstName} userId={user?.id} />}
      <div className="relative">
        <HeroGlow />

        {/* HERO - minimalist. Restraint, not decoration. */}
        <section className="relative mx-auto max-w-6xl px-4 md:px-6 pt-8 md:pt-16 pb-8 md:pb-10">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-8"
          >
            <div className="flex-1 min-w-0">
              <div className="mb-3">
                <StatusPill variant="client" />
              </div>
              <p className="eyebrow mb-4">{org.businessName}</p>
              <h1 className="font-display font-black text-[clamp(1.875rem,5vw,3.25rem)] leading-[1.02] tracking-[-0.035em] mb-3">
                {timeOfDayGreeting()}, <span className="text-orange">{firstName}</span>.
              </h1>
              <p className="text-white/55 text-base md:text-lg max-w-2xl leading-relaxed">
                {isLive
                  ? "Everything we do for you is live. Reports drop monthly , find the latest in the sidebar."
                  : motivation(
                      progress.overall,
                      reports.length > 0,
                      // True only when every module the client can complete
                      // is already done, i.e. nothing left for them but
                      // something admin-locked is still outstanding. The
                      // previous "no resume target" check fired the moment
                      // they finished one service while others sat untouched.
                      !onboardingDone
                        && progress.overall > 0
                        && Object.values(progress.perService).flat().every(s => !s.canStart || s.status === 'complete'),
                    )}
              </p>

              {!isLive && !onboardingDone && resume && (
                <Link
                  to={`/onboarding/${org.slug}/services/${resume.serviceKey}/${resume.moduleKey}`}
                  className="group inline-flex items-center gap-2 mt-6 text-sm font-medium px-4 py-2 rounded-lg border border-orange/40 bg-orange/[0.04] text-white hover:bg-orange/[0.1] hover:border-orange/70 transition-all"
                >
                  <span className="text-orange font-semibold">Continue</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/85">{resume.serviceLabel} · {resume.moduleTitle}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-orange group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>

          </motion.div>
        </section>

        {/* POST-ONBOARDING, latest report + complete banner , onboarding-flow
            only. Live clients have services pinned as "Live" already so the
            extra "All sections complete" banner becomes noise. */}
        {!isLive && onboardingDone && (
          <section className="relative mx-auto max-w-6xl px-6 pb-2">
            <CompleteBanner hasReports={reports.length > 0} />
            {latestReport && <LatestReportHero report={latestReport} orgSlug={org.slug} />}
          </section>
        )}

        {/* SERVICE GRID. Eyebrow shifts copy by state , onboarding / summary / live. */}
        <section className="relative mx-auto max-w-6xl px-4 md:px-6 pb-16 md:pb-24 pt-2 md:pt-4">
          <p className="eyebrow mb-4">{isLive ? 'Your services' : onboardingDone ? 'Summary' : 'Onboarding'}</p>

          {progress.enabledServices.length === 0 && (
            <div className="card text-center py-16">
              <p className="text-white/60">No services enabled yet. Your Serenium team will set these up shortly.</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {progress.enabledServices.map((svcKey, i) => {
              const svc = getService(svcKey);
              if (!svc) return null;
              const summaries = progress.perService[svcKey];
              const Icon = SERVICE_ICON[svcKey];
              // Admin-locked modules (e.g. Phone number implementation before
              // we provision the AI number, GHL calendar setup before we hand
              // over access) can't be finished by the client. Exclude them
              // so the service shows complete once everything client-fillable
              // is done.
              const completable = summaries.filter(s => s.canStart);
              const svcComplete = completable.filter(s => s.status === 'complete').length;
              const svcTotal = completable.length;
              const svcPct = svcTotal === 0 ? 0 : Math.round((svcComplete / svcTotal) * 100);
              // Once live, every service is complete , they're paying, the
              // service is running. Show a green Completed pill rather than a
              // partial progress ring, matching the round-6 brief.
              const svcDone = isLive || (svcTotal > 0 && svcComplete === svcTotal);
              const anyInProgress = summaries.some(s => s.status !== 'not_started');
              // True when the only thing left on the service is something we
              // (Serenium) need to action, not the client. Surfaces a pill so
              // the client knows what's holding things up and that we're
              // already on it.
              const waitingOnUs = svcDone && summaries.some(s => !s.canStart && s.status !== 'complete');
              const waitingMessage = waitingOnUs && svcKey === 'ai_receptionist'
                ? "Waiting on Serenium to provision your AI number, we'll let you know the moment it's ready."
                : waitingOnUs && svcKey === 'ai_sms'
                ? "Waiting on Serenium to set up your CRM access, we'll let you know once it's live."
                : null;

              return (
                <motion.div
                  key={svcKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/onboarding/${org.slug}/services/${svcKey}`}
                    className={cn(
                      'card group block hover:border-orange/40 hover:-translate-y-0.5 transition-all',
                      svcDone && 'border-success/30',
                    )}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn(
                        'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
                        svcDone ? 'bg-success/10 text-success' : 'bg-orange/10 text-orange',
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-lg tracking-[-0.01em] truncate">{svc.label}</h4>
                        <p className="text-sm text-white/65 leading-relaxed mt-1">{svc.description}</p>
                      </div>
                      {isLive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/15 text-success text-[11px] font-semibold whitespace-nowrap">
                          <CheckCircle2 className="h-3 w-3" /> Live
                        </span>
                      ) : (
                        <CircleProgress value={svcPct} size={44} strokeWidth={3}>
                          <span className="text-[10px] font-semibold tabular-nums">{svcComplete}<span className="text-white/40">/{svcTotal}</span></span>
                        </CircleProgress>
                      )}
                    </div>
                    {waitingMessage && (
                      <div className="mt-1 mb-3 px-3 py-2 rounded-md bg-orange/[0.06] border border-orange/25 text-xs text-white/85 leading-relaxed">
                        {waitingMessage}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-sm font-medium',
                        waitingOnUs ? 'text-orange' : svcDone ? 'text-success' : anyInProgress ? 'text-orange' : 'text-white/50',
                      )}>
                        {isLive
                          ? <><CheckCircle2 className="h-4 w-4" /> Completed</>
                          : waitingOnUs
                            ? <>Waiting on Serenium</>
                            : svcDone
                              ? <><CheckCircle2 className="h-4 w-4" /> Done</>
                              : anyInProgress
                                ? <>In progress</>
                                : <>Not started</>
                        }
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange group-hover:gap-2 transition-all">
                        {isLive ? 'View' : svcDone ? 'Review' : anyInProgress ? 'Continue' : 'Start'} <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {org.showOtherServices !== false && (
            <OtherSerenumServices
              orgSlug={org.slug}
              unavailableServiceKeys={SELECTABLE_SERVICES
                .filter(svc => svc.key !== 'business_profile' && !progress.enabledServices.includes(svc.key))
                .map(s => s.key)}
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function OtherSerenumServices({ orgSlug, unavailableServiceKeys }: { orgSlug: string; unavailableServiceKeys: ServiceKey[] }) {
  if (unavailableServiceKeys.length === 0) return null;
  return (
    <section className="mt-16 md:mt-20">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="eyebrow">More from Serenium</p>
          <p className="text-sm text-white/55 mt-1">Other ways we help roofers grow. Tap any to see what we'd do for you.</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {unavailableServiceKeys.map((key) => {
          const svc = SELECTABLE_SERVICES.find(s => s.key === key);
          if (!svc) return null;
          const Icon = SERVICE_ICON[key];
          return (
            <Link
              key={key}
              to={`/onboarding/${orgSlug}/learn/${key}`}
              className="card group block hover:border-orange/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-orange/10 text-orange">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-lg tracking-[-0.01em]">{svc.label}</h4>
                  <p className="text-sm text-white/65 leading-relaxed mt-1">{svc.marketingDescription ?? svc.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-end pt-4 mt-4 border-t border-border-subtle">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange group-hover:gap-2 transition-all">
                  Learn more <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Find the module most recently touched that isn't already complete. */
function findLastTouchedModule(snapshot: import('../../lib/progress').OrgSnapshot):
  | { serviceKey: ServiceKey; moduleKey: string; serviceLabel: string; moduleTitle: string; estimatedMinutes: number; lastTouchedAt: string | null }
  | null
{
  // Pick the submission with the latest updated_at, map back to its module.
  const sorted = [...snapshot.submissions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const sub of sorted) {
    const [svcKey, modKey] = sub.fieldKey.split('.');
    if (!svcKey || !modKey) continue;
    const svc = getService(svcKey as ServiceKey);
    const mod = svc?.modules.find(m => m.key === modKey);
    if (!svc || !mod) continue;
    const mp = snapshot.moduleProgress.find(p => p.serviceKey === svcKey && p.moduleKey === modKey);
    if (mp?.status === 'complete') continue; // Skip completed modules, we want something to resume.
    if (moduleIsAdminLocked(snapshot, mod)) continue; // Don't point users at sections we still need to provision.
    return {
      serviceKey: svc.key,
      moduleKey: mod.key,
      serviceLabel: svc.label,
      moduleTitle: mod.title,
      estimatedMinutes: mod.estimatedMinutes ?? 5,
      lastTouchedAt: sub.updatedAt,
    };
  }

  // No recent submissions, fall back to the first in-progress module.
  const firstInProgress = snapshot.moduleProgress.find(p => p.status === 'in_progress');
  if (firstInProgress) {
    const svc = getService(firstInProgress.serviceKey);
    const mod = svc?.modules.find(m => m.key === firstInProgress.moduleKey);
    if (svc && mod && !moduleIsAdminLocked(snapshot, mod)) {
      return {
        serviceKey: svc.key,
        moduleKey: mod.key,
        serviceLabel: svc.label,
        moduleTitle: mod.title,
        estimatedMinutes: mod.estimatedMinutes ?? 5,
        lastTouchedAt: null,
      };
    }
  }
  return null;
}

function LiveFirstVisitCelebration({ org, firstName, userId }: {
  org: { id: string; businessName: string };
  firstName: string;
  userId?: string;
}) {
  const seenKey = `serenium.live-seen.${org.id}.${userId ?? 'anon'}`;
  const [show, setShow] = useState(() => {
    if (!userId) return false;
    try { return window.localStorage.getItem(seenKey) !== '1'; }
    catch { return false; }
  });
  if (!show) return null;
  return (
    <FinalCelebration
      show
      businessName={org.businessName}
      firstName={firstName}
      onContinue={() => {
        try { window.localStorage.setItem(seenKey, '1'); } catch { /* storage blocked */ }
        setShow(false);
      }}
    />
  );
}
