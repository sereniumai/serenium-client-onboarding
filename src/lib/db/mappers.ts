/**
 * Mappers between Postgres rows (snake_case) and app-facing types (camelCase).
 *
 * Keep the app-facing types in src/types/index.ts and the DB types in
 * src/types/database.ts. These mappers are the single boundary between them.
 */
import type { Database } from '../../types/database';
import type {
  Profile, Organization, OrganizationMember, OrganizationService,
  ModuleProgress, TaskCompletion, Submission, Upload, Invitation,
  MonthlyReport, ActivityLogEntry, AdminNote, AiChatMessage, FollowupSent,
} from '../../types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export const toProfile = (r: Row<'profiles'>): Profile => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  role: r.role,
  avatarUrl: r.avatar_url ?? undefined,
});

export const toOrganization = (r: Row<'organizations'>): Organization => ({
  id: r.id,
  slug: r.slug,
  businessName: r.business_name,
  logoUrl: r.logo_url ?? undefined,
  primaryContactName: r.primary_contact_name ?? undefined,
  primaryContactEmail: r.primary_contact_email ?? undefined,
  primaryContactPhone: r.primary_contact_phone ?? undefined,
  status: r.status,
  plan: r.plan ?? undefined,
  tags: r.tags ?? [],
  goLiveDate: r.go_live_date ?? undefined,
  createdAt: r.created_at,
});

export const toOrganizationMember = (r: Row<'organization_members'>): OrganizationMember => ({
  organizationId: r.organization_id,
  userId: r.user_id,
  role: r.role,
  invitedAt: r.invited_at,
  acceptedAt: r.accepted_at ?? undefined,
});

export const toOrganizationService = (r: Row<'organization_services'> & { display_order?: number }): OrganizationService => ({
  organizationId: r.organization_id,
  serviceKey: r.service_key as OrganizationService['serviceKey'],
  enabled: r.enabled,
  enabledAt: r.enabled_at,
  displayOrder: r.display_order ?? 0,
  disabledModuleKeys: r.disabled_module_keys ?? [],
  disabledFieldKeys: r.disabled_field_keys ?? [],
});

export const toModuleProgress = (r: Row<'module_progress'>): ModuleProgress => ({
  organizationId: r.organization_id,
  serviceKey: r.service_key as ModuleProgress['serviceKey'],
  moduleKey: r.module_key,
  status: r.status,
  completedAt: r.completed_at ?? undefined,
  completedBy: r.completed_by ?? undefined,
});

export const toTaskCompletion = (r: Row<'task_completions'>): TaskCompletion => ({
  organizationId: r.organization_id,
  taskKey: r.task_key,
  completed: r.completed,
  completedAt: r.completed_at ?? undefined,
  completedBy: r.completed_by ?? undefined,
});

export const toSubmission = (r: Row<'submissions'>): Submission => ({
  organizationId: r.organization_id,
  fieldKey: r.field_key,
  value: r.value,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by ?? undefined,
});

export const toUpload = (r: Row<'uploads'>): Upload => ({
  id: r.id,
  organizationId: r.organization_id,
  category: r.category,
  fileName: r.file_name,
  fileUrl: '',                // Resolved on-demand via getUploadSignedUrl()
  storagePath: r.storage_path,
  fileSize: r.file_size,
  mimeType: r.mime_type,
  uploadedAt: r.uploaded_at,
  uploadedBy: r.uploaded_by ?? undefined,
});

export const toInvitation = (r: Row<'invitations'>): Invitation => ({
  id: r.id,
  organizationId: r.organization_id,
  email: r.email,
  fullName: r.full_name ?? undefined,
  role: r.role,
  token: r.token,
  expiresAt: r.expires_at,
  acceptedAt: r.accepted_at ?? undefined,
  createdAt: r.created_at,
});

export const toMonthlyReport = (r: Row<'monthly_reports'>): MonthlyReport => ({
  id: r.id,
  organizationId: r.organization_id,
  period: r.period,
  title: r.title,
  summary: r.summary ?? undefined,
  loomUrl: r.loom_url ?? undefined,
  highlights: r.highlights ?? [],
  files: ((r.files ?? []) as unknown) as MonthlyReport['files'],
  createdAt: r.created_at,
  createdBy: r.created_by ?? undefined,
});

export const toActivityLog = (r: Row<'activity_log'>): ActivityLogEntry => ({
  id: r.id,
  organizationId: r.organization_id,
  userId: r.user_id ?? undefined,
  action: r.action,
  metadata: r.metadata,
  createdAt: r.created_at,
});

export const toAdminNote = (r: Row<'admin_notes'>): AdminNote => ({
  id: r.id,
  organizationId: r.organization_id,
  authorId: r.author_id,
  body: r.body,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? undefined,
});

export const toFollowupSent = (r: Row<'followups_sent'>): FollowupSent => ({
  id: r.id,
  organizationId: r.organization_id,
  templateKey: r.template_key,
  subject: r.subject,
  body: r.body,
  sentAt: r.sent_at,
  sentBy: r.sent_by,
  mode: r.mode,
});

export const toAiChatMessage = (r: Row<'ai_chat_messages'>): AiChatMessage => ({
  id: r.id,
  userId: r.user_id,
  organizationId: r.organization_id,
  role: r.role,
  content: r.content,
  context: r.context,
  createdAt: r.created_at,
});
