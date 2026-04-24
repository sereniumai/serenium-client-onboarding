import { useEffect } from 'react';
import { useParams, Navigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, PlayCircle, ArrowRight, Clock } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { CircleProgress } from '../../components/CircleProgress';
import { WelcomeVideoModal } from '../../components/WelcomeVideoModal';
import { LatestReportHero } from '../../components/LatestReportHero';
import { CompleteBanner } from '../../components/CompleteBanner';
import { PendingReview } from '../../components/PendingReview';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { timeOfDayGreeting } from '../../lib/greeting';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot } from '../../hooks/useOnboarding';
import { getOrgProgress } from '../../lib/progress';
import { getService } from '../../config/modules';
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
  const { data: org, isLoading: orgLoading } = useOrgBySlug(orgSlug);
  const { snapshot, isLoading: snapLoading } = useOrgSnapshot(org?.id);

  // Scroll to a phase anchor when the sidebar link uses #phase-<key>, or
  // smoothly scroll back to the top when the hash clears (e.g. user clicks Overview).
  useEffect(() => {
    if (!snapshot) return;
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else {
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 40);
    }
  }, [location.hash, snapshot]);

  if (orgLoading || snapLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh] text-white/60">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      </AppShell>
    );
  }
  if (!org || !snapshot) return <Navigate to="/login" replace />;

  const progress = getOrgProgress(snapshot);
  const firstName = user?.fullName.split(' ')[0] ?? 'there';
  const onboardingDone = progress.totalModules > 0 && progress.overall === 100;

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

  // Find next service with unfinished steps (top-level section, not individual module)
  let nextService: { svcKey: ServiceKey; label: string; hasStarted: boolean } | null = null;
  for (const svcKey of progress.enabledServices) {
    const summaries = progress.perService[svcKey];
    const anyIncomplete = summaries.some(s => s.status !== 'complete');
    if (!anyIncomplete) continue;
    const anyInProgress = summaries.some(s => s.status !== 'not_started');
    const svc = getService(svcKey)!;
    nextService = { svcKey, label: svc.label, hasStarted: anyInProgress };
    break;
  }


  return (
    <AppShell>
      <WelcomeVideoModal />
      <div className="relative">
        <HeroGlow />

        {/* HERO */}
        <section className="relative mx-auto max-w-6xl px-4 md:px-6 pt-8 md:pt-14 pb-6 md:pb-8">
          <div className="grid lg:grid-cols-[1fr,auto] gap-8 lg:gap-16 items-start">
            <div>
              <p className="eyebrow mb-4">Onboarding · {org.businessName}</p>
              <h1 className="font-display font-black text-[clamp(2rem,6vw,3.75rem)] leading-[1.02] tracking-[-0.03em] mb-4">
                {timeOfDayGreeting()}, <span className="text-orange">{firstName}</span>.
              </h1>
              <p className="text-white/60 text-lg max-w-xl">{motivation(progress.overall, reports.length > 0)}</p>

              {nextService && !onboardingDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <Link
                    to={`/onboarding/${org.slug}/services/${nextService.svcKey}`}
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-orange hover:bg-orange-hover text-white font-semibold text-sm shadow-orange-glow transition-colors"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {nextService.hasStarted ? 'Continue' : 'Start'} {nextService.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              )}
            </div>

            <div className="shrink-0 w-full lg:w-auto">
              <div className="card p-6 md:p-8 text-center w-full lg:min-w-[260px]">
                <CircleProgress value={progress.overall} size={140} strokeWidth={8}>
                  <div>
                    <p className="font-display font-black text-3xl tracking-tight">
                      <AnimatedNumber value={progress.overall} /><span className="text-lg text-white/40">%</span>
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">Complete</p>
                  </div>
                </CircleProgress>
                {onboardingDone && (
                  <div className="mt-6 pt-6 border-t border-border-subtle text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Steps complete</p>
                    <p className="font-display font-black text-xl tabular-nums">
                      {progress.completeModules}<span className="text-white/30 text-sm">/{progress.totalModules}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </section>

        {/* Resume where you left off */}
        {!onboardingDone && (() => {
          const resume = findLastTouchedModule(snapshot);
          if (!resume) return null;
          return (
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
                    <p className="text-xs text-white/55 mt-0.5 inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ~{resume.estimatedMinutes} min</span>
                      {resume.lastTouchedAt && <span>Last edited {relativeTime(resume.lastTouchedAt)}</span>}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-orange shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </section>
          );
        })()}

        {/* At-a-glance stats strip */}
        {!onboardingDone && (
          <section className="relative mx-auto max-w-6xl px-4 md:px-6 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatChip label="Modules done" value={`${progress.completeModules}/${progress.totalModules}`} />
              <StatChip label="Fields answered" value={String(snapshot.submissions.filter(s => s.value != null && s.value !== '').length)} />
              <StatChip label="Files uploaded" value={String(snapshot.uploads.length)} />
              <StatChip label="Started" value={daysSince(org.createdAt)} />
            </div>
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
