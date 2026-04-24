export type ServiceKey = 'business_profile' | 'facebook_ads' | 'google_ads' | 'google_business_profile' | 'ai_sms' | 'ai_receptionist' | 'website';

export type UserRole = 'client' | 'admin';
export type MemberRole = 'owner' | 'member';
export type OrgStatus = 'onboarding' | 'live' | 'paused' | 'churned';
export type ModuleStatus = 'not_started' | 'in_progress' | 'complete';

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export type OrgPlan = 'starter' | 'pro' | 'custom';

export interface Organization {
  id: string;
  slug: string;
  businessName: string;
  logoUrl?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  status: OrgStatus;
  plan?: OrgPlan;               // optional, displayed in admin for filtering/billing context
  tags?: string[];              // free-form admin labels ("VIP", "Q1-cohort", etc.)
  goLiveDate?: string;
  createdAt: string;
}

export interface OrganizationService {
  organizationId: string;
  serviceKey: ServiceKey;
  enabled: boolean;
  enabledAt: string;
  /**
   * Display order on the client's dashboard (ascending). Admin can reorder.
   * Fall back to insertion order if two rows share the same value.
   */
  displayOrder: number;
  /**
   * Module keys explicitly HIDDEN from this client. Undefined/empty = all modules visible.
   * Using an opt-out list so new modules added later are auto-included.
   */
  disabledModuleKeys?: string[];
  /**
   * Field keys HIDDEN within otherwise-enabled modules. Format: "moduleKey.fieldKey".
   * Lets admin toggle individual fields inside a multi-field module.
   */
  disabledFieldKeys?: string[];
}

export interface OrganizationMember {
  organizationId: string;
  userId: string;
  role: MemberRole;
  invitedAt: string;
  acceptedAt?: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  fullName?: string;
  role: MemberRole;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface ModuleProgress {
  organizationId: string;
  serviceKey: ServiceKey;
  moduleKey: string;
  status: ModuleStatus;
  completedAt?: string;
  completedBy?: string;
}

export interface TaskCompletion {
  organizationId: string;
  taskKey: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface Submission {
  organizationId: string;
  fieldKey: string;
  value: unknown;
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminNote {
  id: string;
  organizationId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Upload {
  id: string;
  organizationId: string;
  category: string;
  fileName: string;
  /** Legacy: direct URL / data URL (used during localStorage era). Set to '' for Supabase-backed uploads. */
  fileUrl: string;
  /** Supabase Storage path, format: orgs/{orgId}/{uuid}-{filename}. Empty during localStorage era. */
  storagePath?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface ReportFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export type ActivityAction =
  | 'step_completed'
  | 'step_reopened'
  | 'file_uploaded'
  | 'field_submitted'
  | 'report_published'
  | 'report_updated'
  | 'report_deleted'
  | 'service_enabled'
  | 'service_disabled'
  | 'member_joined'
  | 'followup_sent'
  | 'help_requested';

export interface ActivityLogEntry {
  id: string;
  organizationId: string;
  userId?: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  organizationId: string;
  period: string;        // YYYY-MM e.g. "2026-04"
  title: string;
  summary?: string;
  loomUrl?: string;
  highlights?: string[]; // quick stat bullets
  files: ReportFile[];
  createdAt: string;
  createdBy?: string;
}

// --- Follow-up (chase) emails ---
export interface FollowupTemplate {
  key: string;
  label: string;
  subject: string;
  body: string;                   // supports {{firstName}}, {{businessName}}, {{portalUrl}}
  autoSendAfterDays: number | null;
  autoSendEnabled: boolean;
}

export interface FollowupSettings {
  enabled: boolean;
  notifyAdmins: string[];
  templates: FollowupTemplate[];
}

export interface FollowupSent {
  id: string;
  organizationId: string;
  templateKey: string;
  subject: string;
  body: string;
  sentAt: string;
  sentBy: string | null;
  mode: 'manual' | 'auto';
}

// --- AI helper chat ---
export interface AiChatMessage {
  id: string;
  userId: string;
  organizationId: string | null;
  role: 'user' | 'assistant';
  content: string;
  context: string | null;         // e.g. "website.domain_access" when sent from a specific step
  createdAt: string;
}

// --- Analytics mode: PDF reports uploaded to the chat ---
export interface AnalyticsUpload {
  id: string;
  userId: string;
  organizationId: string | null;
  fileName: string;
  /** base64-encoded file bytes (no data URL prefix). */
  fileData: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}
