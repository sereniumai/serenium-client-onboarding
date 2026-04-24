import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, RotateCcw, Upload as UploadIcon, FileBarChart2, Edit3, Trash2, Power, PowerOff, UserPlus, Mail } from 'lucide-react';
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
  followup_sent:    { icon: Mail,           color: 'text-orange bg-orange/10' },
};

export function ActivityFeed({ organizationId, limit = 25 }: { organizationId: string; limit?: number }) {
  useDbVersion();
  const [pageSize, setPageSize] = useState(limit);
  const all = db.listActivityForOrg(organizationId, 2000);
  const entries = all.slice(0, pageSize);
  const profilesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of db.listMembersForOrg(organizationId)) map[m.profile.id] = m.profile.fullName;
    return map;
  }, [organizationId]);

  if (all.length === 0) {
    return (
      <div className="card text-center py-10 text-sm text-white/50">
        No activity yet. Events will appear here as the client progresses through onboarding.
      </div>
    );
  }

  const hasMore = entries.length < all.length;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
        <h3 className="font-semibold text-sm">Recent activity</h3>
        <span className="text-xs text-white/40">{entries.length}{hasMore ? ` of ${all.length}` : ''} events</span>
      </div>
      <ul className="divide-y divide-border-subtle">
        {entries.map(e => <ActivityRow key={e.id} entry={e} byName={e.userId ? profilesById[e.userId] : undefined} />)}
      </ul>
      {hasMore && (
        <div className="px-5 py-3 border-t border-border-subtle">
          <button
            onClick={() => setPageSize(n => n + limit)}
            className="w-full text-center text-xs text-white/60 hover:text-white transition-colors py-1"
          >
            Load {Math.min(limit, all.length - entries.length)} more
          </button>
        </div>
      )}
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

function resolveStep(serviceKey?: string, moduleKey?: string) {
  const svc = serviceKey ? getService(serviceKey as ServiceKey) : null;
  const mod = svc && moduleKey ? getModule(svc.key, moduleKey) : null;
  return { svcLabel: svc?.label ?? serviceKey, modTitle: mod?.title ?? moduleKey };
}

function parseFieldKey(fieldKey?: string): { svcLabel?: string; modTitle?: string; fieldLabel?: string } {
  if (!fieldKey) return {};
  const [svcKey, modKey, fldKey] = fieldKey.split('.');
  const svc = getService(svcKey as ServiceKey);
  const mod = svc && modKey ? getModule(svc.key, modKey) : null;
  const field = mod?.fields?.find(f => f.key === fldKey);
  return { svcLabel: svc?.label, modTitle: mod?.title, fieldLabel: field?.label ?? fldKey };
}

function describe(entry: ActivityLogEntry): { title: string; detail?: string } {
  const m = entry.metadata as Record<string, string>;
  switch (entry.action) {
    case 'step_completed': {
      const { svcLabel, modTitle } = resolveStep(m.serviceKey, m.moduleKey);
      return { title: `Completed ${modTitle}`, detail: svcLabel };
    }
    case 'step_reopened': {
      const { svcLabel, modTitle } = resolveStep(m.serviceKey, m.moduleKey);
      return { title: `Reopened ${modTitle}`, detail: svcLabel };
    }
    case 'file_uploaded': {
      const { svcLabel, modTitle } = parseFieldKey(m.category);
      const context = svcLabel && modTitle ? `${svcLabel} · ${modTitle}` : m.fileName;
      return { title: `Uploaded ${m.fileName}`, detail: context };
    }
    case 'report_published': return { title: `Published ${m.period} report`, detail: m.title };
    case 'report_updated':   return { title: `Updated ${m.period} report`, detail: m.title };
    case 'report_deleted':   return { title: `Deleted ${m.period} report`, detail: m.title };
    case 'service_enabled':  return { title: `Enabled ${getService(m.serviceKey as ServiceKey)?.label ?? m.serviceKey}` };
    case 'service_disabled': return { title: `Disabled ${getService(m.serviceKey as ServiceKey)?.label ?? m.serviceKey}` };
    case 'field_submitted': {
      const { svcLabel, modTitle, fieldLabel } = parseFieldKey(m.fieldKey);
      return { title: `Updated ${fieldLabel ?? m.fieldKey}`, detail: svcLabel && modTitle ? `${svcLabel} · ${modTitle}` : undefined };
    }
    case 'member_joined':    return { title: 'Member joined' };
    case 'followup_sent':    return { title: `Sent follow-up · ${m.mode ?? 'manual'}`, detail: m.subject };
  }
}
