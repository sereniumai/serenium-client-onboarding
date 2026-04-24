import { useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, PlayCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell } from '../../components/AppShell';
import { TaskCheckbox } from '../../components/TaskCheckbox';
import { FieldRenderer } from '../../components/FieldRenderer';
import { SaveIndicator } from '../../components/SaveIndicator';
import { Markdown } from '../../components/Markdown';
import { CompletionOverlay } from '../../components/CompletionOverlay';
import { FinalCelebration } from '../../components/FinalCelebration';
import { sfx } from '../../lib/soundFx';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

function ConditionalLinkBlock({ orgId, svcKey, modKey, links }: { orgId: string; svcKey: string; modKey: string; links: Record<string, string> }) {
  // Watch for a "registrar"-style select in this module, when picked, show the matching link.
  // Find the select field in siblings whose value matches a link key.
  // ConditionalLinkBlock temporarily shows no content during Supabase migration; re-enable in Phase 6.
  const subs: Array<{ fieldKey: string; value: unknown }> = [];
  void orgId; void svcKey; void modKey;
  const match = subs.find(s => typeof s.value === 'string' && links[s.value as string]);
  if (!match) return null;
  const label = match.value as string;
  const href = links[label];
  const embed = videoEmbedUrl(href);
  if (embed) {
    return (
      <div className="mt-4">
        <p className="text-xs text-white/60 mb-2">How to do this in {label}:</p>
        <div className="aspect-video rounded-xl border border-border-subtle overflow-hidden bg-black">
          <iframe
            src={embed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full"
            title={`Walkthrough: ${label}`}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 p-3 rounded-lg border border-orange/30 bg-orange/5">
      <p className="text-xs text-white/60 mb-1">How to do this in {label}:</p>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-orange hover:text-orange-hover">
        → Official guide for {label}
      </a>
    </div>
  );
}
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot, useSetModuleStatus, useSetTaskCompletion } from '../../hooks/useOnboarding';
import { getService, getModule } from '../../config/modules';
import { evaluate } from '../../lib/condition';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { moduleIsReady, findNextActionableModule, getOrgProgress } from '../../lib/progress';
import type { ServiceKey } from '../../types';

export function ModulePage() {
  const { orgSlug, serviceKey, moduleKey } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showComplete, setShowComplete] = useState(false);
  const [showFinal, setShowFinal] = useState(false);

  const { data: org } = useOrgBySlug(orgSlug);
  const { snapshot, isLoading } = useOrgSnapshot(org?.id);
  const setModStatus = useSetModuleStatus();
  const setTask = useSetTaskCompletion();

  const svc = serviceKey ? getService(serviceKey as ServiceKey) : null;
  const mod = svc && moduleKey ? getModule(svc.key, moduleKey) : null;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh] text-white/60">Loading…</div>
      </AppShell>
    );
  }
  if (!org || !svc || !mod || !snapshot) return <Navigate to={`/onboarding/${orgSlug}`} replace />;
  const isServiceEnabled = snapshot.services.some(s => s.serviceKey === svc.key);
  const isModDisabled = snapshot.services.find(s => s.serviceKey === svc.key)?.disabledModuleKeys?.includes(mod.key);
  if (!isServiceEnabled || isModDisabled) return <Navigate to={`/onboarding/${org.slug}`} replace />;
  if (mod.conditional && !evaluate(mod.conditional, snapshot.submissions, `${svc.key}.${mod.key}`)) {
    return <Navigate to={`/onboarding/${org.slug}`} replace />;
  }
  const adminLockedReason = mod.lockedUntilAdminFlag && !snapshot.adminFlags[mod.lockedUntilAdminFlag]
    ? (mod.lockedMessage ?? 'This step is locked until we finish setup on our end.')
    : null;

  const taskCompletions = snapshot.taskCompletions;
  const mp = snapshot.moduleProgress.find(p => p.serviceKey === svc.key && p.moduleKey === mod.key);
  const ready = moduleIsReady(snapshot, svc.key, mod.key);
  const complete = mp?.status === 'complete';

  const svcIndex = svc.modules.findIndex(m => m.key === mod.key);

  const nextActionable = findNextActionableModule(snapshot, { serviceKey: svc.key, moduleKey: mod.key });
  const next = nextActionable?.module ?? null;
  const nextSvcKey = nextActionable?.serviceKey ?? svc.key;

  const toggleTask = (taskKey: string, checked: boolean) => {
    setTask.mutate({ organizationId: org.id, taskKey: `${svc.key}.${mod.key}.${taskKey}`, completed: checked, userId: user?.id });
    if (checked) sfx.check();
    if (!complete && mp?.status === 'not_started') {
      setModStatus.mutate({ organizationId: org.id, serviceKey: svc.key, moduleKey: mod.key, status: 'in_progress', userId: user?.id });
    }
  };

  const markComplete = () => {
    const before = getOrgProgress(snapshot);
    setModStatus.mutate({ organizationId: org.id, serviceKey: svc.key, moduleKey: mod.key, status: 'complete', userId: user?.id });
    // After-progress is computed against the in-flight snapshot; refreshed data arrives via query invalidation.
    const after = { ...before, completeModules: before.completeModules + 1, overall: Math.round(((before.completeModules + 1) / before.totalModules) * 100) };

    if (after.totalModules > 0 && after.overall === 100) {
      sfx.complete();
      setShowFinal(true);
      return;
    }

    // Milestone crossing (25, 50, 75)
    const crossedMilestone = [25, 50, 75].find(ms => before.overall < ms && after.overall >= ms);
    if (crossedMilestone) {
      sfx.milestone();
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.35 },
        colors: ['#FF6B1F', '#FF7A35', '#FFD4BA', '#ffffff'],
        zIndex: 9999,
      });
      toast.success(`${crossedMilestone}% there!`, {
        description: 'Nice pace, keep the momentum going.',
        duration: 3500,
      });
    } else {
      sfx.submit();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.4 },
        colors: ['#FF6B1F', '#FF7A35', '#FFD4BA', '#ffffff'],
        zIndex: 9999,
      });
      toast.success('Submitted', { description: mod.title });
    }
    setShowComplete(true);
  };

  const markIncomplete = () => {
    setModStatus.mutate({ organizationId: org.id, serviceKey: svc.key, moduleKey: mod.key, status: 'in_progress', userId: user?.id });
  };

  const goNext = () => {
    setShowComplete(false);
    if (next) navigate(`/onboarding/${org.slug}/services/${nextSvcKey}/${next.key}`);
    else navigate(`/onboarding/${org.slug}`);
  };

  const totalTasksDone = mod.tasks?.filter(t =>
    taskCompletions.find(c => c.taskKey === `${svc.key}.${mod.key}.${t.key}` && c.completed)
  ).length ?? 0;
  const totalTasks = mod.tasks?.length ?? 0;

  return (
    <AppShell>
      <div className="min-w-0">
          <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-12">

            <div className="flex items-center justify-between mb-6">
              <Link to={`/onboarding/${org.slug}`} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
                <ChevronLeft className="h-4 w-4" /> Dashboard
              </Link>
              <SaveIndicator status={saveStatus} />
            </div>

            {/* HERO */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 text-xs">
                <span className="text-orange font-semibold uppercase tracking-[0.18em]">{svc.label}</span>
                <span className="text-white/20">·</span>
                <span className="text-white/40 uppercase tracking-wider">Step {String(svcIndex + 1).padStart(2, '0')} of {String(svc.modules.length).padStart(2, '0')}</span>
              </div>
              <h1 className="font-display font-black text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.04] tracking-[-0.025em] mb-4">{mod.title}</h1>
              <p className="text-white/60 text-lg">{mod.description}</p>

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/60 px-2.5 py-1.5 rounded-full border border-border-subtle">
                  <Clock className="h-3 w-3" /> ~{mod.estimatedMinutes} min
                </span>
                {totalTasks > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/60 px-2.5 py-1.5 rounded-full border border-border-subtle tabular-nums">
                    <CheckCircle2 className="h-3 w-3" /> {totalTasksDone}/{totalTasks} steps
                  </span>
                )}
                {complete && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success px-2.5 py-1.5 rounded-full bg-success/10 border border-success/20">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </span>
                )}
              </div>
            </div>

            {/* VIDEO */}
            {(() => {
              const stored = mod.videoUrl || '';
              const embed = stored ? videoEmbedUrl(stored) : null;
              if (embed) {
                return (
                  <div className="aspect-video rounded-2xl border border-border-subtle mb-10 overflow-hidden bg-black">
                    <iframe
                      src={embed}
                      allow="fullscreen; clipboard-write"
                      className="w-full h-full"
                      title={`Walkthrough: ${mod.title}`}
                    />
                  </div>
                );
              }
              return (
                <div className="w-full aspect-video rounded-2xl border border-border-subtle mb-10 relative overflow-hidden">
                  <img
                    src="/vidiq_thumbnail_19.png"
                    alt="Video thumbnail"
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-bg/30 to-transparent" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-orange/90 flex items-center justify-center shadow-orange-glow">
                    <PlayCircle className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-orange font-semibold">Walkthrough</p>
                      <p className="text-white font-semibold text-sm md:text-base">Video coming soon</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/80 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur">
                      <Clock className="h-3 w-3" /> ~{mod.estimatedMinutes} min
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* LOCKED BANNER */}
            {adminLockedReason && (
              <div className="card mb-8 border-orange/30 bg-orange/5">
                <p className="eyebrow mb-2">Not ready yet</p>
                <p className="text-sm text-white/80">{adminLockedReason}</p>
              </div>
            )}

            {/* Retell forwarding number block returns in Phase 6 (retell_numbers port). */}

            {/* INSTRUCTIONS */}
            {mod.instructions && (
              <div className="card mb-10">
                <p className="eyebrow mb-3">Instructions</p>
                <Markdown>{mod.instructions}</Markdown>

                {mod.externalLink && (
                  <a href={mod.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:text-orange-hover mt-4">
                    → Open external guide
                  </a>
                )}

                {mod.links && Object.keys(mod.links).length > 0 && (
                  <div className="mt-4 space-y-3">
                    {Object.entries(mod.links).map(([label, href]) => {
                      const embed = videoEmbedUrl(href);
                      if (embed) {
                        return (
                          <div key={label}>
                            <p className="text-xs text-white/60 mb-2">{label}</p>
                            <div className="aspect-video rounded-xl border border-border-subtle overflow-hidden bg-black">
                              <iframe
                                src={embed}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                allowFullScreen
                                className="w-full h-full"
                                title={label}
                              />
                            </div>
                          </div>
                        );
                      }
                      return (
                        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-orange hover:text-orange-hover">
                          → {label}
                        </a>
                      );
                    })}
                  </div>
                )}

                {mod.conditionalLinks && <ConditionalLinkBlock orgId={org.id} svcKey={svc.key} modKey={mod.key} links={mod.conditionalLinks} />}
              </div>
            )}

            {/* TASKS */}
            {mod.tasks && mod.tasks.length > 0 && (
              <section className="mb-10">
                <div className="flex items-end justify-between mb-4">
                  <h2 className="font-display font-bold text-xl">Checklist</h2>
                  <span className="text-xs text-white/40 tabular-nums">{totalTasksDone} / {totalTasks}</span>
                </div>
                <div className="space-y-2">
                  {mod.tasks.map(t => {
                    const tk = `${svc.key}.${mod.key}.${t.key}`;
                    const checked = !!taskCompletions.find(c => c.taskKey === tk && c.completed);
                    return (
                      <TaskCheckbox
                        key={t.key}
                        checked={checked}
                        onChange={(v) => toggleTask(t.key, v)}
                        label={t.label + (t.required === false ? ' (optional)' : '')}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* FORM */}
            {mod.fields && mod.fields.length > 0 && (
              <section className="mb-10">
                <div className="flex items-end justify-between mb-4">
                  <h2 className="font-display font-bold text-xl">Details</h2>
                  <span className="text-xs text-white/40">Autosaves as you type</span>
                </div>
                <div className="card space-y-6">
                  {mod.fields.map(f => (
                    <FieldRenderer
                      key={f.key}
                      field={f}
                      organizationId={org.id}
                      fieldKey={`${svc.key}.${mod.key}.${f.key}`}
                      userId={user?.id}
                      onStatusChange={setSaveStatus}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 py-6 border-t border-border-subtle mb-8">
              <div>
                {!ready && !complete && (
                  <p className="text-sm text-white/50">Complete required items to mark this module done.</p>
                )}
                {complete && (
                  <div className="inline-flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Submitted</span>
                  </div>
                )}
              </div>
              {complete ? (
                <motion.button whileTap={{ scale: 0.98 }} onClick={markIncomplete} className="btn-secondary w-full sm:w-auto">
                  Edit submission
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.98 }} onClick={markComplete} disabled={!ready || !!adminLockedReason} className="btn-primary w-full sm:w-auto">
                  Submit this step
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              )}
            </div>

            {next && (
              <Link to={`/onboarding/${org.slug}/services/${nextSvcKey}/${next.key}`} className="block card hover:border-orange/40 transition-colors group">
                <p className="eyebrow mb-2">
                  Up next{nextSvcKey !== svc.key && <> · <span className="text-white/40">{getService(nextSvcKey)?.label}</span></>}
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-xl truncate">{next.title}</p>
                    <p className="text-sm text-white/60 truncate">{next.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-orange shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )}
          </div>
        </div>

      <CompletionOverlay
        show={showComplete}
        title={next ? 'Submitted' : `${svc.label}, done`}
        subtitle={next
          ? nextSvcKey === svc.key
            ? `Got it. Up next: ${next.title}.`
            : `Got it. Up next: ${next.title}, in ${getService(nextSvcKey)?.label ?? 'the next section'}.`
          : "That's everything we need. Nice work, head back to the dashboard to see what's left or review your progress."}
        primaryLabel={next ? 'Next step →' : 'Back to dashboard'}
        onPrimary={goNext}
        secondaryLabel="Stay on this page"
        onSecondary={() => setShowComplete(false)}
      />

      <FinalCelebration
        show={showFinal}
        businessName={org.businessName}
        firstName={user?.fullName.split(' ')[0] ?? 'there'}
        onContinue={() => { setShowFinal(false); navigate(`/onboarding/${org.slug}`); }}
      />
    </AppShell>
  );
}
