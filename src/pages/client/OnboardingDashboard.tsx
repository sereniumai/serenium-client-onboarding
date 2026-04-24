import { useParams, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Lock, PlayCircle, ArrowRight } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { CircleProgress } from '../../components/CircleProgress';
import { WelcomeVideoModal } from '../../components/WelcomeVideoModal';
import { LatestReportHero } from '../../components/LatestReportHero';
import { CompleteBanner } from '../../components/CompleteBanner';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { timeOfDayGreeting } from '../../lib/greeting';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot } from '../../hooks/useOnboarding';
import { getOrgProgress, getEnabledModulesForService, estimatedMinutesRemaining, formatMinutes } from '../../lib/progress';
import { getService } from '../../config/modules';
import { PHASES } from '../../config/phases';
import { SERVICE_ICON } from '../../config/serviceIcons';
import type { ServiceKey, ModuleStatus } from '../../types';
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
  const { data: org, isLoading: orgLoading } = useOrgBySlug(orgSlug);
  const { snapshot, isLoading: snapLoading } = useOrgSnapshot(org?.id);

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
  // Reports come back in Phase 7, for now an empty array keeps the UI quiet.
  const reports: Array<never> = [];
  const latestReport = undefined;
  const onboardingDone = progress.totalModules > 0 && progress.overall === 100;

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
                    className="group relative flex items-center gap-4 sm:gap-5 px-5 sm:px-7 py-4 rounded-2xl bg-gradient-to-r from-orange via-orange-hover to-orange bg-[length:200%_auto] text-white shadow-orange-glow hover:shadow-[0_0_60px_rgba(255,107,31,0.5)] transition-all animate-breathe overflow-hidden max-w-full"
                  >
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />
                    <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-semibold text-base sm:text-lg truncate">
                        {nextService.hasStarted ? 'Continue' : 'Start'} {nextService.label}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
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
                <div className="mt-6 pt-6 border-t border-border-subtle text-center">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                    {onboardingDone ? 'Steps complete' : 'Time left'}
                  </p>
                  <p className="font-display font-black text-xl tabular-nums">
                    {onboardingDone
                      ? <>{progress.completeModules}<span className="text-white/30 text-sm">/{progress.totalModules}</span></>
                      : formatMinutes(estimatedMinutesRemaining(snapshot))}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </section>

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

          {(() => {
            const visiblePhases = PHASES
              .map(p => ({ ...p, services: p.services.filter(k => progress.enabledServices.includes(k)) }))
              .filter(p => p.services.length > 0);
            return (
          <div className="space-y-10">
            {visiblePhases.map((phase, phaseIdx) => {
              const phaseServices = phase.services;
              const displayNumber = phaseIdx + 1;
              const showPhaseChrome = visiblePhases.length > 1;

              // Roll up phase progress across its services.
              const phaseSummaries = phaseServices.flatMap(k => progress.perService[k] ?? []);
              const phaseComplete = phaseSummaries.filter(s => s.status === 'complete').length;
              const phaseTotal = phaseSummaries.length;
              const phasePct = phaseTotal === 0 ? 0 : Math.round((phaseComplete / phaseTotal) * 100);
              const phaseDone = phaseTotal > 0 && phaseComplete === phaseTotal;

              return (
                <motion.div
                  key={phase.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: phaseIdx * 0.08 }}
                >
                  {/* Phase header */}
                  {showPhaseChrome && (
                    <div className="flex items-start gap-4 mb-5 md:mb-6">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-2xl font-display font-black text-lg shrink-0 tabular-nums',
                        phaseDone ? 'bg-success text-white' : 'bg-orange/10 text-orange',
                      )}>
                        {phaseDone ? <CheckCircle2 className="h-6 w-6" /> : displayNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold mb-1">Phase {displayNumber}</p>
                        <h3 className="font-display font-black text-2xl md:text-3xl tracking-[-0.02em]">{phase.title}</h3>
                        <p className="text-sm text-white/60 mt-1">{phase.subtitle}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/40">Progress</p>
                          <p className="font-display font-black text-xl tabular-nums">{phasePct}<span className="text-white/30 text-sm">%</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Services inside the phase */}
                  <div className={cn('space-y-4', showPhaseChrome ? 'pl-0 md:pl-16' : 'pl-0')}>
                    {phaseServices.map(svcKey => {
                      const svc = getService(svcKey)!;
                      const enabledMods = getEnabledModulesForService(snapshot, svcKey);
                      const summaries = progress.perService[svcKey];
                      const Icon = SERVICE_ICON[svcKey];
                      const svcComplete = summaries.filter(s => s.status === 'complete').length;
                      const svcTotal = summaries.length;
                      const svcPct = svcTotal === 0 ? 0 : Math.round((svcComplete / svcTotal) * 100);

                      return (
                        <div key={svcKey} className="card overflow-hidden p-0">
                          <div className="p-4 md:p-5 flex items-start gap-3 md:gap-4 border-b border-border-subtle">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange shrink-0">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-display font-bold text-lg tracking-[-0.01em]">{svc.label}</h4>
                              <p className="text-xs text-white/55">{svc.description}</p>
                            </div>
                            <div className="shrink-0">
                              <CircleProgress value={svcPct} size={52}>
                                <span className="text-xs font-semibold">{svcComplete}<span className="text-white/40">/{svcTotal}</span></span>
                              </CircleProgress>
                            </div>
                          </div>

                          <div className="divide-y divide-border-subtle">
                            {enabledMods.map((m, i) => {
                              const summary = summaries[i];
                              if (!summary) return null;
                              const state = summary.status === 'complete' ? 'complete'
                                : summary.status === 'in_progress' ? 'in_progress'
                                : summary.canStart ? 'available'
                                : 'locked';
                              return (
                                <ModuleRow
                                  key={m.key}
                                  index={i + 1}
                                  orgSlug={org.slug}
                                  serviceKey={svcKey}
                                  moduleKey={m.key}
                                  title={m.title}
                                  description={m.description ?? ''}
                                  minutes={m.estimatedMinutes ?? 5}
                                  state={state}
                                  status={summary.status}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
            );
          })()}
        </section>
      </div>
    </AppShell>
  );
}

interface ModuleRowProps {
  index: number;
  orgSlug: string;
  serviceKey: ServiceKey;
  moduleKey: string;
  title: string;
  description: string;
  minutes: number;
  state: 'locked' | 'available' | 'in_progress' | 'complete';
  status: ModuleStatus;
}

function ModuleRow({ index, orgSlug, serviceKey, moduleKey, title, description, minutes, state }: ModuleRowProps) {
  const locked = state === 'locked';
  const complete = state === 'complete';
  const inProgress = state === 'in_progress';
  const href = `/onboarding/${orgSlug}/services/${serviceKey}#module-${moduleKey}`;
  void minutes;

  const content = (
    <div className={cn(
      'group flex items-center gap-3 md:gap-5 px-5 md:px-8 py-4 md:py-5 transition-colors',
      locked && 'opacity-50 cursor-not-allowed',
      !locked && 'hover:bg-bg-tertiary/40 active:bg-bg-tertiary/60',
    )}>
      <div className={cn(
        'h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold tabular-nums transition-colors',
        complete ? 'bg-success text-white' :
        inProgress ? 'bg-orange text-white' :
        locked ? 'bg-bg-tertiary text-white/30' :
        'bg-bg-tertiary text-white/60 group-hover:bg-orange/20 group-hover:text-orange',
      )}>
        {complete ? <CheckCircle2 className="h-4 w-4" />
          : locked ? <Lock className="h-3.5 w-3.5" />
          : inProgress ? <PlayCircle className="h-4 w-4" />
          : String(index).padStart(2, '0')}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold truncate', complete && 'text-white/70')}>{title}</p>
        <p className="text-xs text-white/50 truncate">{description}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs text-white/40 shrink-0">
        <Clock className="h-3 w-3" /> ~{minutes} min
      </div>
      {!locked && (
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-semibold transition-colors shrink-0',
          complete ? 'text-white/50' : 'text-orange bg-orange/10 group-hover:bg-orange group-hover:text-white',
        )}>
          <span className="hidden sm:inline">{complete ? 'Review' : inProgress ? 'Continue' : 'Start'}</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  if (locked) return content;
  return <Link to={href}>{content}</Link>;
}
