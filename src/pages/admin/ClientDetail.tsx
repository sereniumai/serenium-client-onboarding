import { useMemo, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronLeft, Users, CheckCircle2, Clock, PhoneForwarded,
  FileText, Image as ImageIcon, Film, Download, UserCircle, Trash2, Plus,
  StickyNote, ShieldOff, Save, Edit3, ChevronDown, Mail, Sparkles,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { db } from '../../lib/mockDb';
import { useAuth } from '../../auth/AuthContext';
import { useDbVersion } from '../../hooks/useDb';
import { getOrgProgress } from '../../lib/progress';
import { getService, SERVICES, getModule, type ServiceDef } from '../../config/modules';
import type { ServiceKey, AdminNote, MemberRole } from '../../types';
import { cn } from '../../lib/cn';
import { ReportsAdmin } from './ReportsAdmin';
import { EmptyState } from '../../components/EmptyState';
import { Markdown } from '../../components/Markdown';
import { WeeklyAvailabilityDisplay, type WeekSchedule } from '../../components/WeeklyAvailabilityDisplay';
import { FollowupModal } from '../../components/FollowupModal';
import { SERVICE_ICON } from '../../config/serviceIcons';
import { ActivityFeed } from '../../components/ActivityFeed';
import { toast } from 'sonner';

type Tab = 'overview' | 'reports' | 'services' | 'users' | 'submissions' | 'files' | 'notes' | 'ai_chat';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'reports', label: 'Monthly reports' },
  { key: 'services', label: 'Services' },
  { key: 'users', label: 'Users' },
  { key: 'submissions', label: 'Submissions' },
  { key: 'files', label: 'Files' },
  { key: 'notes', label: 'Notes' },
  { key: 'ai_chat', label: 'AI chat' },
];

export function ClientDetail() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [followupOpen, setFollowupOpen] = useState(false);
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
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-24">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> All clients
          </Link>

          <OrgHeader org={org} progress={progress} hasMembers={members.length > 0} onImpersonate={impersonate} onFollowup={() => setFollowupOpen(true)} />
          {followupOpen && <FollowupModal orgId={org.id} orgName={org.businessName} contactName={org.primaryContactName} contactEmail={org.primaryContactEmail} onClose={() => setFollowupOpen(false)} />}

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
          {tab === 'ai_chat' && <AiChatTab orgId={org.id} />}
          {tab === 'notes' && <NotesTab orgId={org.id} />}
        </div>
      </div>
    </AppShell>
  );
}

function OrgHeader({ org, progress, hasMembers, onImpersonate, onFollowup }: {
  org: { id: string; businessName: string; primaryContactName?: string; primaryContactEmail?: string; primaryContactPhone?: string; plan?: 'starter' | 'pro' | 'custom' };
  progress: ReturnType<typeof getOrgProgress>;
  hasMembers: boolean;
  onImpersonate: () => void;
  onFollowup: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState(org.businessName);
  const [primaryName, setPrimaryName] = useState(org.primaryContactName ?? '');
  const [primaryEmail, setPrimaryEmail] = useState(org.primaryContactEmail ?? '');
  const [primaryPhone, setPrimaryPhone] = useState(org.primaryContactPhone ?? '');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'custom' | ''>(org.plan ?? '');

  const save = () => {
    db.updateOrganization(org.id, {
      businessName: businessName.trim(),
      primaryContactName: primaryName.trim() || undefined,
      primaryContactEmail: primaryEmail.trim() || undefined,
      primaryContactPhone: primaryPhone.trim() || undefined,
      plan: plan || undefined,
    });
    toast.success('Client details updated');
    setEditing(false);
  };

  const cancel = () => {
    setBusinessName(org.businessName);
    setPrimaryName(org.primaryContactName ?? '');
    setPrimaryEmail(org.primaryContactEmail ?? '');
    setPrimaryPhone(org.primaryContactPhone ?? '');
    setPlan(org.plan ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="card mb-6 md:mb-8 space-y-4">
        <p className="eyebrow">Edit client details</p>
        <div>
          <label className="label">Business name</label>
          <input className="input" value={businessName} onChange={e => setBusinessName(e.target.value)} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Primary contact name</label>
            <input className="input" value={primaryName} onChange={e => setPrimaryName(e.target.value)} />
          </div>
          <div>
            <label className="label">Primary contact email</label>
            <input className="input" type="email" value={primaryEmail} onChange={e => setPrimaryEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Primary contact phone</label>
            <input className="input" type="tel" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={plan} onChange={e => setPlan(e.target.value as typeof plan)}>
              <option value="">— unset —</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={cancel} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={!businessName.trim()} className="btn-primary"><Save className="h-4 w-4" /> Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-6 mb-6 md:mb-8">
      <div className="min-w-0">
        <p className="eyebrow mb-3">Client</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-black text-[clamp(1.75rem,6vw,3rem)] leading-[1.05] tracking-[-0.03em]">{org.businessName}</h1>
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white border border-border-subtle hover:border-border-emphasis rounded-md px-2 py-1 transition-colors">
            <Edit3 className="h-3 w-3" /> Edit
          </button>
        </div>
        <p className="text-white/60 mt-2 text-sm md:text-base break-words">
          {org.primaryContactName}
          <span className="hidden md:inline"> · </span>
          <span className="block md:inline">{org.primaryContactEmail}</span>
          {org.primaryContactPhone && <><span className="hidden md:inline"> · </span><span className="block md:inline">{org.primaryContactPhone}</span></>}
        </p>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
        <div className="text-left md:text-right">
          <p className="text-xs uppercase tracking-wider text-white/40">Progress</p>
          <p className="font-display font-black text-3xl tabular-nums">{progress.overall}%</p>
        </div>
        <button onClick={onFollowup} className="btn-secondary !py-2 !px-3 md:!py-3 md:!px-6 text-xs md:text-sm" title="Send a follow-up email to this client">
          <Mail className="h-4 w-4" /> <span className="hidden sm:inline">Send follow-up</span><span className="sm:hidden">Chase</span>
        </button>
        {hasMembers && (
          <button onClick={onImpersonate} className="btn-secondary !py-2 !px-3 md:!py-3 md:!px-6 text-xs md:text-sm">
            <UserCircle className="h-4 w-4" /> <span className="hidden sm:inline">View as client</span><span className="sm:hidden">View</span>
          </button>
        )}
      </div>
    </div>
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
              {svc.modules.map((m) => {
                const s = summaries.find(x => x.moduleKey === m.key);
                if (!s) return null;
                return (
                  <Link
                    key={m.key}
                    to={`/onboarding/${(org as { slug?: string }).slug || ''}/services/${svcKey}#module-${m.key}`}
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
        Toggle services, steps, or individual fields on/off per client. Business Profile is on by default but can be disabled if you don't need it. Unchecked items are hidden from the client — submitted data is preserved if you re-enable.
      </p>
      {SERVICES.map(svc => {
        const entry = all.find(s => s.serviceKey === svc.key);
        const on = !!entry?.enabled;
        const disabledModKeys = new Set(entry?.disabledModuleKeys ?? []);
        const disabledFieldKeys = new Set(entry?.disabledFieldKeys ?? []);
        return (
          <ServiceAccordion
            key={svc.key}
            orgId={orgId}
            svcKey={svc.key}
            serviceLabel={svc.label}
            serviceDescription={svc.description}
            modules={svc.modules}
            enabled={on}
            disabledModKeys={disabledModKeys}
            disabledFieldKeys={disabledFieldKeys}
          />
        );
      })}
    </div>
  );
}

function ServiceAccordion({
  orgId, svcKey, serviceLabel, serviceDescription, modules, enabled, disabledModKeys, disabledFieldKeys,
}: {
  orgId: string;
  svcKey: ServiceKey;
  serviceLabel: string;
  serviceDescription: string;
  modules: ServiceDef['modules'];
  enabled: boolean;
  disabledModKeys: Set<string>;
  disabledFieldKeys: Set<string>;
}) {
  const [open, setOpen] = useState(enabled);
  const Icon = SERVICE_ICON[svcKey];
  const activeCount = modules.filter(m => !disabledModKeys.has(m.key)).length;

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
                <span className="text-xs text-white/50 tabular-nums">{activeCount} / {modules.length}</span>
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

      {enabled && svcKey === 'ai_receptionist' && <AiReceptionistAdminControls orgId={orgId} />}
      {enabled && svcKey === 'ai_sms' && <AiSmsAdminControls orgId={orgId} />}

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
              {modules.map((m, i) => (
                <ModulePickerRow
                  key={m.key}
                  orgId={orgId}
                  svcKey={svcKey}
                  module={m}
                  index={i}
                  moduleEnabled={!disabledModKeys.has(m.key)}
                  disabledFieldKeys={disabledFieldKeys}
                  onToggleModule={(on) => toggleModule(m.key, on)}
                />
              ))}
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
    const result = db.addMember({ organizationId: orgId, fullName: fullName.trim(), email: email.trim(), role });
    if (result) {
      const inviteUrl = `${window.location.origin}/register?token=${result.token}`;
      navigator.clipboard?.writeText(inviteUrl).catch(() => { /* clipboard may be unavailable */ });
      toast.success('User added · invite link copied', {
        description: `${fullName.trim() || email.trim()} — link is on your clipboard`,
        duration: 6000,
      });
    } else {
      toast.success('User added', { description: `${fullName.trim() || email.trim()} was already a member` });
    }
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
            <MemberRow key={profile.id} orgId={orgId} profile={profile} member={member} onRemove={remove} />
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

function ModulePickerRow({
  orgId, svcKey, module: m, index, moduleEnabled, disabledFieldKeys, onToggleModule,
}: {
  orgId: string;
  svcKey: ServiceKey;
  module: ServiceDef['modules'][number];
  index: number;
  moduleEnabled: boolean;
  disabledFieldKeys: Set<string>;
  onToggleModule: (on: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = m.fields ?? [];
  const hasFields = fields.length > 1; // show field-level toggles only for multi-field modules
  const fieldActiveCount = fields.filter(f => !disabledFieldKeys.has(`${m.key}.${f.key}`)).length;

  const toggleField = (fieldKey: string, on: boolean) => {
    db.setFieldEnabledForOrg(orgId, svcKey, m.key, fieldKey, on);
  };

  return (
    <li>
      <div className={cn(
        'flex items-start gap-3 px-5 py-3 hover:bg-bg-tertiary/30 transition-colors',
        !moduleEnabled && 'opacity-50'
      )}>
        <input
          type="checkbox"
          checked={moduleEnabled}
          onChange={e => onToggleModule(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/30 accent-orange cursor-pointer shrink-0"
        />
        <span className="text-xs text-white/40 tabular-nums w-6 shrink-0 mt-0.5">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{m.title}</p>
          {m.description && <p className="text-xs text-white/50 truncate">{m.description}</p>}
          {hasFields && moduleEnabled && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-orange hover:text-orange-hover mt-1.5"
            >
              <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
              {expanded ? 'Hide' : 'Customize'} fields ({fieldActiveCount}/{fields.length})
            </button>
          )}
        </div>
        {m.estimatedMinutes && <span className="text-[11px] text-white/30 whitespace-nowrap">~{m.estimatedMinutes}m</span>}
      </div>
      {hasFields && moduleEnabled && expanded && (
        <div className="pl-[4.25rem] pr-5 pb-3 pt-0.5">
          <ul className="space-y-1 border-l border-border-subtle pl-3">
            {fields.map(f => {
              if (f.type === 'info') return null;
              const included = !disabledFieldKeys.has(`${m.key}.${f.key}`);
              return (
                <li key={f.key}>
                  <label className={cn(
                    'flex items-center gap-2 py-1.5 cursor-pointer text-xs',
                    !included && 'opacity-50'
                  )}>
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={e => toggleField(f.key, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-white/30 accent-orange cursor-pointer shrink-0"
                    />
                    <span className="flex-1">{f.label ?? f.key}</span>
                    {f.required && <span className="text-orange text-[10px] uppercase tracking-wider">req</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

function AiReceptionistAdminControls({ orgId }: { orgId: string }) {
  const flag = db.getAdminFlag(orgId, 'ai_receptionist_ready_for_connection');
  const [num, setNum] = useState(db.getRetellNumber(orgId) ?? '');

  const toggleFlag = () => {
    db.setAdminFlag(orgId, 'ai_receptionist_ready_for_connection', !flag);
    toast.success(!flag ? 'Call forwarding step unlocked for this client' : 'Call forwarding step re-locked');
  };

  const saveNum = () => {
    db.setRetellNumber(orgId, num.trim() || null);
    toast.success(num.trim() ? 'Forwarding number saved' : 'Forwarding number cleared');
  };

  return (
    <div className="border-t border-border-subtle p-5 bg-bg-tertiary/20">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-orange/10 text-orange flex items-center justify-center shrink-0">
          <PhoneForwarded className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">AI is built and ready for connection</p>
              <p className="text-xs text-white/50">Flipping this on unlocks the call-forwarding step for the client.</p>
            </div>
            <button
              onClick={toggleFlag}
              role="switch"
              aria-checked={flag}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors shrink-0',
                flag ? 'bg-orange' : 'bg-bg-tertiary border border-border-subtle'
              )}>
              <span className={cn(
                'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                flag ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>
      </div>
      <div>
        <label className="label">Retell forwarding number</label>
        <div className="flex gap-2">
          <input
            value={num}
            onChange={e => setNum(e.target.value)}
            onBlur={saveNum}
            placeholder="+1 555 123 4567"
            className="input flex-1 tabular-nums"
          />
        </div>
        <p className="text-xs text-white/40 mt-1.5">Displayed to the client on the call-forwarding step so they can forward to this number.</p>
      </div>
    </div>
  );
}

function AiSmsAdminControls({ orgId }: { orgId: string }) {
  const flag = db.getAdminFlag(orgId, 'ghl_calendar_ready_for_client');

  const toggleFlag = () => {
    db.setAdminFlag(orgId, 'ghl_calendar_ready_for_client', !flag);
    toast.success(!flag ? 'GHL calendar step unlocked for this client' : 'GHL calendar step re-locked');
  };

  return (
    <div className="border-t border-border-subtle p-5 bg-bg-tertiary/20">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-orange/10 text-orange flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">GHL subaccount is provisioned</p>
              <p className="text-xs text-white/50">Flipping this on unlocks the Calendar connection step for the client (AI SMS → GHL setup).</p>
            </div>
            <button
              onClick={toggleFlag}
              role="switch"
              aria-checked={flag}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors shrink-0',
                flag ? 'bg-orange' : 'bg-bg-tertiary border border-border-subtle',
              )}>
              <span className={cn(
                'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                flag ? 'translate-x-5' : 'translate-x-0.5',
              )} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ orgId, profile, member, onRemove }: {
  orgId: string;
  profile: { id: string; fullName: string; email: string };
  member: { role: MemberRole };
  onRemove: (userId: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);

  const save = () => {
    db.updateProfile(profile.id, { fullName: fullName.trim(), email: email.trim() });
    toast.success('User updated');
    setEditing(false);
  };
  const cancel = () => {
    setFullName(profile.fullName);
    setEmail(profile.email);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="border-b border-border-subtle last:border-0 bg-bg-tertiary/30">
        <td className="px-6 py-3">
          <input className="input !py-1.5 text-sm" value={fullName} onChange={e => setFullName(e.target.value)} />
        </td>
        <td className="px-6 py-3">
          <input className="input !py-1.5 text-sm" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </td>
        <td className="px-6 py-3 text-xs uppercase tracking-wider text-orange">{member.role}</td>
        <td className="px-6 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={cancel} className="text-xs text-white/50 hover:text-white px-2">Cancel</button>
            <button onClick={save} className="btn-primary !py-1.5 !px-3 text-xs"><Save className="h-3.5 w-3.5" /> Save</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border-subtle last:border-0">
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
        <div className="inline-flex items-center gap-3">
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
          <button onClick={() => onRemove(profile.id, profile.fullName)} className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-error">
            <ShieldOff className="h-3.5 w-3.5" /> Revoke
          </button>
        </div>
      </td>
    </tr>
  );
}

type SubRow = { fieldKey: string; value: unknown; updatedAt: string; fieldLabel: string; field?: import('../../config/modules').Field };

function SubmissionsTab({ orgId }: { orgId: string }) {
  const all = db.listSubmissionsForOrg(orgId);
  const enabled = db.listServicesForOrganization(orgId);

  const grouped = useMemo(() => {
    const g: Record<string, Record<string, SubRow[]>> = {};
    for (const sub of all) {
      const [svcKey, modKey, ...rest] = sub.fieldKey.split('.');
      if (!svcKey || !modKey) continue;
      const fieldKey = rest.join('.');
      const mod = getModule(svcKey as ServiceKey, modKey);
      const field = mod?.fields?.find(f => f.key === fieldKey);
      g[svcKey] ||= {};
      g[svcKey][modKey] ||= [];
      g[svcKey][modKey].push({
        fieldKey,
        value: sub.value,
        updatedAt: sub.updatedAt,
        fieldLabel: field?.label ?? fieldKey,
        field,
      });
    }
    return g;
  }, [all]);

  if (all.length === 0) {
    return (
      <EmptyState
        icon={Edit3}
        title="No submissions yet"
        description="As the client fills out fields in their onboarding, each answer will show up here grouped by service and step."
      />
    );
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(grouped, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `submissions-${orgId.slice(0, 8)}.json`);
  };

  const exportCsv = () => {
    const rows: string[][] = [['Service', 'Module', 'Field', 'Value', 'Updated']];
    for (const svcKey of Object.keys(grouped)) {
      const svc = getService(svcKey as ServiceKey);
      for (const modKey of Object.keys(grouped[svcKey])) {
        const mod = getModule(svcKey as ServiceKey, modKey);
        for (const s of grouped[svcKey][modKey]) {
          rows.push([
            svc?.label ?? svcKey,
            mod?.title ?? modKey,
            s.fieldLabel,
            stringifyForCsv(s.value),
            s.updatedAt,
          ]);
        }
      }
    }
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    triggerDownload(new Blob([csv], { type: 'text/csv' }), `submissions-${orgId.slice(0, 8)}.csv`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm text-white/60">{all.length} fields submitted · grouped by service and step</p>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-secondary !py-2 !px-4 text-sm">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={exportJson} className="btn-secondary !py-2 !px-4 text-sm">
            <Download className="h-4 w-4" /> JSON
          </button>
        </div>
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
                      <dl className="space-y-4">
                        {modSubs.map(s => (
                          <div key={s.fieldKey} className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-1 md:gap-4 text-sm">
                            <dt className="text-white/50">
                              <div>{s.fieldLabel}</div>
                              <div className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">
                                {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                              </div>
                            </dt>
                            <dd className="text-white/90 break-words"><SubmissionValue value={s.value} field={s.field} orgId={orgId} fieldKey={`${serviceKey}.${m.key}.${s.fieldKey}`} /></dd>
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

function SubmissionValue({ value, field, orgId, fieldKey }: {
  value: unknown;
  field?: import('../../config/modules').Field;
  orgId: string;
  fieldKey: string;
}) {
  const type = field?.type;
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-white/30">—</span>;
  }

  if (type === 'color' && typeof value === 'string') {
    return (
      <div className="inline-flex items-center gap-2">
        <div className="h-6 w-6 rounded border border-border-subtle shadow-sm" style={{ backgroundColor: value }} />
        <code className="text-xs font-mono text-white/70">{value}</code>
      </div>
    );
  }

  if (type === 'checkbox') {
    return value === true
      ? <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4" /> Yes</span>
      : <span className="inline-flex items-center gap-1.5 text-white/40">— No</span>;
  }

  if (type === 'email' && typeof value === 'string') {
    return <a href={`mailto:${value}`} className="text-orange hover:text-orange-hover">{value}</a>;
  }

  if (type === 'phone' && typeof value === 'string') {
    return <a href={`tel:${value}`} className="text-orange hover:text-orange-hover">{value}</a>;
  }

  if (type === 'url' && typeof value === 'string') {
    return <a href={value} target="_blank" rel="noopener noreferrer" className="text-orange hover:text-orange-hover break-all">{value}</a>;
  }

  if (type === 'select' && typeof value === 'string') {
    return <span className="inline-flex px-2 py-0.5 rounded-md bg-white/5 border border-border-subtle text-white/90 text-xs">{value}</span>;
  }

  if (type === 'multiselect' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v, i) => (
          <span key={i} className="inline-flex px-2 py-0.5 rounded-md bg-orange/10 text-orange border border-orange/20 text-xs">{String(v)}</span>
        ))}
      </div>
    );
  }

  if (type === 'repeatable' && Array.isArray(value)) {
    const items = value.filter(v => v != null && v !== '');
    if (items.length === 0) return <span className="text-white/30">—</span>;
    return (
      <ul className="list-disc pl-5 space-y-1 marker:text-orange/60">
        {items.map((v, i) => <li key={i} className="text-white/90">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>)}
      </ul>
    );
  }

  if (type === 'textarea' && typeof value === 'string') {
    return <p className="whitespace-pre-wrap leading-relaxed">{value}</p>;
  }

  if (type === 'weekly_availability' && value && typeof value === 'object') {
    return <WeeklyAvailabilityDisplay schedule={value as WeekSchedule} />;
  }

  if (type === 'slider' && typeof value === 'number') {
    const suffix = field?.slider?.suffix ?? '';
    return <span className="font-mono tabular-nums">{value}{suffix}</span>;
  }

  if (type === 'structured' && value && typeof value === 'object' && !Array.isArray(value)) {
    const data = value as Record<string, unknown>;
    const schema = field?.schema ?? [];
    const entries = schema.length
      ? schema.map(s => [s.label, data[s.key]] as const).filter(([, v]) => v != null && v !== '')
      : Object.entries(data).filter(([, v]) => v != null && v !== '');
    if (entries.length === 0) return <span className="text-white/30">—</span>;
    return (
      <dl className="space-y-1">
        {entries.map(([label, val]) => (
          <div key={String(label)} className="flex gap-2 text-sm">
            <dt className="text-white/40 shrink-0">{String(label)}:</dt>
            <dd className="text-white/90">{String(val)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (type === 'logo_picker' && value && typeof value === 'object') {
    const data = value as { mode?: string; url?: string };
    const reuseKey = field?.logoReuseFieldKey ?? 'business_profile.logo_files.logo_files';
    const uploads = data.mode === 'upload'
      ? db.listUploads(orgId, fieldKey)
      : data.mode === 'reuse' ? db.listUploads(orgId, reuseKey) : [];
    if (data.mode === 'url' && data.url) {
      return <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-orange hover:text-orange-hover break-all">{data.url}</a>;
    }
    return (
      <div>
        <p className="text-xs text-white/50 mb-2">
          {data.mode === 'reuse' ? 'Reused from Business Profile' : data.mode === 'upload' ? 'Uploaded here' : '—'}
        </p>
        {uploads.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uploads.map(u => (
              <a key={u.id} href={u.fileUrl} target="_blank" rel="noopener noreferrer" className="h-16 w-16 rounded-md border border-border-subtle bg-bg overflow-hidden flex items-center justify-center hover:border-orange/40">
                {u.mimeType.startsWith('image/')
                  ? <img src={u.fileUrl} alt={u.fileName} className="max-h-full max-w-full object-contain" />
                  : <span className="text-[9px] text-white/60 p-1 text-center break-words">{u.fileName}</span>}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-warning">No file attached yet.</p>
        )}
      </div>
    );
  }

  if (Array.isArray(value)) return <span>{value.filter(Boolean).join(', ') || '—'}</span>;
  if (typeof value === 'object') return <pre className="text-xs text-white/60 bg-bg-tertiary/40 rounded p-2 overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
  return <span>{String(value)}</span>;
}


function AiChatTab({ orgId }: { orgId: string }) {
  const messages = db.listAiChatForOrg(orgId);
  const questions = messages.filter(m => m.role === 'user').length;

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No AI conversations yet"
        description="When this client asks the onboarding assistant for help, every exchange will show up here — useful for spotting confusion and improving the tool."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-white/60">{questions} question{questions === 1 ? '' : 's'} · {messages.length} total messages</p>
        <Link to="/admin/ai-conversations" className="text-sm text-orange hover:text-orange-hover">View all clients →</Link>
      </div>
      <div className="card p-5 space-y-3">
        {messages.map(m => {
          const isUser = m.role === 'user';
          const ctx = m.context ? (() => {
            const [svc, mod] = m.context.split('.');
            const service = getService(svc as ServiceKey);
            if (!service) return m.context;
            if (!mod) return service.label;
            const md = getModule(svc as ServiceKey, mod);
            return `${service.label} → ${md?.title ?? mod}`;
          })() : null;
          return (
            <div key={m.id} className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
              {!isUser && <div className="h-7 w-7 rounded-lg bg-orange/15 text-orange flex items-center justify-center shrink-0 self-start mt-0.5"><Sparkles className="h-3.5 w-3.5" /></div>}
              <div className={cn('max-w-[80%]', isUser && 'text-right')}>
                <div className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed inline-block text-left',
                  isUser ? 'bg-orange text-white rounded-br-md' : 'bg-bg-tertiary/70 border border-border-subtle rounded-bl-md'
                )}>
                  {isUser ? <span className="whitespace-pre-wrap">{m.content}</span> : <Markdown>{m.content}</Markdown>}
                </div>
                <div className={cn('mt-1 text-[10px] text-white/40 flex gap-2', isUser && 'justify-end')}>
                  <span>{formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</span>
                  {ctx && <><span className="text-white/20">·</span><span>on {ctx}</span></>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string): string {
  if (v == null) return '';
  const needsQuoting = /[",\n\r]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function stringifyForCsv(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.filter(v => v != null && v !== '').map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(' | ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
