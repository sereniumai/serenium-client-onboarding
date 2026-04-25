import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Video, Sparkles, Mail, MessageCircle, Bell, FileBarChart2, Home, LifeBuoy, ChevronLeft, PlayCircle, MessageCircleQuestion, TrendingUp } from 'lucide-react';
import { SELECTABLE_SERVICES, getService } from '../config/modules';
import { SERVICE_ICON } from '../config/serviceIcons';
import { Sidebar, type SidebarSection } from './Sidebar';
import { CurriculumSidebar } from './CurriculumSidebar';
import { AiHelperChat } from './AiHelperChat';
import { ErrorBoundary } from './ErrorBoundary';
import { ImpersonationBanner } from './ImpersonationBanner';
import { WelcomeVideoModal, openWelcomeVideo } from './WelcomeVideoModal';
import { useAuth } from '../auth/AuthContext';
import { useOrgsForUser } from '../hooks/useOrgs';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import { getOrgProgress } from '../lib/progress';
import { hasUnreadChangelog } from '../lib/changelog';
import { getWelcomeVideo } from '../lib/db/welcomeVideo';

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  // Client context (only populated for client role)
  const userOrgs = useOrgsForUser(user && user.role === 'client' ? user.id : undefined);
  const org = userOrgs.data?.[0] ?? null;
  const orgSlug = org?.slug ?? null;
  const { snapshot } = useOrgSnapshot(org?.id);
  const progress = snapshot ? getOrgProgress(snapshot) : null;
  const onboardingDone = !!progress && progress.totalModules > 0 && progress.overall === 100;

  const isClientInsideOnboarding = !!(user?.role === 'client' && org
    && location.pathname.startsWith(`/onboarding/${org.slug}/services`));

  // Fetch whether a welcome video is set - drives a "Welcome video" sidebar
  // entry for clients. Cached with the same queryKey as the modal so both
  // share one request.
  const { data: welcomeVideo } = useQuery({
    queryKey: ['welcome_video'],
    queryFn: getWelcomeVideo,
    enabled: user?.role === 'client',
  });
  const hasWelcomeVideo = !!welcomeVideo?.videoUrl;

  const sections = buildSections({
    userRole: user?.role,
    orgSlug,
    onboardingDone,
    hasUnreadWhatsNew: user?.role === 'admin' ? hasUnreadChangelog() : false,
    progress,
    editingMode: isClientInsideOnboarding,
    hasWelcomeVideo,
  });

  // Auth / public routes render without the shell chrome
  const isPublicRoute = location.pathname.startsWith('/login')
    || location.pathname.startsWith('/register')
    || location.pathname.startsWith('/forgot-password')
    || location.pathname.startsWith('/reset-password');

  if (isPublicRoute || !user) {
    return (
      <div className="min-h-screen">
        <main>
          <ErrorBoundary variant="inline" resetKey={location.pathname}>
            {children}
          </ErrorBoundary>
        </main>
        <AiHelperChat />
      </div>
    );
  }

  // AI chat is only for active onboarding. Hide it once the client's onboarding is done.
  const showAiChat = user.role === 'admin' || !onboardingDone;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar sections={sections}>
        {isClientInsideOnboarding && org && (
          <div className="pt-4 mt-4 border-t border-border-subtle">
            <CurriculumSidebar organizationId={org.id} orgSlug={org.slug} />
          </div>
        )}
      </Sidebar>
      <div className="flex-1 md:ml-[260px] min-w-0 flex flex-col">
        <ImpersonationBanner />
        <main className="flex-1">
          <ErrorBoundary variant="inline" resetKey={location.pathname}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      {showAiChat && <AiHelperChat />}
      {user.role === 'client' && <WelcomeVideoModal />}
    </div>
  );
}

function buildSections({
  userRole, orgSlug, onboardingDone, hasUnreadWhatsNew, progress, editingMode, hasWelcomeVideo,
}: {
  userRole: 'admin' | 'client' | undefined;
  orgSlug: string | null;
  onboardingDone: boolean;
  hasUnreadWhatsNew: boolean;
  progress: ReturnType<typeof getOrgProgress> | null;
  editingMode: boolean;
  hasWelcomeVideo: boolean;
}): SidebarSection[] {
  if (userRole === 'admin') {
    return [
      {
        title: 'Clients',
        items: [
          { to: '/admin', label: 'All clients', icon: LayoutDashboard, end: true },
        ],
      },
      {
        title: 'Business',
        items: [
          { to: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
        ],
      },
      {
        title: 'Conversations',
        items: [
          { to: '/admin/ai-conversations', label: 'AI chats', icon: MessageCircle },
          { to: '/admin/settings/followups', label: 'Follow-ups', icon: Mail },
        ],
      },
      {
        title: 'Content',
        items: [
          { to: '/admin/welcome-video', label: 'Welcome video', icon: Sparkles },
          { to: '/admin/videos', label: 'Step videos', icon: Video },
        ],
      },
      {
        title: 'System',
        items: [
          { to: '/admin/whats-new', label: "What's new", icon: Bell, dot: hasUnreadWhatsNew },
          { to: '/admin/diagnostics', label: 'System health', icon: LifeBuoy },
        ],
      },
    ];
  }

  // Client nav
  if (!orgSlug) return [];

  // Editing mode, client is inside a service/module page. Collapse nav to a
  // single 'Back to dashboard' link. The curriculum tree (rendered as a child
  // of Sidebar via AppShell) lives below for jumping between modules.
  if (editingMode) {
    return [
      {
        items: [
          { to: `/onboarding/${orgSlug}`, label: 'Back to dashboard', icon: ChevronLeft, end: true },
        ],
      },
    ];
  }

  if (onboardingDone) {
    return [
      {
        title: 'Overview',
        items: [
          { to: `/onboarding/${orgSlug}`, label: 'Dashboard', icon: Home, end: true },
        ],
      },
      {
        title: 'Results',
        items: [
          { to: `/onboarding/${orgSlug}/reports`, label: 'Monthly reports', icon: FileBarChart2, end: true },
        ],
      },
      {
        title: 'Support',
        items: [
          { label: 'Ask Aria', icon: MessageCircleQuestion, onClick: openAiChat },
          ...(hasWelcomeVideo
            ? [{ label: 'Welcome video', icon: PlayCircle, onClick: openWelcomeVideo }]
            : []),
        ],
      },
    ];
  }

  // During onboarding, list each enabled service directly. No phase grouping, no
  // module-level detail - clean and clickable.
  const enabledServiceKeys = progress?.enabledServices ?? [];
  const serviceItems = SELECTABLE_SERVICES
    .filter(s => enabledServiceKeys.includes(s.key))
    .map(s => {
      const summaries = progress?.perService[s.key] ?? [];
      const done = summaries.filter(x => x.status === 'complete').length;
      const total = summaries.length;
      return {
        to: `/onboarding/${orgSlug}/services/${s.key}`,
        label: getService(s.key)?.label ?? s.key,
        icon: SERVICE_ICON[s.key] ?? Home,
        badge: total > 0 ? `${done}/${total}` : undefined,
      };
    });

  return [
    {
      title: 'Your onboarding',
      items: [
        {
          to: `/onboarding/${orgSlug}`,
          label: 'Overview',
          icon: Home,
          end: true,
          badge: progress ? `${progress.overall}%` : undefined,
        },
        ...serviceItems,
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Ask Aria', icon: MessageCircleQuestion, onClick: openAiChat },
        ...(hasWelcomeVideo
          ? [{ label: 'Welcome video', icon: PlayCircle, onClick: openWelcomeVideo }]
          : []),
      ],
    },
  ];
}

function openAiChat() {
  // Fire a DOM event the AiHelperChat listens for. Defined in AiHelperChat.
  window.dispatchEvent(new CustomEvent('serenium:open-chat'));
}
