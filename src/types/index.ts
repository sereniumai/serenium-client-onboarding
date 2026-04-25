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
export type LeadSource = 'referral' | 'facebook_ad' | 'cold_outbound' | 'website' | 'other' | 'unsure';

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
  liveAt?: string;              // timestamp set when status flips to 'live'
  churnedAt?: string;           // timestamp set when status flips to 'churned'
  leadSource?: LeadSource;
  createdAt: string;
}

// --- Revenue ---
export type RevenueType = 'one_time' | 'monthly';

export interface RevenueLine {
  id: string;
  organizationId: string;
  serviceKey: ServiceKey;
  type: RevenueType;
  amountCents: number;
  currency: string;
  startedAt: string;            // ISO date (yyyy-mm-dd)
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface BusinessGoal {
  id: string;
  targetMrrCents: number;
  targetDate: string;           // ISO date
  updatedAt: string;
  updatedBy: string | null;
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
  /** Supabase Storage path, under `reports/{orgId}/{reportId}/...`. Rendered via signed URLs. */
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  /** Optional admin note explaining what the file is. Rendered to the client under the filename. */
  description?: string;
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
  | 'help_requested'
  // Admin audit actions, require migration 20260424000005_admin_audit.
  | 'admin_invitation_sent'
  | 'admin_viewed_as_client'
  | 'admin_marked_live'
  | 'admin_enabled_module'
  | 'admin_disabled_module'
  | 'admin_enabled_service'
  | 'admin_disabled_service'
  | 'admin_note_added'
  | 'admin_note_updated'
  | 'admin_note_deleted'
  | 'admin_config_changed'
  | 'admin_client_deleted';

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
export interface AiChatThread {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  threadId: string;
  userId: string;
  organizationId: string | null;
  role: 'user' | 'assistant';
  content: string;
  context: string | null;         // e.g. "website.domain_access" when sent from a specific step
  createdAt: string;
}

// --- Aria escalations: questions Aria flagged to the Serenium team ---
export interface AriaEscalation {
  id: string;
  organizationId: string;
  userId: string;
  threadId: string | null;
  question: string;
  contextSnippet: string | null;
  pageContext: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
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
