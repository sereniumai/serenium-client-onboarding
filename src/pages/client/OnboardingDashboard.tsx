import { useEffect, useMemo } from 'react';
import { useParams, Navigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, PlayCircle, ArrowRight } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { CircleProgress } from '../../components/CircleProgress';
import { LatestReportHero } from '../../components/LatestReportHero';
import { CompleteBanner } from '../../components/CompleteBanner';
import { PendingReview } from '../../components/PendingReview';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { StatusPill } from '../../components/StatusPill';
import { LoadingState } from '../../components/LoadingState';
import { timeOfDayGreeting } from '../../lib/greeting';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot } from '../../hooks/useOnboarding';
import { getOrgProgress } from '../../lib/progress';
import { getService, SELECTABLE_SERVICES } from '../../config/modules';
import { SERVICE_ICON } from '../../config/serviceIcons';
import type { ServiceKey } from '../../types';
import { cn } from '../../lib/cn';

function motivation(pct: number, hasReports: boolean) {
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

  // Admin landing on a client page without an explicit impersonate=1 flag
  // almost always means they typed / bookmarked the URL. Bounce them to
  // the admin view of that client instead of the client-facing dashboard.
  // This must come AFTER hooks to avoid conditional-hook violations.
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
  if (!org || !snapshot) return <Navigate to="/login" replace />;

  // Memoized — getOrgProgress walks every enabled service's modules and
  // every submission. React Query's structural sharing means the snapshot
  // reference only changes when actual data changes, so this skips the
  // walk on child-triggered re-renders (e.g. the StatusPill pinging
  // /api/health every 60s shouldn't recompute the entire dashboard).
  const progress = useMemo(() => getOrgProgress(snapshot), [snapshot]);
  const filledCount = useMemo(
    () => snapshot.submissions.filter(s => s.value != null && s.value !== '').length,
    [snapshot.submissions],
  );
  const firstName = user?.fullName.split(' ')[0] ?? 'there';
  const onboardingDone = progress.totalModules > 0 && progress.overall === 100;
  // Memoized — sorts the entire submissions list by updated_at, then
  // walks modules looking for the last-touched one. Stays stable while
  // the background status pill refetches.
  const resume = useMemo(
    () => (onboardingDone ? null : findLastTouchedModule(snapshot)),
    [snapshot, onboardingDone],
  );

  // Post-onboarding states handled here:
  // - status === 'live'       → reports have been unlocked, redirect to /reports
  // - status === 'onboarding' + 100% done → pending review (waiting for team)
  // - otherwise → active onboarding dashboard
  if (org.status === 'live') return <Navigate to={`/onboarding/${org.slug}/reports`} replace />;
  if (onboardingDone) {
    return (
      <AppShell>
        <PendingReview org={org} firstName={firstName} />
      </AppShell>
    );
  }

  // Reports placeholder shown in hero metadata only, empty until status flips to 'live'.
  const reports: Array<never> = [];
  const latestReport = undefined;

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />

        {/* HERO */}
        <section className="relative mx-auto max-w-6xl px-4 md:px-6 pt-8 md:pt-14 pb-6 md:pb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <p className="eyebrow">Onboarding · {org.businessName}</p>
                <StatusPill variant="client" />
              </div>
              <h1 className="font-display font-black text-[clamp(2rem,6vw,3.75rem)] leading-[1.02] tracking-[-0.03em] mb-4">
                {timeOfDayGreeting()}, <span className="text-orange">{firstName}</span>.
              </h1>
              <p className="text-white/60 text-lg max-w-xl">{motivation(progress.overall, reports.length > 0)}</p>
            </div>

            <div className="shrink-0 self-start md:self-center">
              <CircleProgress value={progress.overall} size={128} strokeWidth={7}>
                <div className="text-center">
                  <p className="font-display font-black text-2xl tracking-tight leading-none">
                    <AnimatedNumber value={progress.overall} /><span className="text-sm text-white/40">%</span>
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-white/40 mt-1">Complete</p>
                </div>
              </CircleProgress>
            </div>
          </div>
        </section>

        {/* At-a-glance stats strip */}
        {!onboardingDone && (
          <section className="relative mx-auto max-w-6xl px-4 md:px-6 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatChip label="Modules done" value={`${progress.completeModules}/${progress.totalModules}`} />
              <StatChip label="Fields answered" value={String(filledCount)} />
              <StatChip label="Files uploaded" value={String(snapshot.uploads.length)} />
              <StatChip label="Started" value={daysSince(org.createdAt)} />
            </div>
          </section>
        )}

        {/* Resume where you left off */}
        {!onboardingDone && resume && (
          <section className="relative mx-auto max-w-6xl px-4 md:px-6 pb-4">
              <Link
                to={`/onboarding/${org.slug}/services/${resume.serviceKey}/${resume.moduleKey}`}
                className="card block group border-orange/30 hover:border-orange/60 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-orange/15 text-orange flex items-center justify-center shrink-0">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="eyebrow mb-1">Pick up where you left off</p>
                    <p className="font-display font-bold text-base md:text-lg truncate">{resume.serviceLabel} · {resume.moduleTitle}</p>
                    {resume.lastTouchedAt && (
                      <p className="text-xs text-white/55 mt-0.5">Last edited {relativeTime(resume.lastTouchedAt)}</p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-orange shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </section>
        )}

        {/* POST-ONBOARDING, latest report + complete banner */}
        {onboardingDone && (
          <section className="relative mx-auto max-w-6xl px-6 pb-2">
            <CompleteBanner hasReports={reports.length > 0} />
            {latestReport && <LatestReportHero report={latestReport} orgSlug={org.slug} />}
          </section>
        )}

        {/* ONBOARDING, grouped by phase */}
        <section className="relative mx-auto max-w-6xl px-4 md:px-6 pb-16 md:pb-24 pt-6 md:pt-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display font-black text-2xl md:text-3xl tracking-[-0.02em]">
                {onboardingDone ? 'Onboarding summary' : 'What we need from you'}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {onboardingDone ? 'Everything you submitted. Open any step to review or update.' : 'Tackle these in any order. We autosave as you go.'}
              </p>
            </div>
          </div>

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
              const svcComplete = summaries.filter(s => s.status === 'complete').length;
              const svcTotal = summaries.length;
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
                        <p className="text-xs text-white/55 leading-relaxed mt-0.5">{svc.description}</p>
                      </div>
                      <CircleProgress value={svcPct} size={44} strokeWidth={3}>
                        <span className="text-[10px] font-semibold tabular-nums">{svcComplete}<span className="text-white/40">/{svcTotal}</span></span>
                      </CircleProgress>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium',
                        svcDone ? 'text-success' : anyInProgress ? 'text-orange' : 'text-white/50',
                      )}>
                        {svcDone
                          ? <><CheckCircle2 className="h-3.5 w-3.5" /> Done</>
                          : anyInProgress
                            ? <>In progress</>
                            : <>Not started</>
                        }
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange group-hover:gap-2 transition-all">
                        {svcDone ? 'Review' : anyInProgress ? 'Continue' : 'Start'} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {/* Services not currently part of this client's package, shown
                disabled so they know what else Serenium can do. Business
                Profile is always included for every client, so it never
                appears here even if it's somehow disabled on their account. */}
            {SELECTABLE_SERVICES
              .filter(svc => svc.key !== 'business_profile' && !progress.enabledServices.includes(svc.key))
              .map((svc, i) => {
                const Icon = SERVICE_ICON[svc.key];
                return (
                  <motion.div
                    key={svc.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (progress.enabledServices.length + i) * 0.04 }}
                  >
                    <div
                      className="card block relative border-dashed border-white/10 bg-bg-secondary/30 opacity-60 cursor-not-allowed"
                      aria-disabled="true"
                    >
                      <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-semibold text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                        Not in your plan
                      </span>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-white/5 text-white/30">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 pr-20">
                          <h4 className="font-display font-bold text-lg tracking-[-0.01em] truncate text-white/50">{svc.label}</h4>
                          <p className="text-xs text-white/35 leading-relaxed mt-0.5">{svc.description}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/5">
                        <p className="text-xs text-white/40">
                          Interested? <a href="mailto:contact@sereniumai.com?subject=Adding a service to my Serenium plan" className="text-orange hover:text-orange-hover pointer-events-auto">Email us</a> to add it.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            }
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">{label}</p>
      <p className="font-display font-black text-xl tabular-nums">{value}</p>
    </div>
  );
}

function daysSince(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000)));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
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
    if (svc && mod) {
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
