import { useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, PlayCircle, CheckCircle2, ArrowRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '../../components/AppShell';
import { TaskCheckbox } from '../../components/TaskCheckbox';
import { FieldRenderer } from '../../components/FieldRenderer';
import { SaveIndicator } from '../../components/SaveIndicator';
import { Markdown } from '../../components/Markdown';
import { CurriculumSidebar } from '../../components/CurriculumSidebar';
import { CompletionOverlay } from '../../components/CompletionOverlay';
import { FinalCelebration } from '../../components/FinalCelebration';
import { getOrgProgress } from '../../lib/progress';
import { sfx } from '../../lib/soundFx';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useAuth } from '../../auth/AuthContext';
import { db } from '../../lib/mockDb';
import { getService, getModule } from '../../config/modules';
import { loomEmbedUrl } from '../../lib/loom';
import { moduleIsReady } from '../../lib/progress';
import { useDbVersion } from '../../hooks/useDb';
import type { ServiceKey } from '../../types';

export function ModulePage() {
  const { orgSlug, serviceKey, moduleKey } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  useDbVersion();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showComplete, setShowComplete] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const org = orgSlug ? db.getOrganizationBySlug(orgSlug) : null;
  const svc = serviceKey ? getService(serviceKey as ServiceKey) : null;
  const mod = svc && moduleKey ? getModule(svc.key, moduleKey) : null;

  if (!org || !svc || !mod) return <Navigate to={`/onboarding/${orgSlug}`} replace />;
  if (!db.isModuleEnabledForOrg(org.id, svc.key, mod.key)) return <Navigate to={`/onboarding/${org.slug}`} replace />;

  const taskCompletions = db.getTaskCompletions(org.id);
  const progress = db.listModuleProgress(org.id);
  const mp = progress.find(p => p.serviceKey === svc.key && p.moduleKey === mod.key);
  const ready = moduleIsReady(org.id, svc.key, mod.key);
  const complete = mp?.status === 'complete';

  const svcIndex = svc.modules.findIndex(m => m.key === mod.key);
  const next = svc.modules[svcIndex + 1];

  const toggleTask = (taskKey: string, checked: boolean) => {
    db.setTaskCompletion({ organizationId: org.id, taskKey: `${svc.key}.${mod.key}.${taskKey}`, completed: checked, userId: user?.id });
    if (checked) sfx.check();
    if (!complete && mp?.status === 'not_started') {
      db.setModuleStatus({ organizationId: org.id, serviceKey: svc.key, moduleKey: mod.key, status: 'in_progress', userId: user?.id });
    }
  };

  const markComplete = () => {
    const before = getOrgProgress(org.id);
    db.setModuleStatus({ organizationId: org.id, serviceKey: svc.key, moduleKey: mod.key, status: 'complete', userId: user?.id });
    const after = getOrgProgress(org.id);

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
        description: 'Nice pace — keep the momentum going.',
        duration: 3500,
      });
    } else {
      sfx.submit();
      toast.success('Submitted', { description: mod.title });
    }
    setShowComplete(true);
  };

  const markIncomplete = () => {
    db.setModuleStatus({ organizationId: org.id, serviceKey: svc.key, moduleKey: mod.key, status: 'in_progress', userId: user?.id });
  };

  const goNext = () => {
    setShowComplete(false);
    if (next) navigate(`/onboarding/${org.slug}/services/${svc.key}/${next.key}`);
    else navigate(`/onboarding/${org.slug}`);
  };

  const totalTasksDone = mod.tasks?.filter(t =>
    taskCompletions.find(c => c.taskKey === `${svc.key}.${mod.key}.${t.key}` && c.completed)
  ).length ?? 0;
  const totalTasks = mod.tasks?.length ?? 0;

  return (
    <AppShell>
      <div className="lg:grid lg:grid-cols-[300px,1fr]">
        {/* SIDEBAR — desktop */}
        <aside className="hidden lg:block border-r border-border-subtle bg-bg-secondary/40 overflow-y-auto sticky top-[65px] h-[calc(100vh-65px)] p-5">
          <Link to={`/onboarding/${org.slug}`} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-5 px-3">
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <CurriculumSidebar organizationId={org.id} orgSlug={org.slug} />
        </aside>

        {/* SIDEBAR — mobile overlay */}
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.aside
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                className="fixed inset-y-0 left-0 z-50 w-80 bg-bg-secondary border-r border-border-subtle overflow-y-auto p-5 lg:hidden"
              >
                <div className="flex items-center justify-between mb-5">
                  <Link to={`/onboarding/${org.slug}`} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
                    <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
                  </Link>
                  <button onClick={() => setMobileNavOpen(false)} className="text-white/50 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <CurriculumSidebar organizationId={org.id} orgSlug={org.slug} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* MAIN */}
        <div className="min-w-0">
          <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-12">

            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setMobileNavOpen(true)} className="lg:hidden inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
                <Menu className="h-4 w-4" /> Onboarding
              </button>
              <div className="hidden lg:block" />
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
              const stored = db.getVideoUrl(svc.key, mod.key);
              const embed = stored ? loomEmbedUrl(stored) : null;
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

            {/* INSTRUCTIONS */}
            <div className="card mb-10">
              <p className="eyebrow mb-3">Instructions</p>
              <Markdown>{mod.instructions}</Markdown>
            </div>

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
                <motion.button whileTap={{ scale: 0.98 }} onClick={markComplete} disabled={!ready} className="btn-primary w-full sm:w-auto">
                  Submit this step
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              )}
            </div>

            {next && (
              <Link to={`/onboarding/${org.slug}/services/${svc.key}/${next.key}`} className="block card hover:border-orange/40 transition-colors group">
                <p className="eyebrow mb-2">Up next · Step {String(svcIndex + 2).padStart(2, '0')}</p>
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
      </div>

      <CompletionOverlay
        show={showComplete}
        title={next ? 'Submitted' : `${svc.label} — done`}
        subtitle={next
          ? `Got it. Up next: ${next.title}.`
          : "That's everything we need for this service. Head back to finish the rest."}
        primaryLabel={next ? 'Next step' : 'Back to dashboard'}
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
