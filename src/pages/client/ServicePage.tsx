import { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Clock, PlayCircle, ArrowRight, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { TaskCheckbox } from '../../components/TaskCheckbox';
import { FieldRenderer } from '../../components/FieldRenderer';
import { SaveIndicator } from '../../components/SaveIndicator';
import { Markdown } from '../../components/Markdown';
import { FinalCelebration } from '../../components/FinalCelebration';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot, useSetModuleStatus, useSetTaskCompletion } from '../../hooks/useOnboarding';
import { getService, type ModuleDef } from '../../config/modules';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { getOrgProgress, getEnabledModulesForService, moduleIsAdminLocked, moduleIsReady } from '../../lib/progress';
import { useQuery } from '@tanstack/react-query';
import { listStepVideos } from '../../lib/db/videos';
import { sfx } from '../../lib/soundFx';
import type { ServiceKey } from '../../types';
import { cn } from '../../lib/cn';

export function ServicePage() {
  const { orgSlug, serviceKey } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showFinal, setShowFinal] = useState(false);

  // Scroll to hash anchor when the page loads or hash changes
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }, [location.hash, serviceKey]);

  const { data: org } = useOrgBySlug(orgSlug);
  const { snapshot, isLoading } = useOrgSnapshot(org?.id);
  const svc = serviceKey ? getService(serviceKey as ServiceKey) : null;
  const setModStatus = useSetModuleStatus();
  const setTask = useSetTaskCompletion();
  const { data: stepVideos = [] } = useQuery({ queryKey: ['step_videos'], queryFn: listStepVideos });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh] text-white/60">Loading…</div>
      </AppShell>
    );
  }
  if (!org || !svc || !snapshot) return <Navigate to={`/onboarding/${orgSlug}`} replace />;
  if (!snapshot.services.some(s => s.serviceKey === svc.key)) {
    return <Navigate to={`/onboarding/${org.slug}`} replace />;
  }

  const modules = getEnabledModulesForService(snapshot, svc.key);
  const progress = getOrgProgress(snapshot);
  const svcSummaries = progress.perService[svc.key] ?? [];
  const done = svcSummaries.filter(s => s.status === 'complete').length;
  const total = svcSummaries.length;

  return (
    <AppShell>
      <div className="min-w-0">
          <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-12">

            <div className="flex items-center justify-between mb-6">
              <div />
              <SaveIndicator status={saveStatus} />
            </div>

            {/* SERVICE HERO */}
            <div className="mb-8">
              <p className="eyebrow mb-3">{svc.label}</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,5vw,3rem)] leading-[1.05] tracking-[-0.025em] mb-3">
                {svc.label === 'Business Profile' ? 'Tell us about your business.' : svc.label}
              </h1>
              <p className="text-white/60 text-base">{svc.description}</p>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/70 px-2.5 py-1.5 rounded-full border border-border-subtle tabular-nums">
                  <CheckCircle2 className="h-3 w-3" /> {done} / {total} complete
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-white/60 px-2.5 py-1.5 rounded-full border border-border-subtle">
                  Autosaves as you type
                </span>
              </div>
            </div>

            <div className="space-y-10">
              {modules.map((m, i) => (
                <ModuleSection
                  key={m.key}
                  index={i + 1}
                  total={modules.length}
                  module={m}
                  snapshot={snapshot}
                  serviceKey={svc.key}
                  userId={user?.id}
                  stepVideoOverride={stepVideos.find(v => v.serviceKey === svc.key && v.moduleKey === m.key)?.url}
                  onStatusChange={setSaveStatus}
                  onSetTask={(taskKey, checked) => setTask.mutate({ organizationId: org.id, taskKey, completed: checked, userId: user?.id })}
                  onSetModuleStatus={(status) => setModStatus.mutate({ organizationId: org.id, serviceKey: svc.key, moduleKey: m.key, status, userId: user?.id })}
                  onComplete={() => {
                    if (progress.totalModules > 0 && progress.completeModules + 1 === progress.totalModules) {
                      setShowFinal(true);
                    }
                  }}
                />
              ))}
            </div>

            {/* BOTTOM CTA */}
            <div className="mt-12 pt-6 border-t border-border-subtle flex items-center justify-between gap-4">
              <Link to={`/onboarding/${org.slug}`} className="btn-secondary">
                <ChevronLeft className="h-4 w-4" /> Back to dashboard
              </Link>
              {done === total && total > 0 && (
                <span className="inline-flex items-center gap-2 text-success font-medium">
                  <CheckCircle2 className="h-5 w-5" /> All submitted
                </span>
              )}
            </div>
          </div>
        </div>

      <FinalCelebration
        show={showFinal}
        businessName={org.businessName}
        firstName={user?.fullName.split(' ')[0] ?? 'there'}
        onContinue={() => { setShowFinal(false); navigate(`/onboarding/${org.slug}`); }}
      />
    </AppShell>
  );
}

function ModuleSection({
  index, total, module, snapshot, serviceKey, userId, stepVideoOverride, onStatusChange, onSetTask, onSetModuleStatus, onComplete,
}: {
  index: number;
  total: number;
  module: ModuleDef;
  snapshot: import('../../lib/progress').OrgSnapshot;
  serviceKey: ServiceKey;
  userId?: string;
  stepVideoOverride?: string;
  onStatusChange: (s: 'idle' | 'saving' | 'saved' | 'error') => void;
  onSetTask: (taskKey: string, checked: boolean) => void;
  onSetModuleStatus: (status: 'not_started' | 'in_progress' | 'complete') => void;
  onComplete: () => void;
}) {
  void userId;
  const sectionRef = useRef<HTMLDivElement>(null);
  const orgId = snapshot.organizationId;
  const mp = snapshot.moduleProgress.find(p => p.serviceKey === serviceKey && p.moduleKey === module.key);
  const complete = mp?.status === 'complete';
  const adminLocked = moduleIsAdminLocked(snapshot, module);
  const effectiveUrl = stepVideoOverride || module.videoUrl;
  const embed = effectiveUrl ? videoEmbedUrl(effectiveUrl) : null;
  const hasVideo = !!embed || !!module.videoPlaceholder;

  const svcEntry = snapshot.services.find(s => s.serviceKey === serviceKey);
  const disabledFieldSet = new Set(svcEntry?.disabledFieldKeys ?? []);
  const enabledFields = (module.fields ?? []).filter(f => !disabledFieldSet.has(`${module.key}.${f.key}`));

  const readyFor = moduleIsReady(snapshot, serviceKey, module.key);

  const toggleTask = (taskKey: string, checked: boolean) => {
    onSetTask(`${serviceKey}.${module.key}.${taskKey}`, checked);
    if (checked) sfx.check();
    if (!complete && mp?.status === 'not_started') {
      onSetModuleStatus('in_progress');
    }
  };

  const markComplete = () => {
    onSetModuleStatus('complete');
    sfx.submit();
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 }, colors: ['#FF6B1F', '#FF7A35', '#ffffff'], zIndex: 9999 });
    toast.success('Submitted', { description: module.title });
    onComplete();
  };

  const markIncomplete = () => { onSetModuleStatus('in_progress'); };

  return (
    <div ref={sectionRef} id={`module-${module.key}`} className={cn(
      'card p-0 overflow-hidden scroll-mt-24',
      complete && 'border-success/20'
    )}>
      {/* Section header */}
      <div className="px-5 md:px-7 py-5 flex items-start gap-4 border-b border-border-subtle">
        <div className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold tabular-nums',
          complete ? 'bg-success text-white' : 'bg-bg-tertiary text-white/70'
        )}>
          {complete ? <CheckCircle2 className="h-4 w-4" /> : String(index).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-lg md:text-xl">{module.title}</h2>
            <span className="text-xs text-white/30">{index} of {total}</span>
          </div>
          {module.description && <p className="text-sm text-white/60 mt-0.5">{module.description}</p>}
        </div>
      </div>

      <div className="px-5 md:px-7 py-6 space-y-6">
        {/* Admin-locked banner */}
        {adminLocked && (
          <div className="rounded-lg border border-orange/30 bg-orange/5 p-4 flex items-start gap-3">
            <Lock className="h-4 w-4 text-orange shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm mb-0.5">Not ready yet</p>
              <p className="text-xs text-white/70">{module.lockedMessage ?? "This step is locked until we finish setup on our end."}</p>
            </div>
          </div>
        )}

        {/* Retell forwarding number card, only for the call forwarding step */}
        {false && module.lockedUntilAdminFlag === 'ai_receptionist_ready_for_connection' && (
          <div className="rounded-lg border border-orange/50 p-4">
            <p className="eyebrow mb-1">Your Serenium forwarding number</p>
            <p className="font-display font-black text-2xl md:text-3xl tracking-tight tabular-nums">—</p>
          </div>
        )}

        {/* Video, only if module has one */}
        {hasVideo && (
          embed ? (
            <div className="aspect-video rounded-xl border border-border-subtle overflow-hidden bg-black">
              <iframe src={embed} allow="fullscreen; clipboard-write" className="w-full h-full" title={module.title} />
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-border-subtle bg-bg-tertiary flex items-center justify-center">
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-orange/20 flex items-center justify-center mx-auto mb-2">
                  <PlayCircle className="h-7 w-7 text-orange" />
                </div>
                <p className="text-sm text-white/50">Walkthrough coming soon</p>
              </div>
            </div>
          )
        )}

        {/* External link */}
        {module.externalLink && (
          <a href={module.externalLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:text-orange-hover">
            → Open external guide
          </a>
        )}

        {/* Instructions */}
        {module.instructions && (
          <div className="text-sm">
            <Markdown>{module.instructions}</Markdown>
            {module.links && Object.keys(module.links).length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {Object.entries(module.links).map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-orange hover:text-orange-hover">
                      → {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tasks */}
        {module.tasks && module.tasks.length > 0 && (
          <div className="space-y-2">
            {module.tasks.map(t => {
              const tk = `${serviceKey}.${module.key}.${t.key}`;
              const checked = !!snapshot.taskCompletions.find(c => c.taskKey === tk && c.completed);
              return (
                <TaskCheckbox
                  key={t.key}
                  checked={checked}
                  onChange={(v) => toggleTask(t.key, v)}
                  label={t.label + (t.required === false ? ' (optional)' : '')}
                  disabled={adminLocked}
                />
              );
            })}
          </div>
        )}

        {/* Fields */}
        {enabledFields.length > 0 && (
          <div className="space-y-5">
            {enabledFields.map(f => (
              <FieldRenderer
                key={f.key}
                field={f}
                organizationId={orgId}
                fieldKey={`${serviceKey}.${module.key}.${f.key}`}
                userId={userId}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {complete ? (
            <button onClick={markIncomplete} className="btn-secondary !py-2 !px-4 text-xs">
              Edit submission
            </button>
          ) : (
            <motion.button whileTap={{ scale: 0.98 }} onClick={markComplete}
              disabled={!readyFor || adminLocked}
              className="btn-primary !py-2 !px-4 text-xs">
              Submit <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

// Silence unused imports
void Clock;
