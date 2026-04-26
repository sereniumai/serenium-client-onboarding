import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Video, Sparkles, Mail, MessageCircle, Bell, BellRing, FileBarChart2, Home, LifeBuoy, ChevronLeft, PlayCircle, MessageCircleQuestion, TrendingUp, Activity } from 'lucide-react';
import { SELECTABLE_SERVICES, getService } from '../config/modules';
import { SERVICE_ICON } from '../config/serviceIcons';
import { Sidebar, type SidebarSection } from './Sidebar';
import { CurriculumSidebar } from './CurriculumSidebar';
import { AiHelperChat } from './AiHelperChat';
import { ErrorBoundary } from './ErrorBoundary';
import { ImpersonationBanner } from './ImpersonationBanner';
import { AdminBell } from './AdminBell';
import { WelcomeVideoModal, openWelcomeVideo } from './WelcomeVideoModal';
import { ReportsVideoModal, openReportsVideo } from './ReportsVideoModal';
import { useAuth } from '../auth/AuthContext';
import { useOrgsForUser } from '../hooks/useOrgs';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import { getOrgProgress } from '../lib/progress';
import { hasUnreadChangelog } from '../lib/changelog';
import { getWelcomeVideo, getReportsVideo } from '../lib/db/welcomeVideo';

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
  // "Live" is a hard manual flip by admin, distinct from onboardingDone (the
  // user just having filled in everything). Live clients land in reports
  // mode, Aria, the welcome video, and the multi-section sidebar all go
  // away in favour of a single Reports entry.
  const isLive = org?.status === 'live';

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

  const { data: reportsVideo } = useQuery({
    queryKey: ['reports_video'],
    queryFn: getReportsVideo,
    enabled: user?.role === 'client',
  });
  const hasReportsVideo = !!reportsVideo?.videoUrl;

  const sections = buildSections({
    userRole: user?.role,
    orgSlug,
    onboardingDone,
    isLive,
    hasUnreadWhatsNew: user?.role === 'admin' ? hasUnreadChangelog() : false,
    progress,
    editingMode: isClientInsideOnboarding,
    hasWelcomeVideo,
    hasReportsVideo,
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

  // Aria stays visible all the way through onboarding (even after the client
  // has hit 100% and is awaiting our review) and disappears only when the
  // account flips to live, at which point the experience pivots to reports.
  const showAiChat = user.role === 'admin' || !isLive;

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
        {user.role === 'admin' && (
          <div className="hidden md:flex justify-end px-6 pt-4">
            <AdminBell />
          </div>
        )}
        <main className="flex-1">
          <ErrorBoundary variant="inline" resetKey={location.pathname}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      {showAiChat && <AiHelperChat />}
      {user.role === 'client' && !isLive && <WelcomeVideoModal />}
      {user.role === 'client' && isLive && <ReportsVideoModal />}
    </div>
  );
}

function buildSections({
  userRole, orgSlug, onboardingDone, isLive, hasUnreadWhatsNew, progress, editingMode, hasWelcomeVideo, hasReportsVideo,
}: {
  userRole: 'admin' | 'client' | undefined;
  orgSlug: string | null;
  onboardingDone: boolean;
  isLive: boolean;
  hasUnreadWhatsNew: boolean;
  progress: ReturnType<typeof getOrgProgress> | null;
  editingMode: boolean;
  hasWelcomeVideo: boolean;
  hasReportsVideo: boolean;
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
          { to: '/admin/welcome-video', label: 'Client videos', icon: Sparkles },
          { to: '/admin/videos', label: 'Step videos', icon: Video },
        ],
      },
      {
        title: 'System',
        items: [
          { to: '/admin/notifications', label: 'Notifications', icon: BellRing },
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

  const enabledServiceKeys = progress?.enabledServices ?? [];

  // "Your Services" , services this client is paying for. Links to the same
  // service page as during onboarding; once live, that page renders read-only.
  // business_profile is foundational (everyone has it) so it sits here too.
  const yourServiceItems = SELECTABLE_SERVICES
    .filter(s => enabledServiceKeys.includes(s.key))
    .map(s => {
      const summaries = progress?.perService[s.key] ?? [];
      const completable = summaries.filter(x => x.canStart);
      const done = completable.filter(x => x.status === 'complete').length;
      const total = completable.length;
      const allDone = total > 0 && done === total;
      return {
        to: `/onboarding/${orgSlug}/services/${s.key}`,
        label: getService(s.key)?.label ?? s.key,
        icon: SERVICE_ICON[s.key] ?? Home,
        // During onboarding show progress; once live or all-done show a check.
        badge: isLive || allDone ? '✓' : (total > 0 ? `${done}/${total}` : undefined),
      };
    });

  // "More from Serenium" , services they haven't bought. business_profile is
  // shared infrastructure, never an upsell.
  const moreFromSereniumItems = SELECTABLE_SERVICES
    .filter(s => !enabledServiceKeys.includes(s.key) && s.key !== 'business_profile')
    .map(s => ({
      to: `/onboarding/${orgSlug}/learn/${s.key}`,
      label: getService(s.key)?.label ?? s.key,
      icon: SERVICE_ICON[s.key] ?? Home,
      muted: true,
    }));

  const overviewSection: SidebarSection = {
    title: 'Overview',
    items: [
      {
        to: `/onboarding/${orgSlug}`,
        label: 'Dashboard',
        icon: Home,
        end: true,
        badge: !isLive && !onboardingDone && progress ? `${progress.overall}%` : undefined,
      },
      ...(isLive
        ? [{ to: `/onboarding/${orgSlug}/reports`, label: 'Reports', icon: FileBarChart2 }]
        : []),
    ],
  };

  const supportSection: SidebarSection = {
    title: 'Support',
    items: [
      ...(!isLive ? [{ label: 'Ask Aria', icon: MessageCircleQuestion, onClick: openAiChat }] : []),
      ...(!isLive && hasWelcomeVideo
        ? [{ label: 'Welcome video', icon: PlayCircle, onClick: openWelcomeVideo }]
        : []),
      ...(isLive && hasReportsVideo
        ? [{ label: 'Reports walkthrough', icon: PlayCircle, onClick: openReportsVideo }]
        : []),
    ],
  };

  const sections: SidebarSection[] = [overviewSection];
  if (yourServiceItems.length > 0) {
    sections.push({ title: 'Your services', items: yourServiceItems });
  }
  if (moreFromSereniumItems.length > 0) {
    sections.push({ title: 'More from Serenium', items: moreFromSereniumItems });
  }
  if (supportSection.items.length > 0) {
    sections.push(supportSection);
  }
  // System status sits at the very bottom , quietly visible, never dominant.
  sections.push({
    items: [
      { to: `/onboarding/${orgSlug}/status`, label: 'System status', icon: Activity },
    ],
  });
  return sections;
}

function openAiChat() {
  // Fire a DOM event the AiHelperChat listens for. Defined in AiHelperChat.
  window.dispatchEvent(new CustomEvent('serenium:open-chat'));
}
