import type {
  Profile, Organization, OrganizationService, OrganizationMember,
  ServiceKey, OrgStatus, ModuleProgress, TaskCompletion, Submission,
  Upload, Invitation, ModuleStatus, MonthlyReport, ReportFile,
  ActivityLogEntry, AdminNote, MemberRole,
} from '../types';
import { SERVICES } from '../config/modules';

const KEY = 'serenium.mockdb.v6';

interface DBShape {
  profiles: Profile[];
  organizations: Organization[];
  organizationServices: OrganizationService[];
  organizationMembers: OrganizationMember[];
  invitations: Invitation[];
  moduleProgress: ModuleProgress[];
  taskCompletions: TaskCompletion[];
  submissions: Submission[];
  uploads: Upload[];
  videos: Record<string, string>; // "<serviceKey>.<moduleKey>" -> loom url
  welcomeVideo: { fileName: string; fileUrl: string; mimeType: string } | null;
  welcomedUsers: string[]; // userIds who've seen the welcome video
  reports: MonthlyReport[];
  activity: ActivityLogEntry[];
  reportViews: Record<string, string>; // "<userId>.<orgId>" -> ISO timestamp
  adminNotes: AdminNote[];
  /** Admin-controlled per-org flags, e.g. { "<orgId>": { ai_receptionist_ready_for_connection: true } } */
  adminFlags: Record<string, Record<string, boolean>>;
  /** Admin-entered Retell forwarding numbers per org */
  retellNumbers: Record<string, string>;
  sessions: { userId: string } | null;
}

const seed = (): DBShape => {
  const now = new Date().toISOString();
  const adminId = 'user-admin-1';
  const craigId = 'user-craig-1';
  const orgId = 'org-surewest-1';
  return {
    profiles: [
      { id: adminId, fullName: 'Adam Serenium', email: 'adam@sereniumai.com', role: 'admin' },
      { id: craigId, fullName: 'Craig Johnson', email: 'craig@surewest.ca', role: 'client' },
    ],
    organizations: [{
      id: orgId, slug: 'sure-west-roofing', businessName: 'Sure West Roofing',
      primaryContactName: 'Craig Johnson', primaryContactEmail: 'craig@surewest.ca',
      primaryContactPhone: '403-555-0199', status: 'onboarding' as OrgStatus, createdAt: now,
    }],
    organizationServices: [
      { organizationId: orgId, serviceKey: 'business_profile', enabled: true, enabledAt: now },
      { organizationId: orgId, serviceKey: 'facebook_ads',     enabled: true, enabledAt: now },
      { organizationId: orgId, serviceKey: 'ai_sms',           enabled: true, enabledAt: now },
    ],
    organizationMembers: [
      { organizationId: orgId, userId: craigId, role: 'owner', invitedAt: now, acceptedAt: now },
    ],
    invitations: [],
    moduleProgress: [],
    taskCompletions: [],
    submissions: [],
    uploads: [],
    videos: {},
    welcomeVideo: null,
    welcomedUsers: [],
    reports: [],
    activity: [],
    reportViews: {},
    adminNotes: [],
    adminFlags: {},
    retellNumbers: {},
    sessions: null,
  };
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

const load = (): DBShape => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
    const parsed = JSON.parse(raw) as Partial<DBShape>;
    // Defensive: fill in any missing keys from older shapes.
    const full: DBShape = {
      ...seed(),
      ...parsed,
      videos: parsed.videos ?? {},
      welcomedUsers: parsed.welcomedUsers ?? [],
      welcomeVideo: parsed.welcomeVideo ?? null,
      reports: parsed.reports ?? [],
      activity: parsed.activity ?? [],
      reportViews: parsed.reportViews ?? {},
      adminNotes: parsed.adminNotes ?? [],
      adminFlags: parsed.adminFlags ?? {},
      retellNumbers: parsed.retellNumbers ?? {},
    };
    return full;
  } catch { return seed(); }
};

const save = (d: DBShape) => { localStorage.setItem(KEY, JSON.stringify(d)); notify(); };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uid = () => crypto.randomUUID();

function logActivityInto(d: DBShape, entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>) {
  d.activity.push({ ...entry, id: uid(), createdAt: new Date().toISOString() });
  // Keep the log bounded
  if (d.activity.length > 2000) d.activity = d.activity.slice(-1500);
}

export const db = {
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },

  getCurrentUser(): Profile | null {
    const d = load();
    if (!d.sessions) return null;
    return d.profiles.find(p => p.id === d.sessions!.userId) ?? null;
  },

  async signIn(email: string, _password: string): Promise<Profile> {
    const d = load();
    const profile = d.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!profile) throw new Error('No account found for that email.');
    d.sessions = { userId: profile.id };
    save(d);
    return profile;
  },

  async signOut(): Promise<void> {
    const d = load();
    d.sessions = null;
    save(d);
  },

  listOrganizationsForUser(userId: string): Organization[] {
    const d = load();
    const ids = d.organizationMembers.filter(m => m.userId === userId).map(m => m.organizationId);
    return d.organizations.filter(o => ids.includes(o.id));
  },

  listAllOrganizations(): Organization[] { return load().organizations; },

  getOrganizationBySlug(slug: string): Organization | null {
    return load().organizations.find(o => o.slug === slug) ?? null;
  },

  getOrganization(id: string): Organization | null {
    return load().organizations.find(o => o.id === id) ?? null;
  },

  updateOrganization(id: string, patch: Partial<Pick<Organization, 'businessName' | 'primaryContactName' | 'primaryContactEmail' | 'primaryContactPhone' | 'status' | 'logoUrl'>>) {
    const d = load();
    const o = d.organizations.find(x => x.id === id);
    if (!o) return;
    Object.assign(o, patch);
    save(d);
  },

  updateProfile(userId: string, patch: Partial<Pick<Profile, 'fullName' | 'email'>>) {
    const d = load();
    const p = d.profiles.find(x => x.id === userId);
    if (!p) return;
    Object.assign(p, patch);
    save(d);
  },

  listServicesForOrganization(organizationId: string): OrganizationService[] {
    return load().organizationServices.filter(s => s.organizationId === organizationId && s.enabled);
  },

  listMembersForOrg(organizationId: string): { profile: Profile; member: OrganizationMember }[] {
    const d = load();
    return d.organizationMembers
      .filter(m => m.organizationId === organizationId)
      .map(m => ({ member: m, profile: d.profiles.find(p => p.id === m.userId)! }))
      .filter(x => x.profile);
  },

  listInvitationsForOrg(organizationId: string): Invitation[] {
    return load().invitations.filter(i => i.organizationId === organizationId && !i.acceptedAt);
  },

  // --- Create client wizard ---
  createOrganization(input: {
    businessName: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone?: string;
    services: ServiceKey[];
    /**
     * Optional opt-out list of module keys per service. If absent, all modules are included.
     * e.g. { facebook_ads: ['landing_page'] } hides just the landing_page step.
     */
    serviceModules?: Partial<Record<ServiceKey, string[]>>;
    users: { fullName: string; email: string; role: 'owner' | 'member' }[];
  }): Organization {
    const d = load();
    const now = new Date().toISOString();
    let slug = slugify(input.businessName);
    let n = 1;
    while (d.organizations.some(o => o.slug === slug)) { slug = `${slugify(input.businessName)}-${++n}`; }

    const org: Organization = {
      id: uid(), slug, businessName: input.businessName,
      primaryContactName: input.primaryContactName,
      primaryContactEmail: input.primaryContactEmail,
      primaryContactPhone: input.primaryContactPhone,
      status: 'onboarding', createdAt: now,
    };
    d.organizations.push(org);

    // Business Profile is always enabled for every client
    const allServices: ServiceKey[] = ['business_profile', ...input.services.filter(s => s !== 'business_profile')];
    for (const sk of allServices) {
      const disabled = input.serviceModules?.[sk] ?? [];
      d.organizationServices.push({
        organizationId: org.id, serviceKey: sk, enabled: true, enabledAt: now,
        disabledModuleKeys: disabled.length ? disabled : undefined,
      });
      const svc = SERVICES.find(s => s.key === sk);
      svc?.modules.forEach(m => {
        d.moduleProgress.push({
          organizationId: org.id, serviceKey: sk, moduleKey: m.key,
          status: 'not_started' as ModuleStatus,
        });
      });
    }

    for (const u of input.users) {
      const existing = d.profiles.find(p => p.email.toLowerCase() === u.email.toLowerCase());
      if (existing) {
        d.organizationMembers.push({
          organizationId: org.id, userId: existing.id, role: u.role,
          invitedAt: now, acceptedAt: now,
        });
      } else {
        // Auto-create profile + accepted membership in local mode (no real email invites yet)
        const newProfile: Profile = { id: uid(), fullName: u.fullName, email: u.email, role: 'client' };
        d.profiles.push(newProfile);
        d.organizationMembers.push({
          organizationId: org.id, userId: newProfile.id, role: u.role,
          invitedAt: now, acceptedAt: now,
        });
        d.invitations.push({
          id: uid(), organizationId: org.id, email: u.email, fullName: u.fullName,
          role: u.role, token: uid(),
          expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
          acceptedAt: now, createdAt: now,
        });
      }
    }

    save(d);
    return org;
  },

  // --- Service toggle ---
  setServiceEnabled(organizationId: string, serviceKey: ServiceKey, enabled: boolean) {
    const d = load();
    const now = new Date().toISOString();
    const existing = d.organizationServices.find(s => s.organizationId === organizationId && s.serviceKey === serviceKey);
    const wasEnabled = existing?.enabled ?? false;
    if (existing) {
      existing.enabled = enabled;
      existing.enabledAt = now;
    } else {
      d.organizationServices.push({ organizationId, serviceKey, enabled, enabledAt: now });
    }
    if (wasEnabled !== enabled) {
      logActivityInto(d, {
        organizationId,
        action: enabled ? 'service_enabled' : 'service_disabled',
        metadata: { serviceKey },
      });
    }
    // Seed module_progress rows the first time a service is enabled
    if (enabled) {
      const svc = SERVICES.find(s => s.key === serviceKey);
      svc?.modules.forEach(m => {
        const exists = d.moduleProgress.find(mp =>
          mp.organizationId === organizationId && mp.serviceKey === serviceKey && mp.moduleKey === m.key
        );
        if (!exists) {
          d.moduleProgress.push({ organizationId, serviceKey, moduleKey: m.key, status: 'not_started' as ModuleStatus });
        }
      });
    }
    save(d);
  },

  listAllServicesForOrg(organizationId: string): OrganizationService[] {
    return load().organizationServices.filter(s => s.organizationId === organizationId);
  },

  isModuleEnabledForOrg(organizationId: string, serviceKey: ServiceKey, moduleKey: string): boolean {
    const entry = load().organizationServices.find(s =>
      s.organizationId === organizationId && s.serviceKey === serviceKey
    );
    if (!entry || !entry.enabled) return false;
    return !(entry.disabledModuleKeys ?? []).includes(moduleKey);
  },

  setModuleEnabledForOrg(organizationId: string, serviceKey: ServiceKey, moduleKey: string, enabled: boolean) {
    const d = load();
    const entry = d.organizationServices.find(s =>
      s.organizationId === organizationId && s.serviceKey === serviceKey
    );
    if (!entry) return;
    const disabled = new Set(entry.disabledModuleKeys ?? []);
    if (enabled) disabled.delete(moduleKey);
    else disabled.add(moduleKey);
    entry.disabledModuleKeys = disabled.size ? Array.from(disabled) : undefined;
    save(d);
  },

  isFieldEnabledForOrg(organizationId: string, serviceKey: ServiceKey, moduleKey: string, fieldKey: string): boolean {
    const entry = load().organizationServices.find(s =>
      s.organizationId === organizationId && s.serviceKey === serviceKey
    );
    if (!entry) return false;
    return !(entry.disabledFieldKeys ?? []).includes(`${moduleKey}.${fieldKey}`);
  },

  setFieldEnabledForOrg(organizationId: string, serviceKey: ServiceKey, moduleKey: string, fieldKey: string, enabled: boolean) {
    const d = load();
    const entry = d.organizationServices.find(s =>
      s.organizationId === organizationId && s.serviceKey === serviceKey
    );
    if (!entry) return;
    const disabled = new Set(entry.disabledFieldKeys ?? []);
    const k = `${moduleKey}.${fieldKey}`;
    if (enabled) disabled.delete(k);
    else disabled.add(k);
    entry.disabledFieldKeys = disabled.size ? Array.from(disabled) : undefined;
    save(d);
  },

  // --- Impersonation ---
  impersonate(userId: string) {
    const d = load();
    d.sessions = { userId };
    save(d);
  },

  // --- Submissions (autosave) ---
  getSubmission(organizationId: string, fieldKey: string): Submission | null {
    return load().submissions.find(s => s.organizationId === organizationId && s.fieldKey === fieldKey) ?? null;
  },

  listSubmissionsForOrg(organizationId: string): Submission[] {
    return load().submissions.filter(s => s.organizationId === organizationId);
  },

  upsertSubmission(input: { organizationId: string; fieldKey: string; value: unknown; updatedBy?: string }): Submission {
    const d = load();
    const now = new Date().toISOString();
    const existing = d.submissions.find(s => s.organizationId === input.organizationId && s.fieldKey === input.fieldKey);
    if (existing) {
      existing.value = input.value;
      existing.updatedAt = now;
      existing.updatedBy = input.updatedBy;
      save(d);
      return existing;
    }
    const newSub: Submission = { ...input, updatedAt: now };
    d.submissions.push(newSub);
    save(d);
    return newSub;
  },

  // --- Task completions ---
  getTaskCompletions(organizationId: string): TaskCompletion[] {
    return load().taskCompletions.filter(t => t.organizationId === organizationId);
  },

  setTaskCompletion(input: { organizationId: string; taskKey: string; completed: boolean; userId?: string }) {
    const d = load();
    const now = new Date().toISOString();
    const existing = d.taskCompletions.find(t => t.organizationId === input.organizationId && t.taskKey === input.taskKey);
    if (existing) {
      existing.completed = input.completed;
      existing.completedAt = input.completed ? now : undefined;
      existing.completedBy = input.completed ? input.userId : undefined;
    } else {
      d.taskCompletions.push({
        organizationId: input.organizationId, taskKey: input.taskKey, completed: input.completed,
        completedAt: input.completed ? now : undefined,
        completedBy: input.completed ? input.userId : undefined,
      });
    }
    save(d);
  },

  // --- Module progress ---
  listModuleProgress(organizationId: string): ModuleProgress[] {
    return load().moduleProgress.filter(m => m.organizationId === organizationId);
  },

  setModuleStatus(input: { organizationId: string; serviceKey: ServiceKey; moduleKey: string; status: ModuleStatus; userId?: string }) {
    const d = load();
    const now = new Date().toISOString();
    let entry = d.moduleProgress.find(m =>
      m.organizationId === input.organizationId &&
      m.serviceKey === input.serviceKey &&
      m.moduleKey === input.moduleKey
    );
    const previous = entry?.status;
    if (!entry) {
      entry = { organizationId: input.organizationId, serviceKey: input.serviceKey, moduleKey: input.moduleKey, status: input.status };
      d.moduleProgress.push(entry);
    } else {
      entry.status = input.status;
    }
    entry.completedAt = input.status === 'complete' ? now : undefined;
    entry.completedBy = input.status === 'complete' ? input.userId : undefined;

    if (previous !== 'complete' && input.status === 'complete') {
      logActivityInto(d, {
        organizationId: input.organizationId, userId: input.userId,
        action: 'step_completed',
        metadata: { serviceKey: input.serviceKey, moduleKey: input.moduleKey },
      });
    }
    if (previous === 'complete' && input.status !== 'complete') {
      logActivityInto(d, {
        organizationId: input.organizationId, userId: input.userId,
        action: 'step_reopened',
        metadata: { serviceKey: input.serviceKey, moduleKey: input.moduleKey },
      });
    }
    save(d);
  },

  // --- Uploads (file meta only — we store file names + data URLs for preview in mock mode) ---
  addUpload(input: Omit<Upload, 'id' | 'uploadedAt'>): Upload {
    const d = load();
    const upload: Upload = { ...input, id: uid(), uploadedAt: new Date().toISOString() };
    d.uploads.push(upload);
    logActivityInto(d, {
      organizationId: input.organizationId, userId: input.uploadedBy,
      action: 'file_uploaded',
      metadata: { fileName: input.fileName, category: input.category, fileSize: input.fileSize },
    });
    save(d);
    return upload;
  },

  listUploads(organizationId: string, category?: string): Upload[] {
    return load().uploads
      .filter(u => u.organizationId === organizationId && (!category || u.category === category));
  },

  removeUpload(id: string) {
    const d = load();
    d.uploads = d.uploads.filter(u => u.id !== id);
    save(d);
  },

  // --- Videos (global — one Loom URL per step, visible to all clients) ---
  getVideoUrl(serviceKey: ServiceKey, moduleKey: string): string | null {
    const d = load();
    return d.videos[`${serviceKey}.${moduleKey}`] ?? null;
  },

  setVideoUrl(serviceKey: ServiceKey, moduleKey: string, url: string) {
    const d = load();
    const k = `${serviceKey}.${moduleKey}`;
    if (url.trim()) d.videos[k] = url.trim();
    else delete d.videos[k];
    save(d);
  },

  listAllVideos(): Record<string, string> {
    return { ...load().videos };
  },

  // --- Welcome video (global — one upload, shown to each new user on first login) ---
  getWelcomeVideo() {
    return load().welcomeVideo;
  },

  setWelcomeVideo(video: { fileName: string; fileUrl: string; mimeType: string } | null) {
    const d = load();
    d.welcomeVideo = video;
    save(d);
  },

  hasSeenWelcome(userId: string): boolean {
    return load().welcomedUsers.includes(userId);
  },

  markWelcomeSeen(userId: string) {
    const d = load();
    if (!d.welcomedUsers.includes(userId)) {
      d.welcomedUsers.push(userId);
      save(d);
    }
  },

  resetWelcomeForUser(userId: string) {
    const d = load();
    d.welcomedUsers = d.welcomedUsers.filter(id => id !== userId);
    save(d);
  },

  // --- Admin notes ---
  listAdminNotes(organizationId: string): AdminNote[] {
    return load().adminNotes
      .filter(n => n.organizationId === organizationId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  createAdminNote(input: { organizationId: string; authorId: string; body: string }): AdminNote {
    const d = load();
    const note: AdminNote = { ...input, id: uid(), createdAt: new Date().toISOString() };
    d.adminNotes.push(note);
    save(d);
    return note;
  },

  updateAdminNote(id: string, body: string) {
    const d = load();
    const n = d.adminNotes.find(x => x.id === id);
    if (!n) return;
    n.body = body;
    n.updatedAt = new Date().toISOString();
    save(d);
  },

  deleteAdminNote(id: string) {
    const d = load();
    d.adminNotes = d.adminNotes.filter(n => n.id !== id);
    save(d);
  },

  // --- Member management ---
  addMember(input: { organizationId: string; fullName: string; email: string; role: MemberRole }) {
    const d = load();
    const existing = d.profiles.find(p => p.email.toLowerCase() === input.email.toLowerCase());
    const now = new Date().toISOString();
    const userId = existing?.id ?? uid();
    if (!existing) {
      d.profiles.push({ id: userId, fullName: input.fullName, email: input.email, role: 'client' });
    }
    const member = d.organizationMembers.find(m => m.organizationId === input.organizationId && m.userId === userId);
    if (!member) {
      d.organizationMembers.push({ organizationId: input.organizationId, userId, role: input.role, invitedAt: now, acceptedAt: now });
      d.invitations.push({
        id: uid(), organizationId: input.organizationId, email: input.email, fullName: input.fullName,
        role: input.role, token: uid(),
        expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        acceptedAt: now, createdAt: now,
      });
      logActivityInto(d, {
        organizationId: input.organizationId, userId,
        action: 'member_joined', metadata: { email: input.email, fullName: input.fullName },
      });
    }
    save(d);
  },

  removeMember(organizationId: string, userId: string) {
    const d = load();
    d.organizationMembers = d.organizationMembers.filter(m => !(m.organizationId === organizationId && m.userId === userId));
    save(d);
  },

  setMemberRole(organizationId: string, userId: string, role: MemberRole) {
    const d = load();
    const m = d.organizationMembers.find(x => x.organizationId === organizationId && x.userId === userId);
    if (!m) return;
    m.role = role;
    save(d);
  },

  // --- Admin flags (per org) ---
  getAdminFlag(organizationId: string, flag: string): boolean {
    return !!load().adminFlags[organizationId]?.[flag];
  },

  setAdminFlag(organizationId: string, flag: string, value: boolean) {
    const d = load();
    d.adminFlags[organizationId] ||= {};
    d.adminFlags[organizationId][flag] = value;
    save(d);
  },

  getRetellNumber(organizationId: string): string | null {
    return load().retellNumbers[organizationId] ?? null;
  },

  setRetellNumber(organizationId: string, num: string | null) {
    const d = load();
    if (num && num.trim()) d.retellNumbers[organizationId] = num.trim();
    else delete d.retellNumbers[organizationId];
    save(d);
  },

  // --- Report views (per user/org last-seen) ---
  markReportsViewed(userId: string, organizationId: string) {
    const d = load();
    d.reportViews[`${userId}.${organizationId}`] = new Date().toISOString();
    save(d);
  },

  countUnreadReports(userId: string, organizationId: string): number {
    const d = load();
    const lastSeen = d.reportViews[`${userId}.${organizationId}`];
    const reports = d.reports.filter(r => r.organizationId === organizationId);
    if (!lastSeen) return reports.length;
    return reports.filter(r => r.createdAt > lastSeen).length;
  },

  // --- Activity log ---
  listActivityForOrg(organizationId: string, limit = 100): ActivityLogEntry[] {
    return load().activity
      .filter(a => a.organizationId === organizationId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  },

  listRecentActivityAcrossOrgs(limit = 50): ActivityLogEntry[] {
    return load().activity
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  },

  // --- Monthly reports ---
  listReportsForOrg(organizationId: string): MonthlyReport[] {
    return load().reports
      .filter(r => r.organizationId === organizationId)
      .sort((a, b) => (a.period < b.period ? 1 : -1));
  },

  getReport(id: string): MonthlyReport | null {
    return load().reports.find(r => r.id === id) ?? null;
  },

  createReport(input: Omit<MonthlyReport, 'id' | 'createdAt' | 'files'> & { files?: ReportFile[] }): MonthlyReport {
    const d = load();
    const report: MonthlyReport = {
      ...input,
      id: uid(),
      createdAt: new Date().toISOString(),
      files: input.files ?? [],
    };
    d.reports.push(report);
    logActivityInto(d, {
      organizationId: input.organizationId, userId: input.createdBy,
      action: 'report_published',
      metadata: { reportId: report.id, period: input.period, title: input.title },
    });
    save(d);
    return report;
  },

  updateReport(id: string, patch: Partial<Omit<MonthlyReport, 'id' | 'organizationId' | 'createdAt'>>) {
    const d = load();
    const r = d.reports.find(x => x.id === id);
    if (!r) return;
    Object.assign(r, patch);
    logActivityInto(d, {
      organizationId: r.organizationId,
      action: 'report_updated',
      metadata: { reportId: r.id, period: r.period, title: r.title },
    });
    save(d);
  },

  deleteReport(id: string) {
    const d = load();
    const r = d.reports.find(x => x.id === id);
    d.reports = d.reports.filter(r => r.id !== id);
    if (r) {
      logActivityInto(d, {
        organizationId: r.organizationId,
        action: 'report_deleted',
        metadata: { period: r.period, title: r.title },
      });
    }
    save(d);
  },

  addFileToReport(reportId: string, file: Omit<ReportFile, 'id'>) {
    const d = load();
    const r = d.reports.find(x => x.id === reportId);
    if (!r) return;
    r.files.push({ ...file, id: uid() });
    save(d);
  },

  removeFileFromReport(reportId: string, fileId: string) {
    const d = load();
    const r = d.reports.find(x => x.id === reportId);
    if (!r) return;
    r.files = r.files.filter(f => f.id !== fileId);
    save(d);
  },

  reset() { localStorage.removeItem(KEY); notify(); },
};
