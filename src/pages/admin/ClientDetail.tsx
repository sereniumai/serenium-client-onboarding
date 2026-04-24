import { useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Trash2, Copy, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { useOrgBySlug, useOrgMembers, useOrgServices, useUpdateOrg, useDeleteOrg } from '../../hooks/useOrgs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../lib/queryClient';
import { listInvitationsForOrg, createInvitation, revokeInvitation, buildInviteUrl } from '../../lib/db/invitations';
import { enableService, disableService } from '../../lib/db/services';
import { SELECTABLE_SERVICES } from '../../config/modules';
import { SERVICE_ICON } from '../../config/serviceIcons';
import type { ServiceKey, OrgStatus } from '../../types';
import { cn } from '../../lib/cn';

type Tab = 'overview' | 'services' | 'users';

export function ClientDetail() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const { data: org, isLoading, isError, error } = useOrgBySlug(orgSlug);
  const [tab, setTab] = useState<Tab>('overview');

  if (!orgSlug) return <Navigate to="/admin" replace />;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh] text-white/60">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading client…
        </div>
      </AppShell>
    );
  }
  if (isError || !org) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-4" />
          <h1 className="font-display font-bold text-xl mb-2">Couldn't find that client</h1>
          <p className="text-white/55 mb-6">{(error as Error)?.message ?? 'No organization with this slug exists.'}</p>
          <Link to="/admin" className="btn-secondary">← Back to admin</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-24">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-5">
            <ChevronLeft className="h-4 w-4" /> All clients
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <p className="eyebrow mb-2">Client</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.05] tracking-[-0.025em]">{org.businessName}</h1>
              <p className="text-white/50 text-sm mt-1">/{org.slug}</p>
            </div>
            <StatusBadge status={org.status} />
          </div>

          <div className="border-b border-border-subtle mb-6 flex gap-1 overflow-x-auto">
            <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
            <TabBtn active={tab === 'services'} onClick={() => setTab('services')}>Services</TabBtn>
            <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>Users</TabBtn>
          </div>

          {tab === 'overview' && <OverviewTab org={org} onDelete={() => navigate('/admin')} />}
          {tab === 'services' && <ServicesTab orgId={org.id} />}
          {tab === 'users' && <UsersTab orgId={org.id} />}

          <div className="mt-8 text-xs text-white/30">
            Reports, activity log, notes, follow-ups and submissions viewer are being re-ported in later phases of the Supabase migration.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function OverviewTab({ org, onDelete }: { org: NonNullable<ReturnType<typeof useOrgBySlug>['data']>; onDelete: () => void }) {
  const updateOrg = useUpdateOrg();
  const deleteOrg = useDeleteOrg();
  const [businessName, setBusinessName] = useState(org.businessName);
  const [primaryName, setPrimaryName] = useState(org.primaryContactName ?? '');
  const [primaryEmail, setPrimaryEmail] = useState(org.primaryContactEmail ?? '');
  const [primaryPhone, setPrimaryPhone] = useState(org.primaryContactPhone ?? '');
  const [status, setStatus] = useState<OrgStatus>(org.status);

  const dirty =
    businessName !== org.businessName ||
    primaryName !== (org.primaryContactName ?? '') ||
    primaryEmail !== (org.primaryContactEmail ?? '') ||
    primaryPhone !== (org.primaryContactPhone ?? '') ||
    status !== org.status;

  const save = async () => {
    try {
      await updateOrg.mutateAsync({
        id: org.id,
        patch: {
          businessName: businessName.trim(),
          primaryContactName: primaryName.trim() || null,
          primaryContactEmail: primaryEmail.trim() || null,
          primaryContactPhone: primaryPhone.trim() || null,
          status,
        },
      });
      toast.success('Saved');
    } catch (err) {
      toast.error('Save failed', { description: (err as Error).message });
    }
  };

  const confirmDelete = async () => {
    if (!confirm(`Delete ${org.businessName}? This removes the org and all its data. Irreversible.`)) return;
    try {
      await deleteOrg.mutateAsync(org.id);
      toast.success('Client deleted');
      onDelete();
    } catch (err) {
      toast.error('Delete failed', { description: (err as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <p className="eyebrow">Business details</p>
        <LabeledInput label="Business name" value={businessName} onChange={setBusinessName} />
        <div className="grid md:grid-cols-2 gap-4">
          <LabeledInput label="Primary contact name" value={primaryName} onChange={setPrimaryName} />
          <LabeledInput label="Primary contact email" value={primaryEmail} onChange={setPrimaryEmail} type="email" />
          <LabeledInput label="Primary contact phone" value={primaryPhone} onChange={setPrimaryPhone} type="tel" />
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value as OrgStatus)}>
              <option value="onboarding">Onboarding</option>
              <option value="live">Live</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={save} disabled={!dirty || updateOrg.isPending} className="btn-primary">
            {updateOrg.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="card border-error/30">
        <p className="eyebrow text-error mb-2">Danger zone</p>
        <p className="text-sm text-white/60 mb-4">Permanently delete this client and all their data. This cannot be undone.</p>
        <button onClick={confirmDelete} disabled={deleteOrg.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-error border border-error/40 hover:bg-error/10 transition-colors disabled:opacity-50">
          <Trash2 className="h-4 w-4" /> {deleteOrg.isPending ? 'Deleting…' : 'Delete client'}
        </button>
      </div>
    </div>
  );
}

function ServicesTab({ orgId }: { orgId: string }) {
  const { data: services = [], isLoading } = useOrgServices(orgId);
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: async ({ key, enabled }: { key: ServiceKey; enabled: boolean }) => {
      if (enabled) await enableService(orgId, key);
      else await disableService(orgId, key);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.orgServices(orgId) }); },
  });

  const enabledKeys = new Set(services.map(s => s.serviceKey));

  if (isLoading) return <div className="card text-center text-white/50 py-12"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading services…</div>;

  return (
    <div className="card space-y-3">
      <p className="eyebrow mb-2">Services enabled for this client</p>
      {SELECTABLE_SERVICES.map(svc => {
        const Icon = SERVICE_ICON[svc.key];
        const enabled = enabledKeys.has(svc.key);
        return (
          <div key={svc.key} className="flex items-center gap-4 p-4 rounded-xl border border-border-subtle hover:border-border-emphasis transition-colors">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', enabled ? 'bg-orange/10 text-orange' : 'bg-white/5 text-white/40')}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{svc.label}</p>
              <p className="text-xs text-white/50 truncate">{svc.description}</p>
            </div>
            <button
              onClick={() => toggle.mutate({ key: svc.key, enabled: !enabled })}
              disabled={toggle.isPending}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                enabled ? 'bg-orange' : 'bg-bg-tertiary',
              )}
            >
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', enabled ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function UsersTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers(orgId);
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: qk.invitations(orgId),
    queryFn: () => listInvitationsForOrg(orgId),
  });

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  const invite = useMutation({
    mutationFn: () => createInvitation({ organizationId: orgId, email: newEmail.trim(), fullName: newName.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.invitations(orgId) });
      setNewEmail(''); setNewName('');
      toast.success('Invitation created');
    },
    onError: (err: Error) => toast.error('Could not create invite', { description: err.message }),
  });

  const revoke = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.invitations(orgId) });
      toast.success('Invite revoked');
    },
  });

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(buildInviteUrl(token));
    toast.success('Invite link copied');
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="eyebrow mb-3">Members ({members.length})</p>
        {membersLoading ? (
          <div className="text-white/50 text-sm"><Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />Loading…</div>
        ) : members.length === 0 ? (
          <p className="text-sm text-white/50">No members yet. Invite someone below.</p>
        ) : (
          <div className="space-y-2">
            {members.map(({ profile, member }) => (
              <div key={profile.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle">
                <div className="h-9 w-9 rounded-full bg-orange/10 text-orange flex items-center justify-center text-xs font-bold">
                  {profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{profile.fullName}</p>
                  <p className="text-xs text-white/50 truncate">{profile.email}</p>
                </div>
                <span className="text-xs text-white/40 uppercase">{member.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="eyebrow mb-3">Pending invitations ({invites.length})</p>
        {invitesLoading ? (
          <div className="text-white/50 text-sm"><Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />Loading…</div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-white/50 mb-4">No pending invitations.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle">
                <Mail className="h-4 w-4 text-white/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{inv.email}</p>
                  {inv.fullName && <p className="text-xs text-white/50 truncate">{inv.fullName}</p>}
                </div>
                <button onClick={() => copyInviteLink(inv.token)} className="btn-secondary !py-1.5 !text-xs">
                  <Copy className="h-3 w-3" /> Copy link
                </button>
                <button onClick={() => revoke.mutate(inv.id)} disabled={revoke.isPending} className="text-error/60 hover:text-error p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-border-subtle">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Invite someone new</p>
          <div className="grid md:grid-cols-[1fr,1fr,auto] gap-2">
            <input type="email" placeholder="email@company.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input" />
            <input type="text" placeholder="Full name (optional)" value={newName} onChange={e => setNewName(e.target.value)} className="input" />
            <button onClick={() => invite.mutate()} disabled={!newEmail.trim() || invite.isPending} className="btn-primary">
              {invite.isPending ? 'Sending…' : 'Invite'}
            </button>
          </div>
          <p className="text-xs text-white/40">Creates the invitation record. Email delivery (Resend) wires up in a later phase. For now, copy the invite link from the list above.</p>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
        active ? 'text-orange border-orange' : 'text-white/60 hover:text-white border-transparent',
      )}
    >
      {children}
    </button>
  );
}

function LabeledInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function StatusBadge({ status }: { status: OrgStatus }) {
  const styles: Record<OrgStatus, string> = {
    onboarding: 'bg-orange/10 text-orange border-orange/30',
    live:       'bg-success/10 text-success border-success/30',
    paused:     'bg-warning/10 text-warning border-warning/30',
    churned:    'bg-white/10 text-white/50 border-white/20',
  };
  return (
    <span className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium capitalize border', styles[status])}>
      <Users className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}
