import { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { FinalCelebration } from '../../components/FinalCelebration';
import { PausedScreen } from '../../components/PausedScreen';
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
  const [searchParams] = useSearchParams();
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

  // Admin landing on a client page without an explicit impersonate=1 flag
  // almost always means they typed / bookmarked the URL. Bounce them to
  // the admin view of that client.
  if (user?.role === 'admin' && searchParams.get('impersonate') !== '1' && orgSlug) {
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
  if (!org || !snapshot || !progress) return <Navigate to="/login" replace />;

  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  // Post-onboarding states handled here:
  // - status === 'live'       → reports have been unlocked. First time the
  //                            user lands here we show a welcome celebration,
  //                            after that we redirect straight to /reports.
  // - status === 'onboarding' + 100% done → pending review (waiting for team)
  // - otherwise → active onboarding dashboard
  // Paused / churned clients hit a soft block. Auth is fine, admin can flip
  // status back to 'live' and the same login walks straight in. All data is
  // preserved.
  if ((org.status === 'paused' || org.status === 'churned') && user?.role !== 'admin') {
    return <PausedScreen businessName={org.businessName} status={org.status} />;
  }
  if (org.status === 'live') return <LiveLandingGate org={org} firstName={firstName} userId={user?.id} />;
  // Even at 100% we keep the dashboard fully editable, clients often need to
  // come back and tweak answers, and we may circle back asking for more. The
  // celebration view only fires once Serenium marks them live in admin.

  // Reports placeholder shown in hero metadata only, empty until status flips to 'live'.
  const reports: Array<never> = [];
  const latestReport = undefined;

  return (
    <AppShell>
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
              <p className="text-white/55 text-base md:text-lg max-w-2xl leading-relaxed">{motivation(progress.overall, reports.length > 0, !onboardingDone && !resume && progress.overall > 0)}</p>

              {!onboardingDone && resume && (
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

        {/* POST-ONBOARDING, latest report + complete banner */}
        {onboardingDone && (
          <section className="relative mx-auto max-w-6xl px-6 pb-2">
            <CompleteBanner hasReports={reports.length > 0} />
            {latestReport && <LatestReportHero report={latestReport} orgSlug={org.slug} />}
          </section>
        )}

        {/* ONBOARDING, grouped by phase */}
        <section className="relative mx-auto max-w-6xl px-4 md:px-6 pb-16 md:pb-24 pt-2 md:pt-4">
          <p className="eyebrow mb-4">{onboardingDone ? 'Summary' : 'Onboarding'}</p>

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
              const svcDone = svcTotal > 0 && svcComplete === svcTotal;
              const anyInProgress = summaries.some(s => s.status !== 'not_started');

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
                      <CircleProgress value={svcPct} size={44} strokeWidth={3}>
                        <span className="text-[10px] font-semibold tabular-nums">{svcComplete}<span className="text-white/40">/{svcTotal}</span></span>
                      </CircleProgress>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-sm font-medium',
                        svcDone ? 'text-success' : anyInProgress ? 'text-orange' : 'text-white/50',
                      )}>
                        {svcDone
                          ? <><CheckCircle2 className="h-4 w-4" /> Done</>
                          : anyInProgress
                            ? <>In progress</>
                            : <>Not started</>
                        }
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange group-hover:gap-2 transition-all">
                        {svcDone ? 'Review' : anyInProgress ? 'Continue' : 'Start'} <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {org.showOtherServices !== false && (
            <OtherSerenumServices
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

function OtherSerenumServices({ unavailableServiceKeys }: { unavailableServiceKeys: ServiceKey[] }) {
  if (unavailableServiceKeys.length === 0) return null;
  return (
    <section className="mt-16 md:mt-20">
      <div className="flex items-center justify-between mb-5">
        <p className="eyebrow">More from Serenium</p>
        <a
          href="mailto:contact@sereniumai.com?subject=Adding%20a%20service%20to%20my%20Serenium%20plan"
          className="text-sm font-semibold text-orange hover:text-orange-hover transition-colors inline-flex items-center gap-1.5"
        >
          Ask about adding one <ArrowRight className="h-4 w-4" />
        </a>
      </div>
      <ul className="divide-y divide-border-subtle">
        {unavailableServiceKeys.map((key) => {
          const svc = SELECTABLE_SERVICES.find(s => s.key === key);
          if (!svc) return null;
          const Icon = SERVICE_ICON[key];
          return (
            <li key={key} className="group flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-orange/10 text-orange">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base text-white/90 group-hover:text-white transition-colors">{svc.label}</p>
                <p className="text-sm text-white/60 leading-relaxed">{svc.marketingDescription ?? svc.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
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

function LiveLandingGate({ org, firstName, userId }: {
  org: { id: string; slug: string; businessName: string };
  firstName: string;
  userId?: string;
}) {
  const navigate = useNavigate();
  const seenKey = `serenium.live-seen.${org.id}.${userId ?? 'anon'}`;
  const [show, setShow] = useState(() => {
    if (!userId) return false;
    try { return window.localStorage.getItem(seenKey) !== '1'; }
    catch { return false; }
  });

  useEffect(() => {
    if (!show) {
      navigate(`/onboarding/${org.slug}/reports`, { replace: true });
    }
  }, [show, org.slug, navigate]);

  if (!show) return null;

  return (
    <AppShell>
      <FinalCelebration
        show
        businessName={org.businessName}
        firstName={firstName}
        onContinue={() => {
          try { window.localStorage.setItem(seenKey, '1'); } catch { /* storage blocked */ }
          setShow(false);
        }}
      />
    </AppShell>
  );
}
