import { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Trash2, Copy, Mail, AlertTriangle, MessageCircle as MessageCircleIcon, Eye, Plus, Bell, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { Markdown } from '../../components/Markdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadingState } from '../../components/LoadingState';
import { OrgStatusPill, ModuleStatusPill } from '../../components/OrgStatusPill';
import { useOrgBySlug, useOrgMembers, useOrgServices, useUpdateOrg, useDeleteOrg } from '../../hooks/useOrgs';
import { useOrgSnapshot, useSetModuleStatus, useSetTaskCompletion } from '../../hooks/useOnboarding';
import { useAuth } from '../../auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../lib/queryClient';
import { listInvitationsForOrg, createInvitation, revokeInvitation, buildInviteUrl, sendInvitationEmail } from '../../lib/db/invitations';
import { enableService, disableService, reorderServices, setDisabledModuleKeys, setDisabledFieldKeys } from '../../lib/db/services';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { getUploadSignedUrl } from '../../lib/db/uploads';
import { FollowupModal } from '../../components/FollowupModal';
import { getEnabledModulesForService } from '../../lib/progress';
import { SELECTABLE_SERVICES, getService, type Field } from '../../config/modules';
import { SERVICE_ICON } from '../../config/serviceIcons';
import type { ServiceKey, OrgStatus, Upload } from '../../types';
import { cn } from '../../lib/cn';

type Tab = 'overview' | 'services' | 'submissions' | 'progress' | 'reports' | 'activity' | 'users' | 'ai' | 'flagged';

export function ClientDetail() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: org, isLoading, isError, error } = useOrgBySlug(orgSlug);
  const initialTab = (searchParams.get('tab') as Tab) || 'overview';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [followupOpen, setFollowupOpen] = useState(false);

  if (!orgSlug) return <Navigate to="/admin" replace />;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState variant="inline" label="Loading client…" />
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
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setFollowupOpen(true)} className="btn-secondary">
                <Mail className="h-4 w-4" /> Send follow-up
              </button>
              <Link
                to={`/onboarding/${org.slug}?impersonate=1`}
                className="btn-secondary"
              >
                <Eye className="h-4 w-4" /> View as client
              </Link>
              <OrgStatusPill status={org.status} size="md" />
            </div>
          </div>

          <div className="border-b border-border-subtle mb-6 flex gap-1 overflow-x-auto">
            <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
            <TabBtn active={tab === 'services'} onClick={() => setTab('services')}>Services</TabBtn>
            <TabBtn active={tab === 'submissions'} onClick={() => setTab('submissions')}>Submitted info</TabBtn>
            <TabBtn active={tab === 'progress'} onClick={() => setTab('progress')}>Progress</TabBtn>
            <TabBtn active={tab === 'reports'} onClick={() => setTab('reports')}>Reports</TabBtn>
            <TabBtn active={tab === 'activity'} onClick={() => setTab('activity')}>Activity</TabBtn>
            <TabBtn active={tab === 'ai'} onClick={() => setTab('ai')}>AI chats</TabBtn>
            <TabBtn active={tab === 'flagged'} onClick={() => setTab('flagged')}>Flagged</TabBtn>
            <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>Users</TabBtn>
          </div>

          {tab === 'overview' && <OverviewTab org={org} onDelete={() => navigate('/admin')} />}
          {tab === 'services' && <ServicesTab orgId={org.id} />}
          {tab === 'submissions' && <SubmissionsTab orgId={org.id} />}
          {tab === 'progress' && <ProgressTab orgId={org.id} />}
          {tab === 'reports' && <ReportsTab orgId={org.id} />}
          {tab === 'activity' && <ActivityTab orgId={org.id} />}
          {tab === 'ai' && <AiChatsTab orgId={org.id} />}
          {tab === 'flagged' && <FlaggedTab orgId={org.id} primaryContactEmail={org.primaryContactEmail} />}
          {tab === 'users' && <UsersTab orgId={org.id} />}

          {followupOpen && (
            <FollowupModal
              orgId={org.id}
              primaryContactEmail={org.primaryContactEmail ?? null}
              onClose={() => setFollowupOpen(false)}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function OverviewTab({ org, onDelete }: { org: NonNullable<ReturnType<typeof useOrgBySlug>['data']>; onDelete: () => void }) {
  const updateOrg = useUpdateOrg();
  const deleteOrg = useDeleteOrg();
  const { snapshot } = useOrgSnapshot(org.id);
  const snap = snapshot;
  const readyForLive = (() => {
    if (!snap) return false;
    // inlined getOrgProgress logic: ready if every module is complete
    const enabledServiceKeys = snap.services.map(s => s.serviceKey);
    if (enabledServiceKeys.length === 0) return false;
    const total = snap.moduleProgress.length;
    const done = snap.moduleProgress.filter(p => p.status === 'complete').length;
    return total > 0 && total === done;
  })();
  const markLive = async () => {
    try {
      await updateOrg.mutateAsync({ id: org.id, patch: { status: 'live' } });
      toast.success(`${org.businessName} is now live. Reports dashboard is unlocked for them.`);
    } catch (err) {
      toast.error('Could not set live', { description: (err as Error).message });
    }
  };
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const runDelete = async () => {
    setShowDeleteConfirm(false);
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
      <AdminSetupCard orgId={org.id} />
      {readyForLive && org.status === 'onboarding' && (
        <div className="card border-success/40 bg-success/5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-success/20 text-success flex items-center justify-center shrink-0">
              <MessageCircleIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">All onboarding modules are complete</p>
              <p className="text-xs text-white/60 mt-0.5">The client is waiting on the "we're reviewing" page. Once you've checked their submissions, mark them live to unlock the reports dashboard.</p>
            </div>
            <button onClick={markLive} disabled={updateOrg.isPending} className="btn-primary shrink-0">
              {updateOrg.isPending ? 'Marking…' : 'Mark as live →'}
            </button>
          </div>
        </div>
      )}

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
        <button onClick={() => setShowDeleteConfirm(true)} disabled={deleteOrg.isPending} className="btn-danger !py-2 !px-4">
          <Trash2 className="h-4 w-4" /> {deleteOrg.isPending ? 'Deleting…' : 'Delete client'}
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        tone="destructive"
        title={`Delete ${org.businessName}?`}
        body="This removes the organisation, all submissions, all uploads, and revokes access for every invited user. Cannot be undone."
        confirmLabel="Yes, delete permanently"
        cancelLabel="Cancel"
        onConfirm={runDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function ServicesTab({ orgId }: { orgId: string }) {
  const { data: services = [], isLoading } = useOrgServices(orgId);
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const toggle = useMutation({
    mutationFn: async ({ key, enabled }: { key: ServiceKey; enabled: boolean }) => {
      if (enabled) await enableService(orgId, key);
      else await disableService(orgId, key);
    },
    // Force an immediate refetch (not just invalidate) - with our 30s staleTime
    // an invalidate alone won't redraw child views that are actively mounted
    // with fresh cache, like the client dashboard if the admin flipped a
    // service via impersonation. refetchQueries bypasses staleTime.
    onSuccess: () => {
      qc.refetchQueries({ queryKey: qk.orgServices(orgId) });
      qc.invalidateQueries({ queryKey: qk.activity(orgId) });
    },
  });

  const reorder = useMutation({
    mutationFn: (keys: ServiceKey[]) => reorderServices(orgId, keys),
    onSuccess: () => { qc.refetchQueries({ queryKey: qk.orgServices(orgId) }); },
    onError: (err: Error) => toast.error('Reorder failed', { description: err.message }),
  });

  const enabledKeys = services.map(s => s.serviceKey);
  const enabledSet = new Set(enabledKeys);
  const disabledServices = SELECTABLE_SERVICES.filter(s => !enabledSet.has(s.key));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = enabledKeys.indexOf(active.id as ServiceKey);
    const newIdx = enabledKeys.indexOf(over.id as ServiceKey);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(enabledKeys, oldIdx, newIdx);
    reorder.mutate(next);
  };

  if (isLoading) return <LoadingState label="Loading services…" />;

  return (
    <div className="space-y-6">
      {disabledServices.length > 0 && (
        <div className="card space-y-2">
          <p className="eyebrow mb-3">Available to enable</p>
          {disabledServices.map(svc => {
            const Icon = SERVICE_ICON[svc.key];
            return (
              <div key={svc.key} className="flex items-center gap-4 p-3 rounded-xl border border-border-subtle opacity-70 hover:opacity-100 hover:border-border-emphasis transition">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/40 shrink-0"><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{svc.label}</p>
                  <p className="text-xs text-white/50 truncate">{svc.description}</p>
                </div>
                <button onClick={() => toggle.mutate({ key: svc.key, enabled: true })} disabled={toggle.isPending} className="btn-secondary !py-1.5 !px-3 text-xs">
                  Enable
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Enabled services, drag to reorder</p>
          <span className="text-xs text-white/40">{enabledKeys.length} active</span>
        </div>
        {enabledKeys.length === 0 ? (
          <p className="text-sm text-white/50">No services enabled. Pick some from above.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={enabledKeys} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {enabledKeys.map(key => {
                  const svcEntry = services.find(s => s.serviceKey === key);
                  if (!svcEntry) return null;
                  return (
                    <SortableServiceRow
                      key={key}
                      orgId={orgId}
                      service={svcEntry}
                      onDisable={() => toggle.mutate({ key, enabled: false })}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SortableServiceRow({ orgId, service, onDisable }: {
  orgId: string;
  service: import('../../types').OrganizationService;
  onDisable: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.serviceKey });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const svcDef = getService(service.serviceKey);
  const Icon = SERVICE_ICON[service.serviceKey];
  const [expanded, setExpanded] = useState(false);

  if (!svcDef) return null;

  const disabledModuleSet = new Set(service.disabledModuleKeys ?? []);
  const disabledFieldSet = new Set(service.disabledFieldKeys ?? []);
  const totalModules = svcDef.modules.length;
  const enabledModuleCount = totalModules - disabledModuleSet.size;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-border-subtle bg-bg-secondary/40',
        isDragging && 'shadow-lg border-orange/40 z-10',
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <button {...attributes} {...listeners} className="text-white/30 hover:text-white cursor-grab active:cursor-grabbing" title="Drag to reorder">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange/10 text-orange shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{svcDef.label}</p>
          <p className="text-xs text-white/50 truncate">
            {enabledModuleCount}/{totalModules} modules enabled
            {disabledFieldSet.size > 0 && ` · ${disabledFieldSet.size} field${disabledFieldSet.size === 1 ? '' : 's'} hidden`}
          </p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white px-2 py-1 rounded hover:bg-bg-tertiary"
          title="Configure modules + fields"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <button onClick={onDisable} className="text-xs text-white/40 hover:text-error px-2">Disable service</button>
      </div>

      {expanded && (
        <ServiceDrillDown
          orgId={orgId}
          service={service}
          svcDef={svcDef}
          disabledModuleSet={disabledModuleSet}
          disabledFieldSet={disabledFieldSet}
        />
      )}
    </div>
  );
}

function ServiceDrillDown({ orgId, service, svcDef, disabledModuleSet, disabledFieldSet }: {
  orgId: string;
  service: import('../../types').OrganizationService;
  svcDef: import('../../config/modules').ServiceDef;
  disabledModuleSet: Set<string>;
  disabledFieldSet: Set<string>;
}) {
  const qc = useQueryClient();

  const toggleModule = useMutation({
    mutationFn: async ({ moduleKey, enabled }: { moduleKey: string; enabled: boolean }) => {
      const next = new Set(disabledModuleSet);
      if (enabled) next.delete(moduleKey);
      else next.add(moduleKey);
      await setDisabledModuleKeys(orgId, service.serviceKey, Array.from(next));
      supabase.from('activity_log').insert({
        organization_id: orgId,
        action: enabled ? 'admin_enabled_module' : 'admin_disabled_module',
        metadata: { service_key: service.serviceKey, module_key: moduleKey },
      }).then(({ error }) => { if (error) console.warn('[activity] toggle module log failed', error); });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgServices(orgId) }),
  });

  const toggleField = useMutation({
    mutationFn: async ({ fieldPath, enabled }: { fieldPath: string; enabled: boolean }) => {
      const next = new Set(disabledFieldSet);
      if (enabled) next.delete(fieldPath);
      else next.add(fieldPath);
      await setDisabledFieldKeys(orgId, service.serviceKey, Array.from(next));
      supabase.from('activity_log').insert({
        organization_id: orgId,
        action: 'admin_config_changed',
        metadata: { type: 'field_toggle', service_key: service.serviceKey, field_path: fieldPath, enabled },
      }).then(({ error }) => { if (error) console.warn('[activity] toggle field log failed', error); });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgServices(orgId) }),
  });

  return (
    <div className="border-t border-border-subtle p-4 space-y-3 bg-bg/30">
      <p className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">Modules + fields</p>
      {svcDef.modules.map(mod => {
        const moduleEnabled = !disabledModuleSet.has(mod.key);
        const fields = (mod.fields ?? []).filter(f => f.type !== 'info');
        return (
          <div key={mod.key} className="rounded-lg border border-border-subtle bg-bg-secondary/40">
            <div className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-orange"
                checked={moduleEnabled}
                disabled={toggleModule.isPending}
                onChange={e => toggleModule.mutate({ moduleKey: mod.key, enabled: e.target.checked })}
              />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium truncate', !moduleEnabled && 'line-through text-white/40')}>{mod.title}</p>
                {fields.length > 0 && <p className="text-[11px] text-white/40">{fields.length} field{fields.length === 1 ? '' : 's'}</p>}
              </div>
            </div>
            {moduleEnabled && fields.length > 0 && (
              <div className="border-t border-border-subtle px-3 py-2 space-y-1">
                {fields.map(f => {
                  const fieldPath = `${mod.key}.${f.key}`;
                  const fieldEnabled = !disabledFieldSet.has(fieldPath);
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer group">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-orange"
                        checked={fieldEnabled}
                        disabled={toggleField.isPending}
                        onChange={e => toggleField.mutate({ fieldPath, enabled: e.target.checked })}
                      />
                      <span className={cn('text-white/75 group-hover:text-white transition-colors flex-1 truncate', !fieldEnabled && 'line-through text-white/30')}>
                        {f.label ?? f.key}
                        {f.required && fieldEnabled && <span className="text-orange ml-1">*</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
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
          <LoadingState variant="inline" />
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
          <LoadingState variant="inline" />
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
                <button
                  onClick={() => sendInvitationEmail(inv.id).then(() => toast.success('Invite email sent')).catch(err => toast.error('Email failed', { description: err.message }))}
                  className="btn-secondary !py-1.5 !text-xs"
                  title="Resend invitation email"
                >
                  <Mail className="h-3 w-3" /> Send email
                </button>
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
          <p className="text-xs text-white/40">Creates the invitation and emails the invite link automatically. You can also copy the link from the list above or resend the email at any time.</p>
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

// ─── Submissions tab ──────────────────────────────────────────────────────
function SubmissionsTab({ orgId }: { orgId: string }) {
  const { snapshot, isLoading } = useOrgSnapshot(orgId);
  const [filled, setFilled] = useState<'all' | 'filled' | 'empty'>('all');

  if (isLoading || !snapshot) {
    return <LoadingState />;
  }

  const totalFilled = snapshot.submissions.filter(s => s.value != null && s.value !== '').length;

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-1">Submitted info</p>
          <p className="text-sm text-white/60">{totalFilled} field{totalFilled === 1 ? '' : 's'} answered · {snapshot.uploads.length} file{snapshot.uploads.length === 1 ? '' : 's'} uploaded</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-bg-tertiary">
          {(['all', 'filled', 'empty'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilled(k)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                filled === k ? 'bg-orange text-white' : 'text-white/60 hover:text-white',
              )}
            >{k === 'all' ? 'All fields' : k}</button>
          ))}
        </div>
      </div>

      {snapshot.services.map(svcEntry => {
        const svc = getService(svcEntry.serviceKey);
        if (!svc) return null;
        const Icon = SERVICE_ICON[svc.key];
        const modules = getEnabledModulesForService(snapshot, svc.key);
        return (
          <div key={svc.key} className="card p-0 overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-border-subtle">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange/10 text-orange"><Icon className="h-5 w-5" /></div>
              <h3 className="font-display font-bold text-lg">{svc.label}</h3>
              <span className="text-xs text-white/40 ml-auto">{modules.length} module{modules.length === 1 ? '' : 's'}</span>
            </div>
            {modules.length === 0 ? (
              <p className="px-5 py-6 text-sm text-white/50">All modules in this service are hidden or disabled.</p>
            ) : modules.map(m => {
              const disabledFieldSet = new Set(svcEntry.disabledFieldKeys ?? []);
              const fields = (m.fields ?? []).filter(f => f.type !== 'info' && !disabledFieldSet.has(`${m.key}.${f.key}`));
              if (fields.length === 0) return null;

              const rows = fields.map(f => {
                const fieldKey = `${svc.key}.${m.key}.${f.key}`;
                const sub = snapshot.submissions.find(s => s.fieldKey === fieldKey);
                const hasValue = sub && sub.value != null && sub.value !== '' && (!Array.isArray(sub.value) || sub.value.length > 0);
                return { field: f, fieldKey, value: sub?.value, hasValue };
              }).filter(r => {
                if (filled === 'filled') return r.hasValue;
                if (filled === 'empty')  return !r.hasValue;
                return true;
              });

              if (rows.length === 0) return null;

              return (
                <div key={m.key} className="px-5 py-4 border-b border-border-subtle last:border-0">
                  <p className="text-sm font-semibold text-white/80 mb-3">{m.title}</p>
                  <div className="space-y-3">
                    {rows.map(({ field, fieldKey, value, hasValue }) => (
                      <div key={fieldKey} className="grid md:grid-cols-[220px,1fr] gap-2 md:gap-6 text-sm">
                        <div className="text-white/50 text-xs uppercase tracking-wider md:pt-0.5 truncate">{field.label ?? field.key}</div>
                        <div className="text-white/90 break-words">
                          {hasValue ? <SubmissionValue field={field} value={value} uploads={snapshot.uploads} fieldKey={fieldKey} /> : <span className="text-white/30 italic">Not answered</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function SubmissionValue({ field, value, uploads, fieldKey }: { field: Field; value: unknown; uploads: Upload[]; fieldKey: string }) {
  if (field.type === 'color' && typeof value === 'string') {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-block h-5 w-5 rounded border border-border-subtle" style={{ background: value }} />
        <code className="text-xs text-white/60">{value}</code>
      </div>
    );
  }
  if (field.type === 'checkbox') return <span>{value ? '✓ Yes' : '✗ No'}</span>;
  if (field.type === 'slider' && typeof value === 'number') {
    return <span className="tabular-nums">{value}{field.slider?.suffix ?? ''}</span>;
  }
  if (field.type === 'multiselect' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v, i) => <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange/10 text-orange">{String(v)}</span>)}
      </div>
    );
  }
  if (field.type === 'repeatable' && Array.isArray(value)) {
    return (
      <ol className="list-decimal list-inside space-y-0.5">
        {value.map((v, i) => <li key={i} className="text-white/80">{typeof v === 'string' ? v : JSON.stringify(v)}</li>)}
      </ol>
    );
  }
  if (field.type === 'structured' && value && typeof value === 'object') {
    const data = value as Record<string, unknown>;
    return (
      <div className="space-y-0.5">
        {field.schema?.map(s => (
          <div key={s.key} className="flex gap-2">
            <span className="text-white/40 text-xs w-20 shrink-0">{s.label}</span>
            <span>{String(data[s.key] ?? '-')}</span>
          </div>
        ))}
      </div>
    );
  }
  if (field.type === 'weekly_availability' && value && typeof value === 'object') {
    const days = value as Record<string, { closed?: boolean; open?: string; close?: string }>;
    const order = ['mon','tue','wed','thu','fri','sat','sun'];
    return (
      <div className="grid grid-cols-4 md:grid-cols-7 gap-1 text-xs">
        {order.filter(d => days[d]).map(d => (
          <div key={d} className={cn('rounded px-2 py-1.5 text-center', days[d].closed ? 'bg-bg-tertiary text-white/30' : 'bg-orange/10 text-orange')}>
            <div className="font-semibold uppercase text-[10px]">{d}</div>
            <div className="text-[10px]">{days[d].closed ? 'Closed' : `${days[d].open}–${days[d].close}`}</div>
          </div>
        ))}
      </div>
    );
  }
  if ((field.type === 'file' || field.type === 'file_multiple' || field.type === 'logo_picker')) {
    const fieldUploads = uploads.filter(u => u.category === fieldKey);
    if (fieldUploads.length === 0 && field.type === 'logo_picker' && value && typeof value === 'object') {
      const data = value as { mode?: string; url?: string };
      if (data.mode === 'url' && data.url) return <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-orange hover:text-orange-hover break-all">{data.url}</a>;
    }
    return <UploadPreview uploads={fieldUploads} />;
  }
  if (field.type === 'url' && typeof value === 'string') {
    return <a href={value} target="_blank" rel="noopener noreferrer" className="text-orange hover:text-orange-hover break-all">{value}</a>;
  }
  if (typeof value === 'string') return <span className="whitespace-pre-wrap">{value}</span>;
  return <code className="text-xs text-white/60">{JSON.stringify(value)}</code>;
}

function UploadPreview({ uploads }: { uploads: Upload[] }) {
  if (uploads.length === 0) return <span className="text-white/30 italic">No files</span>;
  return (
    <div className="space-y-1.5">
      {uploads.map(u => <UploadRow key={u.id} upload={u} />)}
    </div>
  );
}

function UploadRow({ upload }: { upload: Upload }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!upload.storagePath) return;
    getUploadSignedUrl(upload.storagePath).then(setUrl).catch(() => setUrl(null));
  }, [upload.storagePath]);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-bg-tertiary">📎</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-orange hover:text-orange-hover truncate flex-1">{upload.fileName}</a>
      ) : (
        <span className="text-white/60 truncate flex-1">{upload.fileName}</span>
      )}
      <span className="text-white/40 tabular-nums shrink-0">{(upload.fileSize / 1024).toFixed(0)} KB</span>
    </div>
  );
}

// ─── Progress tab ─────────────────────────────────────────────────────────
function ProgressTab({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const { snapshot, isLoading } = useOrgSnapshot(orgId);
  const setModStatus = useSetModuleStatus();
  const setTask = useSetTaskCompletion();

  if (isLoading || !snapshot) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="eyebrow mb-1">Progress (admin override)</p>
        <p className="text-sm text-white/60">Mark tasks or whole modules complete on the client's behalf, useful after phone calls, for testing, or when you collected info offline.</p>
      </div>

      {snapshot.services.map(svcEntry => {
        const svc = getService(svcEntry.serviceKey);
        if (!svc) return null;
        const Icon = SERVICE_ICON[svc.key];
        const modules = getEnabledModulesForService(snapshot, svc.key);

        return (
          <div key={svc.key} className="card p-0 overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-border-subtle">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange/10 text-orange"><Icon className="h-5 w-5" /></div>
              <h3 className="font-display font-bold text-lg">{svc.label}</h3>
            </div>
            {modules.length === 0 ? (
              <p className="px-5 py-5 text-sm text-white/50">No modules visible.</p>
            ) : modules.map(m => {
              const mp = snapshot.moduleProgress.find(p => p.serviceKey === svc.key && p.moduleKey === m.key);
              const modStatus = mp?.status ?? 'not_started';
              const isComplete = modStatus === 'complete';
              return (
                <div key={m.key} className="px-5 py-4 border-b border-border-subtle last:border-0">
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={isComplete}
                      onChange={e => setModStatus.mutate({
                        organizationId: orgId,
                        serviceKey: svc.key,
                        moduleKey: m.key,
                        status: e.target.checked ? 'complete' : 'in_progress',
                        userId: user?.id,
                      })}
                      className="mt-1 h-4 w-4 accent-orange"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{m.title}</p>
                        <ModuleStatusPill status={modStatus} />
                      </div>
                      {m.description && <p className="text-xs text-white/50 mt-0.5">{m.description}</p>}
                    </div>
                  </div>
                  {m.tasks && m.tasks.length > 0 && (
                    <div className="ml-7 space-y-1.5">
                      {m.tasks.map(t => {
                        const taskKey = `${svc.key}.${m.key}.${t.key}`;
                        const done = !!snapshot.taskCompletions.find(c => c.taskKey === taskKey && c.completed);
                        return (
                          <label key={t.key} className="flex items-start gap-2 text-sm cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={e => setTask.mutate({
                                organizationId: orgId,
                                taskKey,
                                completed: e.target.checked,
                                userId: user?.id,
                              })}
                              className="mt-0.5 h-3.5 w-3.5 accent-orange"
                            />
                            <span className={cn('text-white/80 group-hover:text-white transition-colors', done && 'line-through text-white/40')}>
                              {t.label}{t.required === false && <span className="text-white/30 text-xs ml-1">(optional)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Admin setup card (Retell number + AI Receptionist ready flag) ──────
function AdminSetupCard({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data: retell = null } = useQuery({
    queryKey: ['retell', orgId],
    queryFn: () => import('../../lib/db/retellNumbers').then(m => m.getRetellNumber(orgId)),
  });
  const { data: flags = {} } = useQuery({
    queryKey: qk.adminFlags(orgId),
    queryFn: () => import('../../lib/db/progress').then(m => m.listAdminFlags(orgId)),
  });

  const [number, setNumber] = useState(retell ?? '');
  useEffect(() => { if (retell !== null) setNumber(retell); }, [retell]);

  const aiReceptionistReady = !!flags['ai_receptionist_ready_for_connection'];

  const saveNumber = useMutation({
    mutationFn: async () => {
      const trimmed = number.trim();
      if (trimmed) {
        // E.164 format: optional +, digits, up to 15 total. Permissive enough
        // for common Canadian/US inputs (10-digit, +1-prefixed, spaced).
        const digits = trimmed.replace(/[\s()\-.]/g, '');
        if (!/^\+?[1-9]\d{9,14}$/.test(digits)) {
          throw new Error('Enter a valid phone number in E.164 format, e.g. +14035551234');
        }
      }
      const { setRetellNumber, clearRetellNumber } = await import('../../lib/db/retellNumbers');
      if (trimmed) await setRetellNumber(orgId, trimmed);
      else await clearRetellNumber(orgId);

      supabase.from('activity_log').insert({
        organization_id: orgId,
        action: 'admin_config_changed',
        metadata: { type: 'retell_number', set: !!trimmed },
      }).then(({ error }) => { if (error) console.warn('[activity] retell log failed', error); });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retell', orgId] });
      toast.success('Forwarding number saved');
    },
    onError: (err: Error) => toast.error('Save failed', { description: err.message }),
  });

  const toggleFlag = useMutation({
    mutationFn: async (value: boolean) => {
      const { setAdminFlag } = await import('../../lib/db/progress');
      await setAdminFlag(orgId, 'ai_receptionist_ready_for_connection', value);
      supabase.from('activity_log').insert({
        organization_id: orgId,
        action: 'admin_config_changed',
        metadata: { type: 'ai_receptionist_ready', value },
      }).then(({ error }) => { if (error) console.warn('[activity] flag log failed', error); });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminFlags(orgId) });
      toast.success('Setup flag updated');
    },
    onError: (err: Error) => toast.error('Save failed', { description: err.message }),
  });

  const dirty = number.trim() !== (retell ?? '');

  return (
    <div className="card space-y-5 border-orange/20">
      <div>
        <p className="eyebrow mb-1">Admin setup</p>
        <p className="text-xs text-white/55">Serenium-only fields. Clients don't see these directly, they drive what's visible in their portal.</p>
      </div>

      <div>
        <label className="label">AI Receptionist forwarding number</label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="+1 403 555 0199"
            className="input flex-1"
          />
          <button onClick={() => saveNumber.mutate()} disabled={!dirty || saveNumber.isPending} className="btn-primary shrink-0">
            {saveNumber.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-white/40 mt-1.5">
          The number Retell provisioned. Shown to the client on the phone forwarding step.
        </p>
      </div>

      <div className="pt-4 border-t border-border-subtle flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">AI Receptionist is ready for the client to connect</p>
          <p className="text-xs text-white/55 mt-0.5">Flip this on once Retell is live. Unlocks the phone number setup step in the client's portal.</p>
        </div>
        <button
          onClick={() => toggleFlag.mutate(!aiReceptionistReady)}
          disabled={toggleFlag.isPending}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
            aiReceptionistReady ? 'bg-success' : 'bg-bg-tertiary',
          )}
        >
          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', aiReceptionistReady ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>
    </div>
  );
}

// ─── Reports tab ─────────────────────────────────────────────────────────
function ReportsTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', orgId],
    queryFn: () => import('../../lib/db/reports').then(m => m.listReportsForOrg(orgId)),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['reports', orgId] });

  const runDeleteReport = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      const { deleteReport } = await import('../../lib/db/reports');
      await deleteReport(target.id);
      refresh();
      toast.success('Report deleted');
    } catch (err) {
      toast.error('Delete failed', { description: (err as Error).message });
    }
  };

  if (isLoading) return <LoadingState label="Loading reports…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1">Monthly reports</p>
          <p className="text-sm text-white/60">Published reports show in the client's portal after onboarding completes.</p>
        </div>
        <button onClick={() => setShowNew(s => !s)} className="btn-primary">
          <Plus className="h-4 w-4" /> {showNew ? 'Cancel' : 'New report'}
        </button>
      </div>

      {showNew && (
        <ReportEditor
          orgId={orgId}
          userId={user?.id}
          onSaved={() => { setShowNew(false); refresh(); toast.success('Report published'); }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {reports.length === 0 && !showNew && (
        <div className="card text-center py-16">
          <p className="text-white/50">No reports yet for this client.</p>
        </div>
      )}

      {reports.map(r => (
        editingId === r.id ? (
          <ReportEditor
            key={r.id}
            orgId={orgId}
            userId={user?.id}
            existing={r}
            onSaved={() => { setEditingId(null); refresh(); toast.success('Report updated'); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <ReportCard
            key={r.id}
            report={r}
            onEdit={() => setEditingId(r.id)}
            onDelete={() => setPendingDelete({ id: r.id, title: r.title })}
          />
        )
      ))}

      <ConfirmDialog
        open={!!pendingDelete}
        tone="destructive"
        title={`Delete "${pendingDelete?.title}"?`}
        body="This removes the report from the client's portal. Uploaded files stay in storage - you can clean them up separately."
        confirmLabel="Delete report"
        cancelLabel="Cancel"
        onConfirm={runDeleteReport}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function ReportCard({ report, onEdit, onDelete }: {
  report: import('../../types').MonthlyReport; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-xs text-white/50 tabular-nums">{report.period}</p>
          <h3 className="font-display font-bold text-lg truncate">{report.title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className="btn-secondary !py-1.5 !px-3 text-xs">Edit</button>
          <button onClick={onDelete} className="text-xs text-error hover:underline">Delete</button>
        </div>
      </div>
      {report.summary && (
        <div className="text-sm text-white/70 mb-3 prose prose-invert prose-sm max-w-none">
          <Markdown>{report.summary}</Markdown>
        </div>
      )}
      {report.highlights && report.highlights.length > 0 && (
        <ul className="mb-3 space-y-0.5">
          {report.highlights.map((h, i) => <li key={i} className="text-sm text-white/80">• {h}</li>)}
        </ul>
      )}
      {report.loomUrl && <a href={report.loomUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange hover:text-orange-hover inline-flex items-center gap-1">→ Watch report video</a>}
    </div>
  );
}

function ReportEditor({ orgId, userId, existing, onSaved, onCancel }: {
  orgId: string; userId?: string;
  existing?: import('../../types').MonthlyReport;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [period, setPeriod] = useState(existing?.period ?? new Date().toISOString().slice(0, 7));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [loomUrl, setLoomUrl] = useState(existing?.loomUrl ?? '');
  const [highlights, setHighlights] = useState<string[]>(existing?.highlights ?? []);
  const [files, setFiles] = useState<import('../../types').ReportFile[]>(existing?.files ?? []);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addHighlight = () => setHighlights([...highlights, '']);
  const updateHighlight = (i: number, v: string) => setHighlights(highlights.map((h, idx) => idx === i ? v : h));
  const removeHighlight = (i: number) => setHighlights(highlights.filter((_, idx) => idx !== i));

  const onFilesPicked = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setUploading(true);
    try {
      const { uploadReportFile } = await import('../../lib/db/reportFiles');
      const added: import('../../types').ReportFile[] = [];
      for (const f of Array.from(picked)) {
        const reportId = existing?.id ?? 'draft-' + Date.now();
        const meta = await uploadReportFile({ organizationId: orgId, reportId, file: f });
        added.push(meta);
      }
      setFiles(prev => [...prev, ...added]);
    } catch (err) {
      toast.error('Upload failed', { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };
  const removeFile = async (id: string) => {
    const toRemove = files.find(f => f.id === id);
    if (!toRemove) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    if (toRemove.fileUrl) {
      const { removeReportFile } = await import('../../lib/db/reportFiles');
      removeReportFile(toRemove.fileUrl).catch(() => {});
    }
  };
  const updateFileDescription = (id: string, description: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, description } : f));
  };

  const save = async () => {
    if (!title.trim() || !period.trim()) return;
    setPending(true);
    try {
      const { createReport, updateReport } = await import('../../lib/db/reports');
      const cleaned = highlights.map(h => h.trim()).filter(Boolean);
      if (existing) {
        await updateReport(existing.id, { period, title: title.trim(), summary: summary.trim() || undefined, loomUrl: loomUrl.trim() || undefined, highlights: cleaned, files });
      } else {
        await createReport({ organizationId: orgId, period, title: title.trim(), summary: summary.trim() || undefined, loomUrl: loomUrl.trim() || undefined, highlights: cleaned, files, createdBy: userId });
      }
      onSaved();
    } catch (err) {
      toast.error('Save failed', { description: (err as Error).message });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="card space-y-4 border-orange/30">
      <p className="eyebrow">{existing ? 'Editing report' : 'New report'}</p>
      <div className="grid md:grid-cols-[160px,1fr] gap-3">
        <div>
          <label className="label">Period</label>
          <input type="month" className="input" value={period} onChange={e => setPeriod(e.target.value)} />
        </div>
        <div>
          <label className="label">Title</label>
          <input type="text" className="input" placeholder="e.g. April 2026 performance" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Summary (markdown OK)</label>
        <textarea rows={4} className="input" placeholder="What happened this month, what worked, what we're changing next month." value={summary} onChange={e => setSummary(e.target.value)} />
      </div>
      <div>
        <label className="label">Loom / YouTube video URL (optional)</label>
        <input type="url" className="input" placeholder="https://www.loom.com/share/..." value={loomUrl} onChange={e => setLoomUrl(e.target.value)} />
      </div>
      <div>
        <label className="label">Headline numbers / bullets</label>
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-1" placeholder="e.g. 42 leads this month, up 18%" value={h} onChange={e => updateHighlight(i, e.target.value)} />
              <button onClick={() => removeHighlight(i)} className="text-white/40 hover:text-error p-2"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button onClick={addHighlight} className="text-xs text-orange hover:text-orange-hover font-medium inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add bullet</button>
        </div>
      </div>

      <div>
        <label className="label">Attachments (PDFs, screenshots, anything)</label>
        <label className={cn(
          'block border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors',
          uploading ? 'border-orange/40 bg-orange/5 cursor-wait' : 'border-border-subtle hover:border-orange/40 bg-bg-tertiary/30',
        )}>
          <input
            type="file"
            multiple
            accept="application/pdf,image/*"
            onChange={e => onFilesPicked(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <p className="text-sm font-medium">{uploading ? 'Uploading…' : 'Click to add files'}</p>
          <p className="text-xs text-white/40 mt-1">PDFs + images, multiple at once</p>
        </label>
        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map(f => (
              <div key={f.id} className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/40">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-orange/10 text-orange shrink-0">📎</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.fileName}</p>
                    <p className="text-[10px] text-white/40 tabular-nums">{Math.round(f.fileSize / 1024)} KB</p>
                  </div>
                  <button onClick={() => removeFile(f.id)} className="text-error/60 hover:text-error p-1" title="Remove"><Trash2 className="h-4 w-4" /></button>
                </div>
                <input
                  className="input !py-1.5 text-xs"
                  placeholder="Note (shown under the filename to the client), optional"
                  value={f.description ?? ''}
                  onChange={e => updateFileDescription(f.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={save} disabled={!title.trim() || !period.trim() || pending} className="btn-primary">
          {pending ? 'Saving…' : existing ? 'Save' : 'Publish report'}
        </button>
      </div>
    </div>
  );
}

// ─── Activity tab ────────────────────────────────────────────────────────
function ActivityTab({ orgId }: { orgId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['activity', orgId],
    queryFn: () => import('../../lib/db/activity').then(m => m.listActivityForOrg(orgId, 200)),
  });

  if (isLoading) return <LoadingState label="Loading activity…" />;

  if (items.length === 0) {
    return (
      <div className="card text-center py-16">
        <p className="text-white/50">No activity yet. Actions like module completions, uploads, and service toggles show up here.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="eyebrow mb-4">Recent activity</p>
      <div className="relative pl-5 border-l border-border-subtle space-y-5">
        {items.map(item => (
          <ActivityRow key={item.id} action={item.action} metadata={item.metadata} createdAt={item.createdAt} />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ action, metadata, createdAt }: { action: string; metadata: Record<string, unknown>; createdAt: string }) {
  const labels: Record<string, { verb: string; tone: string }> = {
    step_completed:         { verb: 'Completed a module',         tone: 'text-success' },
    step_reopened:          { verb: 'Re-opened a module',         tone: 'text-orange' },
    file_uploaded:          { verb: 'Uploaded a file',            tone: 'text-orange' },
    field_submitted:        { verb: 'Updated a field',            tone: 'text-white/60' },
    service_enabled:        { verb: 'Service enabled',            tone: 'text-success' },
    service_disabled:       { verb: 'Service disabled',           tone: 'text-white/50' },
    member_joined:          { verb: 'Member joined',              tone: 'text-orange' },
    followup_sent:          { verb: 'Follow-up email sent',       tone: 'text-orange' },
    help_requested:         { verb: 'Requested help from team',   tone: 'text-orange' },
    report_published:       { verb: 'Report published',           tone: 'text-success' },
    report_updated:         { verb: 'Report updated',             tone: 'text-white/60' },
    report_deleted:         { verb: 'Report deleted',             tone: 'text-error' },
    admin_invitation_sent:  { verb: 'Admin sent an invitation',   tone: 'text-orange' },
    admin_viewed_as_client: { verb: 'Admin viewed as client',     tone: 'text-white/60' },
    admin_marked_live:      { verb: 'Admin marked client live',   tone: 'text-success' },
    admin_enabled_module:   { verb: 'Admin enabled module',       tone: 'text-success' },
    admin_disabled_module:  { verb: 'Admin disabled module',      tone: 'text-white/50' },
    admin_enabled_service:  { verb: 'Admin enabled service',      tone: 'text-success' },
    admin_disabled_service: { verb: 'Admin disabled service',     tone: 'text-white/50' },
    admin_note_added:       { verb: 'Admin added a note',         tone: 'text-white/60' },
    admin_note_updated:     { verb: 'Admin updated a note',       tone: 'text-white/60' },
    admin_note_deleted:     { verb: 'Admin deleted a note',       tone: 'text-error' },
    admin_config_changed:   { verb: 'Admin changed config',       tone: 'text-white/60' },
    admin_client_deleted:   { verb: 'Admin deleted client',       tone: 'text-error' },
  };
  const entry = labels[action] ?? { verb: action, tone: 'text-white/60' };
  const detail = describeMeta(action, metadata);

  return (
    <div className="relative">
      <span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-orange" />
      <p className={`text-sm font-medium ${entry.tone}`}>{entry.verb}</p>
      {detail && <p className="text-xs text-white/50 mt-0.5">{detail}</p>}
      <p className="text-[11px] text-white/30 mt-0.5 tabular-nums">{new Date(createdAt).toLocaleString()}</p>
    </div>
  );
}

function describeMeta(action: string, meta: Record<string, unknown>): string | null {
  switch (action) {
    case 'step_completed':
    case 'step_reopened':
      return `${meta.service_key ?? ''} · ${meta.module_key ?? ''}`;
    case 'file_uploaded':
      return `${meta.file_name ?? ''}${meta.category ? ' in ' + meta.category : ''}`;
    case 'service_enabled':
    case 'service_disabled':
    case 'admin_enabled_service':
    case 'admin_disabled_service':
      return String(meta.service_key ?? '');
    case 'admin_enabled_module':
    case 'admin_disabled_module':
      return `${meta.service_key ?? ''} · ${meta.module_key ?? ''}`;
    case 'admin_invitation_sent':
      return String(meta.invitee_email ?? '');
    case 'admin_client_deleted':
      return String(meta.business_name ?? '');
    default:
      return Object.keys(meta).length ? JSON.stringify(meta) : null;
  }
}

// ─── AI chats tab (per-client) ───────────────────────────────────────────
function AiChatsTab({ orgId }: { orgId: string }) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['ai-chat', 'org', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <LoadingState label="Loading chats…" />;
  if (messages.length === 0) {
    return (
      <div className="card text-center py-16">
        <MessageCircleIcon className="h-8 w-8 text-white/30 mx-auto mb-3" />
        <p className="text-white/50">No AI conversations from this client yet.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Conversation history</p>
        <span className="text-xs text-white/40">{messages.length} messages</span>
      </div>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {(messages as Array<{ id: string; role: string; content: string; context: string | null; created_at: string }>).map(m => (
          <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
              m.role === 'user' ? 'bg-orange text-white rounded-br-md' : 'bg-bg-tertiary text-white/90 rounded-bl-md',
            )}>
              <span className="whitespace-pre-wrap">{m.content}</span>
              {m.context && <p className="text-[10px] opacity-60 mt-1">at {m.context}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function FlaggedTab({ orgId, primaryContactEmail }: { orgId: string; primaryContactEmail?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['aria-escalations', orgId],
    queryFn: async () => {
      const { listEscalationsForOrg } = await import('../../lib/db/escalations');
      return listEscalationsForOrg(orgId);
    },
  });

  const handleResolve = async (id: string) => {
    if (!user) return;
    try {
      const { resolveEscalation } = await import('../../lib/db/escalations');
      await resolveEscalation(id, user.id);
      qc.invalidateQueries({ queryKey: ['aria-escalations', orgId] });
      qc.invalidateQueries({ queryKey: ['aria-escalations-open'] });
      toast.success('Marked resolved');
    } catch (err) {
      toast.error("Couldn't mark resolved", { description: (err as Error).message });
    }
  };
  const handleReopen = async (id: string) => {
    try {
      const { reopenEscalation } = await import('../../lib/db/escalations');
      await reopenEscalation(id);
      qc.invalidateQueries({ queryKey: ['aria-escalations', orgId] });
      qc.invalidateQueries({ queryKey: ['aria-escalations-open'] });
    } catch (err) {
      toast.error("Couldn't reopen", { description: (err as Error).message });
    }
  };

  if (isLoading) return <LoadingState variant="inline" label="Loading flagged questions…" />;
  if (items.length === 0) {
    return (
      <div className="card text-center py-12">
        <Bell className="h-8 w-8 text-white/30 mx-auto mb-3" />
        <p className="text-white/60">No flagged questions yet.</p>
        <p className="text-xs text-white/40 mt-1">Aria flags a question here when she can't answer and asks the team to help.</p>
      </div>
    );
  }

  const open = items.filter(i => !i.resolvedAt);
  const resolved = items.filter(i => i.resolvedAt);

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm mb-3 text-white">Open ({open.length})</h3>
          <ul className="space-y-3">
            {open.map(e => (
              <li key={e.id} className="card !p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/45">
                      {new Date(e.createdAt).toLocaleString()}
                      {e.pageContext && <> · on the "{e.pageContext}" step</>}
                    </p>
                    <p className="text-sm text-white mt-1.5 whitespace-pre-wrap">{e.question}</p>
                    {e.contextSnippet && (
                      <details className="mt-3">
                        <summary className="text-xs text-white/50 cursor-pointer hover:text-white/75">Aria's reply</summary>
                        <p className="text-xs text-white/65 mt-2 whitespace-pre-wrap bg-bg-tertiary/50 rounded-lg p-3">{e.contextSnippet}</p>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {primaryContactEmail && (
                      <a
                        href={`mailto:${primaryContactEmail}?subject=${encodeURIComponent(`Re: ${e.question.slice(0, 60)}`)}&body=${encodeURIComponent(`Hey,\n\nThanks for the question through the portal:\n\n> ${e.question}\n\n`)}`}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-orange text-white font-medium hover:bg-orange-hover"
                      >
                        <Mail className="h-3.5 w-3.5" /> Reply by email
                      </a>
                    )}
                    <button
                      onClick={() => handleResolve(e.id)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border-subtle hover:border-white/30 hover:bg-white/5 text-white/80"
                    >
                      <Check className="h-3.5 w-3.5" /> Resolve
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {resolved.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm mb-3 text-white/60">Resolved ({resolved.length})</h3>
          <ul className="space-y-2">
            {resolved.map(e => (
              <li key={e.id} className="card !p-3 flex items-start gap-3 opacity-70">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/40">{new Date(e.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-white/75 mt-0.5 line-clamp-2">{e.question}</p>
                </div>
                <button
                  onClick={() => handleReopen(e.id)}
                  className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1 px-2 py-1"
                  title="Reopen"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
