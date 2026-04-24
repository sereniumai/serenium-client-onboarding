/**
 * Database schema types, mirrors supabase/migrations/*.sql exactly.
 *
 * Hand-rolled (instead of generated via `supabase gen types`) so we control
 * what's exported. If you change a migration, update this file in the same PR.
 *
 * Naming: Row = SELECT shape, Insert = INSERT shape (nullable defaults), Update = partial.
 */

export type OrgStatus   = 'onboarding' | 'live' | 'paused' | 'churned';
export type OrgPlan     = 'starter' | 'pro' | 'custom';
export type MemberRole  = 'owner' | 'member';
export type ModuleStatusEnum = 'not_started' | 'in_progress' | 'complete';
export type UserRole    = 'admin' | 'client';
export type ActivityAction =
  | 'step_completed' | 'step_reopened' | 'file_uploaded' | 'field_submitted'
  | 'report_published' | 'report_updated' | 'report_deleted'
  | 'service_enabled' | 'service_disabled' | 'member_joined' | 'followup_sent';
export type FollowupMode = 'manual' | 'auto';
export type ChatRole     = 'user' | 'assistant';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

interface Organization {
  id: string;
  slug: string;
  business_name: string;
  logo_url: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  status: OrgStatus;
  plan: OrgPlan | null;
  tags: string[];
  go_live_date: string | null;
  created_at: string;
}

interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: MemberRole;
  invited_at: string;
  accepted_at: string | null;
}

interface OrganizationService {
  organization_id: string;
  service_key: string;
  enabled: boolean;
  enabled_at: string;
  disabled_module_keys: string[];
  disabled_field_keys: string[];
}

interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface ModuleProgress {
  organization_id: string;
  service_key: string;
  module_key: string;
  status: ModuleStatusEnum;
  completed_at: string | null;
  completed_by: string | null;
}

interface TaskCompletion {
  organization_id: string;
  task_key: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

interface Submission {
  organization_id: string;
  field_key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

interface Upload {
  id: string;
  organization_id: string;
  category: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: string | null;
}

interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AdminNote {
  id: string;
  organization_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
}

interface MonthlyReport {
  id: string;
  organization_id: string;
  period: string;
  title: string;
  summary: string | null;
  loom_url: string | null;
  highlights: string[];
  files: Array<{ file_name: string; url: string }>;
  created_at: string;
  created_by: string | null;
}

interface ReportView {
  user_id: string;
  organization_id: string;
  last_seen_at: string;
}

interface StepVideo {
  service_key: string;
  module_key: string;
  url: string;
  updated_at: string;
}

interface WelcomeVideo {
  id: number;
  file_name: string | null;
  storage_path: string | null;
  mime_type: string | null;
  updated_at: string;
}

interface WelcomedUser {
  user_id: string;
  seen_at: string;
}

interface AdminFlag {
  organization_id: string;
  flag_key: string;
  value: boolean;
}

interface RetellNumber {
  organization_id: string;
  phone_number: string;
  updated_at: string;
}

interface FollowupSettingsRow {
  id: number;
  settings: {
    enabled: boolean;
    notifyAdmins: string[];
    templates: Array<{
      key: string;
      label: string;
      subject: string;
      body: string;
      autoSendAfterDays: number;
      autoSendEnabled: boolean;
    }>;
  };
}

interface FollowupSentRow {
  id: string;
  organization_id: string;
  template_key: string;
  subject: string;
  body: string;
  sent_at: string;
  sent_by: string | null;
  mode: FollowupMode;
}

interface AiChatMessage {
  id: string;
  user_id: string;
  organization_id: string | null;
  role: ChatRole;
  content: string;
  context: string | null;
  created_at: string;
}

interface TeamNotificationSent {
  id: string;
  organization_id: string;
  event_key: string;
  sent_at: string;
}

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
};

export interface Database {
  public: {
    Tables: {
      profiles:                Table<Profile>;
      organizations:           Table<Organization>;
      organization_members:    Table<OrganizationMember>;
      organization_services:   Table<OrganizationService>;
      invitations:             Table<Invitation>;
      module_progress:         Table<ModuleProgress>;
      task_completions:        Table<TaskCompletion>;
      submissions:             Table<Submission>;
      uploads:                 Table<Upload>;
      activity_log:            Table<ActivityLog>;
      admin_notes:             Table<AdminNote>;
      monthly_reports:         Table<MonthlyReport>;
      report_views:            Table<ReportView>;
      step_videos:             Table<StepVideo>;
      welcome_video:           Table<WelcomeVideo>;
      welcomed_users:          Table<WelcomedUser>;
      admin_flags:             Table<AdminFlag>;
      retell_numbers:          Table<RetellNumber>;
      followup_settings:       Table<FollowupSettingsRow>;
      followups_sent:          Table<FollowupSentRow>;
      ai_chat_messages:        Table<AiChatMessage>;
      team_notifications_sent: Table<TeamNotificationSent>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_org_member: { Args: { org_id: string }; Returns: boolean };
    };
    Enums: {
      org_status: OrgStatus;
      org_plan: OrgPlan;
      member_role: MemberRole;
      module_status: ModuleStatusEnum;
      user_role: UserRole;
      activity_action: ActivityAction;
      followup_mode: FollowupMode;
      chat_role: ChatRole;
    };
  };
}
