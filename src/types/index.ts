export type ServiceKey = 'business_profile' | 'facebook_ads' | 'ai_sms' | 'ai_receptionist' | 'website';

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

export interface Organization {
  id: string;
  slug: string;
  businessName: string;
  logoUrl?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  status: OrgStatus;
  goLiveDate?: string;
  createdAt: string;
}

export interface OrganizationService {
  organizationId: string;
  serviceKey: ServiceKey;
  enabled: boolean;
  enabledAt: string;
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
  fileUrl: string;
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
  | 'member_joined';

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
