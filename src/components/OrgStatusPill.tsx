import { Users } from 'lucide-react';
import { cn } from '../lib/cn';
import type { OrgStatus, ModuleStatus } from '../types';

/**
 * Unified status pill. Two flavours:
 *  - OrgStatusPill        — onboarding / live / paused / churned, used in the
 *                           admin client list + client detail header
 *  - ModuleStatusPill     — not_started / in_progress / complete, used in
 *                           admin progress tabs and per-module rows
 *
 * Sizes: 'sm' (table rows, dense lists), 'md' (headers, detail surfaces).
 * The bordered/gap-icon shape on `md` doubles as the "big status badge"
 * that used to be `StatusBadge` in ClientDetail.
 */

const ORG_STATUS_STYLES: Record<OrgStatus, string> = {
  onboarding: 'bg-orange/10 text-orange border-orange/30',
  live:       'bg-success/10 text-success border-success/30',
  paused:     'bg-warning/10 text-warning border-warning/30',
  churned:    'bg-white/10 text-white/50 border-white/20',
};

export function OrgStatusPill({ status, size = 'sm' }: { status: OrgStatus; size?: 'sm' | 'md' }) {
  const styles = ORG_STATUS_STYLES[status];
  if (size === 'md') {
    return (
      <span className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium capitalize border', styles)}>
        <Users className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize border', styles)}>
      {status}
    </span>
  );
}

const MODULE_STATUS_STYLES: Record<ModuleStatus, string> = {
  not_started: 'bg-white/10 text-white/50',
  in_progress: 'bg-orange/15 text-orange',
  complete:    'bg-success/15 text-success',
};
const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete:    'Complete',
};

export function ModuleStatusPill({ status }: { status: ModuleStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider', MODULE_STATUS_STYLES[status])}>
      {MODULE_STATUS_LABELS[status]}
    </span>
  );
}
