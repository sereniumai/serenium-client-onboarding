import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock, PlayCircle, Circle, ChevronDown } from 'lucide-react';
import { getService } from '../config/modules';
import { SERVICE_ICON } from '../config/serviceIcons';
import { getOrgProgress, getEnabledModulesForService } from '../lib/progress';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import type { ServiceKey } from '../types';
import { cn } from '../lib/cn';

export function CurriculumSidebar({ organizationId, orgSlug }: { organizationId: string; orgSlug: string }) {
  const { serviceKey: activeSvc, moduleKey: activeMod } = useParams();
  const { snapshot } = useOrgSnapshot(organizationId);
  if (!snapshot) return null;
  const progress = getOrgProgress(snapshot);

  return (
    <nav className="space-y-3">
      <div className="px-3 pb-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold mb-2">Onboarding</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">{progress.completeModules} of {progress.totalModules} steps done</span>
          <span className="text-xs font-semibold text-orange">{progress.overall}%</span>
        </div>
        <div className="h-1 mt-2 rounded-full bg-bg-tertiary overflow-hidden">
          <motion.div
            className="h-full bg-orange rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.overall}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          />
        </div>
      </div>

      {progress.enabledServices.map(svcKey => {
        const svc = getService(svcKey)!;
        const summaries = progress.perService[svcKey];
        const enabledMods = getEnabledModulesForService(snapshot, svcKey);
        const svcActive = activeSvc === svcKey;
        const done = summaries.filter(s => s.status === 'complete').length;
        return (
          <ServiceGroup
            key={svcKey}
            svcKey={svcKey}
            svcLabel={svc.label}
            modules={enabledMods.map((m, i) => ({ ...m, summary: summaries[i] }))}
            activeModule={svcActive ? activeMod : undefined}
            orgSlug={orgSlug}
            done={done}
            total={summaries.length}
            defaultOpen={svcActive}
          />
        );
      })}
    </nav>
  );
}

function ServiceGroup({
  svcKey, svcLabel, modules, activeModule, orgSlug, done, total, defaultOpen,
}: {
  svcKey: ServiceKey;
  svcLabel: string;
  modules: Array<{ key: string; title: string; estimatedMinutes?: number; summary: { status: string; canStart: boolean } }>;
  activeModule?: string;
  orgSlug: string;
  done: number;
  total: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const Icon = SERVICE_ICON[svcKey];
  const pct = Math.round((done / total) * 100);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-tertiary/60 transition-colors group"
      >
        <div className="h-8 w-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm truncate">{svcLabel}</p>
            <span className="text-[11px] text-white/40 tabular-nums shrink-0">{done}/{total}</span>
          </div>
          <div className="h-0.5 mt-1.5 rounded-full bg-bg-tertiary overflow-hidden">
            <div className="h-full bg-orange transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-1 ml-3 pl-4 border-l border-border-subtle"
          >
            {modules.map((m, idx) => {
              const isActive = activeModule === m.key;
              const state = m.summary.status;
              const locked = !m.summary.canStart && state !== 'complete';
              const href = `/onboarding/${orgSlug}/services/${svcKey}#module-${m.key}`;

              return (
                <li key={m.key}>
                  <Link
                    to={locked ? '#' : href}
                    onClick={(e) => locked && e.preventDefault()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive && 'bg-orange/10 text-white',
                      !isActive && !locked && 'text-white/70 hover:bg-bg-tertiary/60 hover:text-white',
                      locked && 'text-white/30 cursor-not-allowed',
                    )}
                  >
                    <span className="shrink-0">
                      {state === 'complete' ? <CheckCircle2 className="h-4 w-4 text-success" />
                        : locked ? <Lock className="h-3.5 w-3.5" />
                        : state === 'in_progress' ? <PlayCircle className="h-4 w-4 text-orange" />
                        : <Circle className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-[11px] tabular-nums text-white/40 shrink-0 w-5">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="truncate flex-1">{m.title}</span>
                    {m.estimatedMinutes && <span className="text-[10px] text-white/30 shrink-0">{m.estimatedMinutes}m</span>}
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
