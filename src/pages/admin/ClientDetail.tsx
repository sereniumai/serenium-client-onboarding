import { useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronLeft, Users, CheckCircle2, Clock, Megaphone, MessageSquare, Globe, Search,
  FileText, Image as ImageIcon, Film, Download, UserCircle, Trash2, Plus,
  StickyNote, ShieldOff, Save, Edit3, ChevronDown,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { db } from '../../lib/mockDb';
import { useAuth } from '../../auth/AuthContext';
import { useDbVersion } from '../../hooks/useDb';
import { getOrgProgress } from '../../lib/progress';
import { getService, SERVICES, getModule } from '../../config/modules';
import type { ServiceKey, AdminNote, MemberRole } from '../../types';
import { cn } from '../../lib/cn';
import { ReportsAdmin } from './ReportsAdmin';
import { ActivityFeed } from '../../components/ActivityFeed';
import { toast } from 'sonner';

const SERVICE_ICON: Record<ServiceKey, typeof Megaphone> = {
  facebook_ads: Megaphone, ai_sms: MessageSquare, website: Globe, seo: Search,
};

type Tab = 'overview' | 'reports' | 'services' | 'users' | 'submissions' | 'files' | 'notes';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'reports', label: 'Monthly reports' },
  { key: 'services', label: 'Services' },
  { key: 'users', label: 'Users' },
  { key: 'submissions', label: 'Submissions' },
  { key: 'files', label: 'Files' },
  { key: 'notes', label: 'Notes' },
];

export function ClientDetail() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  useDbVersion();

  const org = orgSlug ? db.getOrganizationBySlug(orgSlug) : null;
  if (!org) return <Navigate to="/admin" replace />;

  const progress = getOrgProgress(org.id);
  const members = db.listMembersForOrg(org.id);

  const impersonate = () => {
    const owner = members[0];
    if (!owner) return;
    const adminId = db.getCurrentUser()?.id;
    if (adminId) sessionStorage.setItem('serenium.impersonator', adminId);
    db.impersonate(owner.profile.id);
    navigate(`/onboarding/${org.slug}`);
    window.location.reload();
  };

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-6xl px-6 pt-10 pb-24">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> All clients
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
            <div>
              <p className="eyebrow mb-3">Client</p>
              <h1 className="font-display font-black text-4xl md:text-5xl tracking-[-0.03em]">{org.businessName}</h1>
              <p className="text-white/60 mt-2">{org.primaryContactName} · {org.primaryContactEmail}{org.primaryContactPhone ? ` · ${org.primaryContactPhone}` : ''}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-white/40">Progress</p>
                <p className="font-display font-black text-3xl tabular-nums">{progress.overall}%</p>
              </div>
              {members[0] && (
                <button onClick={impersonate} className="btn-secondary">
                  <UserCircle className="h-4 w-4" /> View as client
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 border-b border-border-subtle mb-8 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  tab === t.key ? 'border-orange text-white' : 'border-transparent text-white/50 hover:text-white'
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && <OverviewTab org={org} progress={progress} />}
          {tab === 'reports' && <ReportsAdmin orgId={org.id} />}
          {tab === 'services' && <ServicesTab orgId={org.id} />}
          {tab === 'users' && <UsersTab orgId={org.id} members={members} />}
          {tab === 'submissions' && <SubmissionsTab orgId={org.id} />}
          {tab === 'files' && <FilesTab orgId={org.id} orgName={org.businessName} />}
          {tab === 'notes' && <NotesTab orgId={org.id} />}
        </div>
      </div>
    </AppShell>
  );
}

function OverviewTab({ org, progress }: { org: { id: string; slug?: string }; progress: ReturnType<typeof getOrgProgress> }) {
  return (
    <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start">
      <div className="space-y-6">
      {progress.enabledServices.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-white/60 mb-4">No services enabled yet.</p>
          <p className="text-sm text-white/40">Enable services in the <strong>Services</strong> tab to seed this client's onboarding.</p>
        </div>
      )}
      {progress.enabledServices.map(svcKey => {
        const svc = getService(svcKey)!;
        const summaries = progress.perService[svcKey];
        const Icon = SERVICE_ICON[svcKey];
        const done = summaries.filter(s => s.status === 'complete').length;
        const pct = Math.round((done / summaries.length) * 100);
        return (
          <div key={svcKey} className="card">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-10 w-10 rounded-lg bg-orange/10 text-orange flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg">{svc.label}</h3>
                  <span className="text-sm text-white/60 tabular-nums">{done} / {summaries.length} · {pct}%</span>
                </div>
                <div className="h-1 rounded-full bg-bg-tertiary mt-2 overflow-hidden">
                  <div className="h-full bg-orange transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              {svc.modules.map((m, i) => {
                const s = summaries[i];
                return (
                  <Link
                    key={m.key}
                    to={`/onboarding/${(org as { slug?: string }).slug || ''}/services/${svcKey}/${m.key}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-bg-tertiary/40 hover:border-border-emphasis transition-colors"
                  >
                    {s.status === 'complete' ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      : <Clock className="h-4 w-4 text-white/40 shrink-0" />}
                    <span className="text-sm truncate flex-1">{m.title}</span>
                    <span className="text-xs text-white/40 capitalize whitespace-nowrap">{s.status.replace('_', ' ')}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
      <div className="lg:sticky lg:top-24">
        <ActivityFeed organizationId={org.id} limit={15} />
      </div>
    </div>
  );
}

function ServicesTab({ orgId }: { orgId: string }) {
  const all = db.listAllServicesForOrg(orgId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Toggle services on/off, and pick exactly which steps this client needs to complete. Unchecked steps are hidden from the client's dashboard — submitted data is preserved if you re-enable.
      </p>
      {SERVICES.map(svc => {
        const entry = all.find(s => s.serviceKey === svc.key);
        const on = !!entry?.enabled;
        const disabledKeys = new Set(entry?.disabledModuleKeys ?? []);
        return (
          <ServiceAccordion
            key={svc.key}
            orgId={orgId}
            svcKey={svc.key}
            serviceLabel={svc.label}
            serviceDescription={svc.description}
            modules={svc.modules}
            enabled={on}
            disabledKeys={disabledKeys}
          />
        );
      })}
    </div>
  );
}

function ServiceAccordion({
  orgId, svcKey, serviceLabel, serviceDescription, modules, enabled, disabledKeys,
}: {
  orgId: string;
  svcKey: ServiceKey;
  serviceLabel: string;
  serviceDescription: string;
  modules: Array<{ key: string; title: string; description: string; estimatedMinutes: number }>;
  enabled: boolean;
  disabledKeys: Set<string>;
}) {
  const [open, setOpen] = useState(enabled);
  const Icon = SERVICE_ICON[svcKey];
  const activeCount = modules.filter(m => !disabledKeys.has(m.key)).length;

  const toggleService = (on: boolean) => {
    db.setServiceEnabled(orgId, svcKey, on);
    toast.success(on ? `${serviceLabel} enabled` : `${serviceLabel} disabled`, {
      description: on ? 'Steps are now visible to the client' : 'Hidden from the client — data preserved',
    });
    if (on) setOpen(true);
  };

  const toggleModule = (moduleKey: string, on: boolean) => {
    const mod = modules.find(m => m.key === moduleKey);
    db.setModuleEnabledForOrg(orgId, svcKey, moduleKey, on);
    toast.success(on ? 'Step added to client dashboard' : 'Step hidden from client', {
      description: mod?.title,
    });
  };

  const enableAll = () => {
    modules.forEach(m => db.setModuleEnabledForOrg(orgId, svcKey, m.key, true));
    toast.success(`All ${serviceLabel} steps enabled`);
  };
  const disableAll = () => {
    modules.forEach(m => db.setModuleEnabledForOrg(orgId, svcKey, m.key, false));
    toast.success(`All ${serviceLabel} steps hidden`);
  };

  return (
    <div className={cn('card p-0 overflow-hidden transition-colors', enabled ? 'border-orange/30' : '')}>
      <div className="flex items-center gap-4 p-5">
        <button
          onClick={() => setOpen(o => !o)}
          className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            enabled ? 'bg-orange text-white' : 'bg-bg-tertiary text-white/40')}
          aria-label={`Toggle ${serviceLabel} details`}
        >
          <Icon className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base truncate">{serviceLabel}</h3>
              <p className="text-xs text-white/60 truncate">{serviceDescription}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {enabled && (
                <span className="text-xs text-white/50 tabular-nums">{activeCount} / {modules.length} steps</span>
              )}
              <button
                onClick={() => toggleService(!enabled)}
                role="switch"
                aria-checked={enabled}
                className={cn(
                  'relative h-7 w-12 rounded-full transition-colors shrink-0',
                  enabled ? 'bg-orange' : 'bg-bg-tertiary border border-border-subtle'
                )}>
                <span className={cn(
                  'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {enabled && (
        <div className="border-t border-border-subtle">
          <div className="px-5 py-3 flex items-center justify-between bg-bg-tertiary/30">
            <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white">
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
              Steps ({activeCount} included)
            </button>
            <div className="flex items-center gap-3 text-xs">
              <button onClick={enableAll} className="text-orange hover:text-orange-hover">Select all</button>
              <span className="text-white/20">·</span>
              <button onClick={disableAll} className="text-white/50 hover:text-white">Clear</button>
            </div>
          </div>
          {open && (
            <ul className="divide-y divide-border-subtle">
              {modules.map((m, i) => {
                const included = !disabledKeys.has(m.key);
                return (
                  <li key={m.key}>
                    <label className={cn(
                      'flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-bg-tertiary/30 transition-colors',
                      !included && 'opacity-50'
                    )}>
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={e => toggleModule(m.key, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/30 accent-orange cursor-pointer"
                      />
                      <span className="text-xs text-white/40 tabular-nums w-6 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{m.title}</p>
                        <p className="text-xs text-white/50 truncate">{m.description}</p>
                      </div>
                      <span className="text-[11px] text-white/30 whitespace-nowrap">~{m.estimatedMinutes}m</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UsersTab({ orgId, members }: { orgId: string; members: ReturnType<typeof db.listMembersForOrg> }) {
  const [adding, setAdding] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');

  const add = () => {
    if (!email.trim()) return;
    db.addMember({ organizationId: orgId, fullName: fullName.trim(), email: email.trim(), role });
    toast.success('User added', { description: `${fullName.trim() || email.trim()} can now log in` });
    setFullName(''); setEmail(''); setRole('member'); setAdding(false);
  };

  const remove = (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this organization? Their submissions will be preserved.`)) return;
    db.removeMember(orgId, userId);
    toast.success(`${name} removed from organization`);
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-white/60" />
          <h2 className="font-semibold">Members ({members.length})</h2>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary !py-2 !px-4 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add user
          </button>
        )}
      </div>

      {adding && (
        <div className="p-6 border-b border-border-subtle bg-bg-tertiary/30">
          <div className="grid md:grid-cols-[1fr,1.5fr,auto,auto] gap-2">
            <input className="input" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            <input className="input" type="email" placeholder="email@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            <select className="input" value={role} onChange={e => setRole(e.target.value as MemberRole)}>
              <option value="owner">Owner</option>
              <option value="member">Member</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="btn-secondary !py-2 !px-3 text-xs">Cancel</button>
              <button onClick={add} disabled={!email.trim()} className="btn-primary !py-2 !px-3 text-xs">Add</button>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-2">In local mode, users are added immediately. Once Supabase is wired, this sends an invitation email.</p>
        </div>
      )}

      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-border-subtle">
            <th className="px-6 py-3 font-medium">Name</th>
            <th className="px-6 py-3 font-medium">Email</th>
            <th className="px-6 py-3 font-medium">Role</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {members.map(({ profile, member }) => (
            <tr key={profile.id} className="border-b border-border-subtle last:border-0">
              <td className="px-6 py-4 font-medium">{profile.fullName}</td>
              <td className="px-6 py-4 text-sm text-white/60">{profile.email}</td>
              <td className="px-6 py-4">
                <select
                  value={member.role}
                  onChange={e => db.setMemberRole(orgId, profile.id, e.target.value as MemberRole)}
                  className="bg-transparent border-0 text-xs uppercase tracking-wider text-orange focus:outline-none cursor-pointer"
                >
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                </select>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => remove(profile.id, profile.fullName)}
                  className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-error"
                >
                  <ShieldOff className="h-3.5 w-3.5" /> Revoke access
                </button>
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr><td colSpan={4} className="px-6 py-12 text-center text-white/50 text-sm">No members yet. Add the first one above.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function SubmissionsTab({ orgId }: { orgId: string }) {
  const all = db.listSubmissionsForOrg(orgId);
  const enabled = db.listServicesForOrganization(orgId);

  if (all.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="h-14 w-14 rounded-2xl bg-orange/10 flex items-center justify-center mx-auto mb-4">
          <Edit3 className="h-7 w-7 text-orange" />
        </div>
        <h3 className="font-display font-bold text-xl mb-2">No submissions yet</h3>
        <p className="text-white/50 text-sm max-w-md mx-auto">As the client fills out fields in their onboarding, each answer will show up here grouped by service and step.</p>
      </div>
    );
  }

  const grouped: Record<string, Record<string, Array<{ fieldKey: string; value: unknown; updatedAt: string; fieldLabel: string }>>> = {};
  for (const sub of all) {
    const [svcKey, modKey, ...rest] = sub.fieldKey.split('.');
    if (!svcKey || !modKey) continue;
    const fieldKey = rest.join('.');
    const mod = getModule(svcKey as ServiceKey, modKey);
    const field = mod?.fields?.find(f => f.key === fieldKey);
    grouped[svcKey] ||= {};
    grouped[svcKey][modKey] ||= [];
    grouped[svcKey][modKey].push({ fieldKey, value: sub.value, updatedAt: sub.updatedAt, fieldLabel: field?.label ?? fieldKey });
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(grouped, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-${orgId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-white/60">{all.length} fields submitted · grouped by service and step</p>
        <button onClick={exportJson} className="btn-secondary !py-2 !px-4 text-sm">
          <Download className="h-4 w-4" /> Export JSON
        </button>
      </div>

      <div className="space-y-6">
        {enabled.map(({ serviceKey }) => {
          const svc = getService(serviceKey)!;
          const svcGroup = grouped[serviceKey];
          if (!svcGroup) return null;
          const Icon = SERVICE_ICON[serviceKey];

          return (
            <div key={serviceKey} className="card p-0 overflow-hidden">
              <div className="px-6 py-4 flex items-center gap-3 border-b border-border-subtle bg-bg-tertiary/30">
                <div className="h-8 w-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold">{svc.label}</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {svc.modules.map(m => {
                  const modSubs = svcGroup[m.key];
                  if (!modSubs || modSubs.length === 0) return null;
                  return (
                    <div key={m.key} className="p-6">
                      <p className="font-semibold text-sm mb-3">{m.title}</p>
                      <dl className="space-y-3">
                        {modSubs.map(s => (
                          <div key={s.fieldKey} className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-1 md:gap-4 text-sm">
                            <dt className="text-white/50">{s.fieldLabel}</dt>
                            <dd className="text-white/90 break-words">{formatValue(s.value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilesTab({ orgId, orgName }: { orgId: string; orgName: string }) {
  const uploads = db.listUploads(orgId);
  const [zipping, setZipping] = useState(false);

  const downloadZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const u of uploads) {
        const response = await fetch(u.fileUrl);
        const blob = await response.blob();
        const [svcKey, modKey] = u.category.split('.');
        const folder = `${svcKey}/${modKey}`;
        zip.file(`${folder}/${u.fileName}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${orgName.toLowerCase().replace(/\s+/g, '-')}-files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  };

  if (uploads.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="h-14 w-14 rounded-2xl bg-orange/10 flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="h-7 w-7 text-orange" />
        </div>
        <h3 className="font-display font-bold text-xl mb-2">No files uploaded yet</h3>
        <p className="text-white/50 text-sm max-w-md mx-auto">Logos, job photos, videos, testimonials — anything the client uploads through their onboarding shows up here.</p>
      </div>
    );
  }

  const byCategory: Record<string, typeof uploads> = {};
  for (const u of uploads) {
    byCategory[u.category] ||= [];
    byCategory[u.category].push(u);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">{uploads.length} files across {Object.keys(byCategory).length} categories</p>
        <button onClick={downloadZip} disabled={zipping} className="btn-secondary !py-2 !px-4 text-sm">
          <Download className="h-4 w-4" /> {zipping ? 'Zipping…' : 'Download all as zip'}
        </button>
      </div>

      {Object.entries(byCategory).map(([category, files]) => {
        const [svcKey, modKey, ...rest] = category.split('.');
        const fieldKey = rest.join('.');
        const mod = getModule(svcKey as ServiceKey, modKey);
        const field = mod?.fields?.find(f => f.key === fieldKey);
        const label = field?.label ?? category;

        return (
          <div key={category} className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-white/40">{getService(svcKey as ServiceKey)?.label} · {mod?.title}</p>
              </div>
              <span className="text-xs text-white/40 tabular-nums">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {files.map(f => (
                <a
                  key={f.id}
                  href={f.fileUrl}
                  download={f.fileName}
                  className="group rounded-lg border border-border-subtle bg-bg-tertiary overflow-hidden hover:border-border-emphasis transition-colors"
                >
                  {f.mimeType.startsWith('image/') ? (
                    <img src={f.fileUrl} alt={f.fileName} className="aspect-video w-full object-cover" />
                  ) : f.mimeType.startsWith('video/') ? (
                    <div className="aspect-video w-full flex items-center justify-center bg-bg">
                      <Film className="h-8 w-8 text-white/40" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full flex items-center justify-center bg-bg">
                      <FileText className="h-8 w-8 text-white/40" />
                    </div>
                  )}
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium truncate">{f.fileName}</p>
                    <p className="text-[11px] text-white/40 flex items-center gap-1.5 mt-0.5">
                      {formatBytes(f.fileSize)}
                      <Download className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotesTab({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const notes = db.listAdminNotes(orgId);
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const add = () => {
    if (!body.trim() || !user) return;
    db.createAdminNote({ organizationId: orgId, authorId: user.id, body: body.trim() });
    setBody('');
  };

  const saveEdit = (n: AdminNote) => {
    if (!editBody.trim()) return;
    db.updateAdminNote(n.id, editBody.trim());
    setEditingId(null);
  };

  const removeNote = (id: string) => {
    if (!confirm('Delete this note?')) return;
    db.deleteAdminNote(id);
  };

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-orange/10 text-orange flex items-center justify-center shrink-0">
            <StickyNote className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Internal notes</p>
            <p className="text-xs text-white/50">Only visible to Serenium admins. Never shown to the client.</p>
          </div>
        </div>
        <textarea
          rows={3}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Leave a note about this client — context, preferences, things to watch…"
          className="input"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add();
          }}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-white/30">⌘/Ctrl + Enter to save</p>
          <button onClick={add} disabled={!body.trim()} className="btn-primary !py-2 !px-4 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-10 text-white/40 text-sm">No notes yet.</div>
      ) : (
        <div className="space-y-3">
          {notes.map(n => {
            const authorName = db.getCurrentUser()?.id === n.authorId ? 'You' : 'Admin';
            return (
              <div key={n.id} className="card">
                {editingId === n.id ? (
                  <>
                    <textarea rows={3} value={editBody} onChange={e => setEditBody(e.target.value)} className="input mb-3" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="btn-secondary !py-2 !px-3 text-xs">Cancel</button>
                      <button onClick={() => saveEdit(n)} className="btn-primary !py-2 !px-3 text-xs">
                        <Save className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                      <span>{authorName} · {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}{n.updatedAt ? ' (edited)' : ''}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setEditingId(n.id); setEditBody(n.body); }} className="hover:text-white">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeNote(n.id)} className="hover:text-error">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ') || '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
