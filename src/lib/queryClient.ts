import { QueryClient } from '@tanstack/react-query';

/**
 * Single QueryClient for the whole app. Tuned for a form-heavy portal where
 * data changes are infrequent but we want snappy UX.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: unknown) => {
        const msg = (error as { message?: string })?.message ?? '';
        if (msg.includes('JWT') || msg.includes('401')) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Query key factory, prevents typo drift across hooks and lets us invalidate
 * by prefix (e.g. qk.org(orgId) invalidates every sub-query for that org).
 */
export const qk = {
  me: () => ['me'] as const,
  profile: (userId: string) => ['profile', userId] as const,

  orgs: () => ['orgs'] as const,
  org: (idOrSlug: string) => ['org', idOrSlug] as const,
  orgMembers: (orgId: string) => ['org', orgId, 'members'] as const,
  orgServices: (orgId: string) => ['org', orgId, 'services'] as const,
  orgProgress: (orgId: string) => ['org', orgId, 'progress'] as const,

  submissions: (orgId: string) => ['org', orgId, 'submissions'] as const,
  moduleProgress: (orgId: string) => ['org', orgId, 'module-progress'] as const,
  taskCompletions: (orgId: string) => ['org', orgId, 'task-completions'] as const,
  uploads: (orgId: string, category?: string) =>
    category ? ['org', orgId, 'uploads', category] as const : ['org', orgId, 'uploads'] as const,

  adminFlags: (orgId: string) => ['org', orgId, 'flags'] as const,
  retellNumber: (orgId: string) => ['org', orgId, 'retell'] as const,
  adminNotes: (orgId: string) => ['org', orgId, 'notes'] as const,
  activity: (orgId: string) => ['org', orgId, 'activity'] as const,

  reports: (orgId: string) => ['org', orgId, 'reports'] as const,
  reportViews: (userId: string, orgId: string) => ['report-views', userId, orgId] as const,

  stepVideos: () => ['step-videos'] as const,
  welcomeVideo: () => ['welcome-video'] as const,
  welcomed: (userId: string) => ['welcomed', userId] as const,

  followupSettings: () => ['followup-settings'] as const,
  followupsSent: (orgId: string) => ['org', orgId, 'followups-sent'] as const,

  aiMessages: (userId: string, orgId: string | null) =>
    ['ai-messages', userId, orgId ?? 'none'] as const,

  invitations: (orgId: string) => ['org', orgId, 'invitations'] as const,
};
