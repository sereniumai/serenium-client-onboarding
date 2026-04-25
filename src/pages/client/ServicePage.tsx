import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Circle, Clock, PlayCircle } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { TaskCheckbox } from '../../components/TaskCheckbox';
import { FieldRenderer } from '../../components/FieldRenderer';
import { SaveIndicator } from '../../components/SaveIndicator';
import { Markdown } from '../../components/Markdown';
import { FinalCelebration } from '../../components/FinalCelebration';
import confetti from 'canvas-confetti';
import { ConditionalLinkBlock } from '../../components/ConditionalLinkBlock';
import { PausedScreen } from '../../components/PausedScreen';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot, useSetModuleStatus, useSetTaskCompletion } from '../../hooks/useOnboarding';
import { getService, type ModuleDef } from '../../config/modules';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { getOrgProgress, getEnabledModulesForService, moduleIsAdminLocked, moduleIsReady } from '../../lib/progress';
import { useQuery } from '@tanstack/react-query';
import { listStepVideos } from '../../lib/db/videos';
import { getRetellNumber } from '../../lib/db/retellNumbers';
import { formatPhone } from '../../lib/formatPhone';
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

  // Scroll to top when landing on a new service. Hash anchors below override
  // this when present (e.g. linking to a specific module).
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [serviceKey, location.hash]);

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
  const { data: retellNumber = null } = useQuery({
    queryKey: ['org', org?.id, 'retell'],
    queryFn: () => getRetellNumber(org!.id),
    enabled: !!org?.id && serviceKey === 'ai_receptionist',
  });

  // Hooks before early returns. Nullable snapshot handled inside the memo
  // bodies so the hook count stays stable across renders.
  const modules = useMemo(
    () => (snapshot && svc ? getEnabledModulesForService(snapshot, svc.key) : []),
    [snapshot, svc],
  );
  const progress = useMemo(() => (snapshot ? getOrgProgress(snapshot) : null), [snapshot]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh] text-white/60">Loading…</div>
      </AppShell>
    );
  }
  if (!org || !svc || !snapshot || !progress) return <Navigate to={`/onboarding/${orgSlug}`} replace />;
  if ((org.status === 'paused' || org.status === 'churned') && user?.role !== 'admin') {
    return <PausedScreen businessName={org.businessName} status={org.status} />;
  }
  if (!snapshot.services.some(s => s.serviceKey === svc.key)) {
    return <Navigate to={`/onboarding/${org.slug}`} replace />;
  }

  const svcSummaries = progress.perService[svc.key] ?? [];
  // Admin-locked modules (e.g. Call forwarding setup before we've provisioned
  // the AI receptionist number) can't be finished by the client, so they
  // shouldn't gate the service-level "Complete" CTA. Counting only the
  // unlocked modules lets the button enable once everything the client can
  // touch is done.
  const completable = svcSummaries.filter(s => s.canStart);
  const done = completable.filter(s => s.status === 'complete').length;
  const total = completable.length;

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
              <h1 className="font-display font-black text-[clamp(1.75rem,5vw,3rem)] leading-[1.05] tracking-[-0.025em] mb-3">
                {svc.label === 'Business Profile' ? 'Tell us about your business.' : svc.label}
              </h1>
              <p className="text-white/60 text-base">{svc.description}</p>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/70 px-2.5 py-1.5 rounded-full border border-border-subtle tabular-nums">
                  <CheckCircle2 className="h-3 w-3" /> {done} / {total} complete
                </span>
              </div>

              {/* Single autosave banner at the top of the service, instead of per-module text */}
              <div className="mt-6 rounded-lg border border-orange/30 bg-orange/5 p-4 flex items-start gap-3 text-sm text-white/80">
                <CheckCircle2 className="h-5 w-5 text-orange shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white mb-1">Autosaves as you type</p>
                  <p>Each section marks itself complete when every required field is filled. Leave anytime, we save your work, and you can pick up where you left off.</p>
                </div>
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
                  retellNumber={m.key === 'phone_number_setup' ? retellNumber : null}
                  onStatusChange={setSaveStatus}
                  onSetTask={(taskKey, checked) => setTask.mutate({ organizationId: org.id, taskKey, completed: checked, userId: user?.id })}
                  onSetModuleStatus={(status) => setModStatus.mutate({ organizationId: org.id, serviceKey: svc.key, moduleKey: m.key, status, userId: user?.id })}
                  onComplete={() => {
                    // No completion modal, Adam wants the user to stay
                    // exactly where they are, see the green "Section complete"
                    // banner inline, and choose for themselves when to move on.
                  }}
                />
              ))}
            </div>

            {/* BOTTOM CTA */}
            <div className="mt-12 pt-6 border-t border-border-subtle flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-3">
              <Link to={`/onboarding/${org.slug}`} className="btn-secondary justify-center">
                <ChevronLeft className="h-4 w-4" /> Back to dashboard
              </Link>
              {(() => {
                const allDone = done === total && total > 0;
                if (allDone) {
                  return (
                    <button
                      onClick={() => {
                        sfx.milestone();
                        confetti({
                          particleCount: 90,
                          spread: 90,
                          origin: { y: 0.5 },
                          colors: ['#FF6B1F', '#FF7A35', '#FFD4BA', '#ffffff'],
                          zIndex: 9999,
                        });
                        setTimeout(() => navigate(`/onboarding/${org.slug}`), 700);
                      }}
                      className="btn-primary justify-center"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Complete {svc.label}
                    </button>
                  );
                }
                return (
                  <button
                    disabled
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-bg-tertiary text-white/45 font-semibold text-sm cursor-not-allowed"
                  >
                    {done} of {total} sections done
                  </button>
                );
              })()}
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
  index, total, module, snapshot, serviceKey, userId, stepVideoOverride, retellNumber, onStatusChange, onSetTask, onSetModuleStatus, onComplete,
}: {
  index: number;
  total: number;
  module: ModuleDef;
  snapshot: import('../../lib/progress').OrgSnapshot;
  serviceKey: ServiceKey;
  userId?: string;
  stepVideoOverride?: string;
  retellNumber: string | null;
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

  // Auto-complete on the false→true ready transition. Init the ref at false
  // so that a module the user already filled in a previous session (mounting
  // ready=true) still gets flipped to 'complete' on the first render, the
  // `!complete` guard below prevents re-firing for modules that are already
  // marked done.
  const readyRef = useRef(false);
  useEffect(() => {
    const wasReady = readyRef.current;
    readyRef.current = readyFor;
    if (readyFor && !wasReady && !complete && !adminLocked) {
      onSetModuleStatus('complete');
      sfx.submit();
      onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyFor, complete, adminLocked]);

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
        {/* Admin-locked notice, module isn't ready for the client yet (e.g.
            AI receptionist phone setup waiting on us to provision a number).
            Render an orange callout so it's hard to miss. */}
        {adminLocked && (module.lockedMessage || module.lockedUntilAdminFlag) && (
          <div className="rounded-xl border border-orange/40 bg-orange/[0.06] px-4 py-3 text-sm text-white/85">
            <Markdown>{module.lockedMessage ?? "We'll unlock this section once we've finished setup on our end. We'll email you when it's ready."}</Markdown>
          </div>
        )}

        {/* AI phone number, surfaced once admin has provisioned and saved
            the Retell number for this org. Lives at the top of the
            Phone-Number-Implementation module so the client can copy it
            straight into their carrier's forwarding setup. */}
        {retellNumber && (
          <div className="rounded-xl border border-orange/30 bg-orange/[0.06] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-orange font-bold mb-1">Your AI phone number</p>
            <p className="font-display font-black text-2xl tracking-[-0.02em] text-white tabular-nums">{formatPhone(retellNumber)}</p>
            <p className="text-sm text-white/60 mt-2">Forward your existing line to this number, or use it directly anywhere your business shows up. The AI is live the moment forwarding is wired up.</p>
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
              <div className="mt-4 space-y-4">
                {Object.entries(module.links).map(([label, href]) => {
                  const videoEmbed = videoEmbedUrl(href);
                  if (videoEmbed) {
                    return (
                      <div key={label}>
                        <p className="text-xs text-white/60 mb-2">{label}</p>
                        <div className="aspect-video rounded-xl border border-border-subtle overflow-hidden bg-black">
                          <iframe src={videoEmbed} className="w-full h-full" title={label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
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
            {module.conditionalLinks && <ConditionalLinkBlock submissions={snapshot.submissions} svcKey={serviceKey} modKey={module.key} links={module.conditionalLinks} />}
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

        {/* Completion state - auto-completes when all required fields are
            filled. Modules without any required gating (purely optional
            sections like social profiles) need a manual mark-complete so the
            user can move on once they've added what they have. */}
        {complete ? (
          <div className="pt-2">
            <div className="w-full flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-sm text-white/80 flex-1">Section complete. Autosaved.</span>
            </div>
          </div>
        ) : !readyFor && !adminLocked && (enabledFields.length > 0 || (module.tasks?.length ?? 0) > 0) && (
          <div className="pt-2 flex items-center gap-2 text-xs text-white/45">
            <Circle className="h-3.5 w-3.5" /> Not yet complete
          </div>
        )}
      </div>
    </div>
  );
}

// Silence unused imports
void Clock;
