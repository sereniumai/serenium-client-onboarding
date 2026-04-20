import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, RotateCcw, Upload as UploadIcon, FileBarChart2, Edit3, Trash2, Power, PowerOff, UserPlus } from 'lucide-react';
import { db } from '../lib/mockDb';
import { useDbVersion } from '../hooks/useDb';
import { getService, getModule } from '../config/modules';
import type { ActivityLogEntry, ActivityAction, ServiceKey } from '../types';

const ACTION_META: Record<ActivityAction, { icon: typeof CheckCircle2; color: string; }> = {
  step_completed:   { icon: CheckCircle2,   color: 'text-success bg-success/10' },
  step_reopened:    { icon: RotateCcw,      color: 'text-orange bg-orange/10' },
  file_uploaded:    { icon: UploadIcon,     color: 'text-orange bg-orange/10' },
  field_submitted:  { icon: Edit3,          color: 'text-white/70 bg-bg-tertiary' },
  report_published: { icon: FileBarChart2,  color: 'text-orange bg-orange/10' },
  report_updated:   { icon: Edit3,          color: 'text-white/70 bg-bg-tertiary' },
  report_deleted:   { icon: Trash2,         color: 'text-error bg-error/10' },
  service_enabled:  { icon: Power,          color: 'text-success bg-success/10' },
  service_disabled: { icon: PowerOff,       color: 'text-white/50 bg-bg-tertiary' },
  member_joined:    { icon: UserPlus,       color: 'text-orange bg-orange/10' },
};

export function ActivityFeed({ organizationId, limit = 25 }: { organizationId: string; limit?: number }) {
  useDbVersion();
  const entries = db.listActivityForOrg(organizationId, limit);
  const profilesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of db.listMembersForOrg(organizationId)) map[m.profile.id] = m.profile.fullName;
    return map;
  }, [organizationId]);

  if (entries.length === 0) {
    return (
      <div className="card text-center py-10 text-sm text-white/50">
        No activity yet. Events will appear here as the client progresses through onboarding.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
        <h3 className="font-semibold text-sm">Recent activity</h3>
        <span className="text-xs text-white/40">{entries.length} events</span>
      </div>
      <ul className="divide-y divide-border-subtle">
        {entries.map(e => <ActivityRow key={e.id} entry={e} byName={e.userId ? profilesById[e.userId] : undefined} />)}
      </ul>
    </div>
  );
}

function ActivityRow({ entry, byName }: { entry: ActivityLogEntry; byName?: string }) {
  const meta = ACTION_META[entry.action];
  const Icon = meta.icon;
  const { title, detail } = describe(entry);

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{title}</p>
        {detail && <p className="text-xs text-white/50 truncate">{detail}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-white/40 whitespace-nowrap">{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</p>
        {byName && <p className="text-[11px] text-white/30">{byName}</p>}
      </div>
    </li>
  );
}

function describe(entry: ActivityLogEntry): { title: string; detail?: string } {
  const m = entry.metadata as Record<string, string>;
  switch (entry.action) {
    case 'step_completed':
    case 'step_reopened': {
      const svc = getService(m.serviceKey as ServiceKey)?.label ?? m.serviceKey;
      const mod = getModule(m.serviceKey as ServiceKey, m.moduleKey)?.title ?? m.moduleKey;
      return { title: entry.action === 'step_completed' ? 'Step submitted' : 'Step reopened', detail: `${svc} · ${mod}` };
    }
    case 'file_uploaded': {
      return { title: 'File uploaded', detail: m.fileName };
    }
    case 'report_published': return { title: 'Monthly report published', detail: `${m.period} · ${m.title}` };
    case 'report_updated':   return { title: 'Monthly report updated',   detail: `${m.period} · ${m.title}` };
    case 'report_deleted':   return { title: 'Monthly report deleted',   detail: `${m.period} · ${m.title}` };
    case 'service_enabled':  return { title: 'Service enabled',  detail: getService(m.serviceKey as ServiceKey)?.label ?? m.serviceKey };
    case 'service_disabled': return { title: 'Service disabled', detail: getService(m.serviceKey as ServiceKey)?.label ?? m.serviceKey };
    case 'field_submitted':  return { title: 'Field updated', detail: m.fieldKey };
    case 'member_joined':    return { title: 'Member joined' };
  }
}
