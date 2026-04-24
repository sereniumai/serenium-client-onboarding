import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Video, Sparkles, Mail, MessageCircle, Bell, FileBarChart2, Home, Briefcase, Globe, Bot, LifeBuoy, ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PHASES } from '../config/phases';
import { Sidebar, type SidebarSection } from './Sidebar';
import { CurriculumSidebar } from './CurriculumSidebar';
import { AiHelperChat } from './AiHelperChat';
import { ErrorBoundary } from './ErrorBoundary';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useAuth } from '../auth/AuthContext';
import { useOrgsForUser } from '../hooks/useOrgs';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import { getOrgProgress } from '../lib/progress';
import { hasUnreadChangelog } from '../pages/admin/ChangelogPage';

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

  const sections = buildSections({
    userRole: user?.role,
    orgSlug,
    onboardingDone,
    hasUnreadWhatsNew: user?.role === 'admin' ? hasUnreadChangelog() : false,
    progress,
    editingMode: isClientInsideOnboarding,
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
    </div>
  );
}

const PHASE_ICON: Record<string, LucideIcon> = {
  business: Briefcase,
  presence: Globe,
  agents:   Bot,
};

function buildSections({
  userRole, orgSlug, onboardingDone, hasUnreadWhatsNew, progress, editingMode,
}: {
  userRole: 'admin' | 'client' | undefined;
  orgSlug: string | null;
  onboardingDone: boolean;
  hasUnreadWhatsNew: boolean;
  progress: ReturnType<typeof getOrgProgress> | null;
  editingMode: boolean;
}): SidebarSection[] {
  if (userRole === 'admin') {
    return [
      {
        title: 'Operations',
        items: [
          { to: '/admin', label: 'Clients', icon: LayoutDashboard, end: true },
        ],
      },
      {
        title: 'Content',
        items: [
          { to: '/admin/videos', label: 'Step videos', icon: Video },
          { to: '/admin/welcome-video', label: 'Welcome video', icon: Sparkles },
        ],
      },
      {
        title: 'Communication',
        items: [
          { to: '/admin/ai-conversations', label: 'AI chats', icon: MessageCircle },
          { to: '/admin/settings/followups', label: 'Follow-ups', icon: Mail },
        ],
      },
      {
        items: [
          { to: '/admin/whats-new', label: "What's new", icon: Bell, dot: hasUnreadWhatsNew },
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
          { to: `/onboarding/${orgSlug}`, label: 'Ask Rob or Adam', icon: LifeBuoy, onClick: openAiChat },
        ],
      },
    ];
  }

  // During onboarding, show a phase-aware nav
  const phaseItems = PHASES.map(phase => {
    const phaseSummaries = progress
      ? phase.services.flatMap(k => progress.perService[k] ?? [])
      : [];
    const visibleSummaries = phaseSummaries;
    const done = visibleSummaries.filter(s => s.status === 'complete').length;
    const total = visibleSummaries.length;
    return {
      to: `/onboarding/${orgSlug}#phase-${phase.key}`,
      label: phaseLabel(phase.key),
      icon: PHASE_ICON[phase.key] ?? Home,
      badge: total > 0 ? `${done}/${total}` : undefined,
      skip: total === 0,
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
        ...phaseItems.filter(p => !p.skip).map(({ skip, ...rest }) => { void skip; return rest; }),
      ],
    },
    {
      title: 'Support',
      items: [
        { to: `/onboarding/${orgSlug}`, label: 'Ask Rob or Adam', icon: LifeBuoy, onClick: openAiChat },
      ],
    },
  ];
}

function phaseLabel(key: string): string {
  switch (key) {
    case 'business': return 'Your business';
    case 'presence': return 'Online presence';
    case 'agents':   return 'AI team';
    default: return key;
  }
}

function openAiChat() {
  // Fire a DOM event the AiHelperChat listens for. Defined in AiHelperChat.
  window.dispatchEvent(new CustomEvent('serenium:open-chat'));
}
