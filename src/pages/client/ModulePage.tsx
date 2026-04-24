import { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn';
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

import { ConditionalLinkBlock } from '../../components/ConditionalLinkBlock';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot, useSetModuleStatus, useSetTaskCompletion } from '../../hooks/useOnboarding';
import { getService, getModule } from '../../config/modules';
import { evaluate } from '../../lib/condition';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { moduleIsReady, findNextActionableModule, getOrgProgress, submissionIsFilled } from '../../lib/progress';
import { useQuery } from '@tanstack/react-query';
import { listStepVideos } from '../../lib/db/videos';
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
  const { data: stepVideos = [] } = useQuery({ queryKey: ['step_videos'], queryFn: listStepVideos });

  const svc = serviceKey ? getService(serviceKey as ServiceKey) : null;
  const mod = svc && moduleKey ? getModule(svc.key, moduleKey) : null;

  const readyRef = useRef(false);
  useEffect(() => {
    if (!snapshot || !org || !svc || !mod) return;
    const mpLocal = snapshot.moduleProgress.find(p => p.serviceKey === svc.key && p.moduleKey === mod.key);
    if (!mpLocal) return;
    const readyLocal = moduleIsReady(snapshot, svc.key, mod.key);
    const adminLocked = mod.lockedUntilAdminFlag ? !snapshot.adminFlags[mod.lockedUntilAdminFlag] : false;
    if (adminLocked) { readyRef.current = readyLocal; return; }
    if (readyLocal && mpLocal.status !== 'complete') {
      if (!readyRef.current || mpLocal.status === 'not_started' || mpLocal.status === 'in_progress') {
        setModStatus.mutate({ organizationId: org.id, serviceKey: svc.key, moduleKey: mod.key, status: 'complete', userId: user?.id });
        celebrateCompletionRef.current();
      }
    }
    readyRef.current = readyLocal;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, org?.id, svc?.key, mod?.key]);

  const celebrateCompletionRef = useRef<() => void>(() => {});

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
  const complete = mp?.status === 'complete';

  const svcIndex = svc.modules.findIndex(m => m.key === mod.key);

  const stepVideo = stepVideos.find(v => v.serviceKey === svc.key && v.moduleKey === mod.key);
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

  const celebrateCompletion = () => {
    const before = getOrgProgress(snapshot);
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
      toast.success('Module complete', { description: mod.title });
    }
    setShowComplete(true);
  };
  useEffect(() => { celebrateCompletionRef.current = celebrateCompletion; });

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
              const override = stepVideo?.url;
              const stored = override || mod.videoUrl || '';
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
              return null;
            })()}

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

                {mod.conditionalLinks && <ConditionalLinkBlock submissions={snapshot.submissions} svcKey={svc.key} modKey={mod.key} links={mod.conditionalLinks} />}
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

            {/* COMPLETION STATE */}
            <div className="py-6 border-t border-border-subtle mb-8">
              {complete ? (
                <div className="card border-success/40 bg-success/5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Module complete</p>
                    <p className="text-xs text-white/55">Your answers autosaved. The Serenium team can see them now.</p>
                  </div>
                  <button onClick={markIncomplete} className="text-xs text-white/60 hover:text-white underline underline-offset-2 shrink-0">
                    Edit again
                  </button>
                </div>
              ) : (
                <ModuleCompletionPanel
                  snapshot={snapshot}
                  svcKey={svc.key}
                  mod={mod}
                  adminLockedReason={adminLockedReason}
                />
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

function ModuleCompletionPanel({ snapshot, svcKey, mod, adminLockedReason }: {
  snapshot: import('../../lib/progress').OrgSnapshot;
  svcKey: ServiceKey;
  mod: import('../../config/modules').ModuleDef;
  adminLockedReason: string | null;
}) {
  const svcEntry = snapshot.services.find(s => s.serviceKey === svcKey);
  const disabledFieldSet = new Set(svcEntry?.disabledFieldKeys ?? []);
  const requiredFields = (mod.fields ?? []).filter(f => f.required && !disabledFieldSet.has(`${mod.key}.${f.key}`));
  const requiredTasks = (mod.tasks ?? []).filter(t => t.required !== false);

  const fieldStates = requiredFields.map(f => {
    const fieldKey = `${svcKey}.${mod.key}.${f.key}`;
    const sub = snapshot.submissions.find(s => s.fieldKey === fieldKey);
    const done = sub ? submissionIsFilled(f, sub.value, { uploads: snapshot.uploads, fieldKey }) : false;
    return { label: f.label ?? f.key, done };
  });
  const taskStates = requiredTasks.map(t => {
    const key = `${svcKey}.${mod.key}.${t.key}`;
    const done = !!snapshot.taskCompletions.find(c => c.taskKey === key && c.completed);
    return { label: t.label, done };
  });

  const totalRequired = fieldStates.length + taskStates.length;
  const totalDone = fieldStates.filter(s => s.done).length + taskStates.filter(s => s.done).length;

  if (adminLockedReason) return null;

  if (totalRequired === 0) {
    return (
      <div className="card border-success/30 bg-success/5 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <p className="text-sm text-white/70">Nothing required for this module. It'll mark itself complete as soon as you save anything.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">Still to finish</p>
        <span className="text-xs text-white/50 tabular-nums">{totalDone} / {totalRequired} done</span>
      </div>
      <div className="h-1 mb-4 rounded-full bg-bg-tertiary overflow-hidden">
        <div className="h-full bg-orange transition-all" style={{ width: `${totalRequired === 0 ? 0 : (totalDone / totalRequired) * 100}%` }} />
      </div>
      <ul className="space-y-2 text-sm">
        {fieldStates.map((f, i) => <CompletionRow key={'f' + i} label={f.label} done={f.done} />)}
        {taskStates.map((t, i) => <CompletionRow key={'t' + i} label={t.label} done={t.done} />)}
      </ul>
      <p className="text-[11px] text-white/40 mt-3">Fill these in and the module ticks itself complete automatically.</p>
    </div>
  );
}

function CompletionRow({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={cn('h-4 w-4 rounded flex items-center justify-center shrink-0', done ? 'bg-success/20 text-success' : 'border border-white/20 text-white/30')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </span>
      <span className={cn(done ? 'text-white/50 line-through' : 'text-white/85')}>{label}</span>
    </li>
  );
}
