import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Video, Sparkles, Mail, MessageCircle, Bell, FileBarChart2 } from 'lucide-react';
import { Sidebar, type SidebarSection } from './Sidebar';
import { CurriculumSidebar } from './CurriculumSidebar';
import { AiHelperChat } from './AiHelperChat';
import { ErrorBoundary } from './ErrorBoundary';
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

  const sections = buildSections({
    userRole: user?.role,
    orgSlug,
    onboardingDone,
    hasUnreadWhatsNew: user?.role === 'admin' ? hasUnreadChangelog() : false,
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

  const isClientInsideOnboarding = user.role === 'client' && org
    && (location.pathname.startsWith(`/onboarding/${org.slug}/services`));

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
        <main className="flex-1">
          <ErrorBoundary variant="inline" resetKey={location.pathname}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <AiHelperChat />
    </div>
  );
}

function buildSections({
  userRole, orgSlug, onboardingDone, hasUnreadWhatsNew,
}: {
  userRole: 'admin' | 'client' | undefined;
  orgSlug: string | null;
  onboardingDone: boolean;
  hasUnreadWhatsNew: boolean;
}): SidebarSection[] {
  if (userRole === 'admin') {
    return [
      {
        title: 'Operations',
        items: [
          { to: '/admin', label: 'Clients', icon: LayoutDashboard, end: true },
          { to: '/admin/clients/new', label: 'New client', icon: UserPlus },
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
  if (orgSlug) {
    const items = [
      { to: `/onboarding/${orgSlug}`, label: 'Onboarding', icon: LayoutDashboard, end: true },
    ];
    if (onboardingDone) {
      items.push({ to: `/onboarding/${orgSlug}/reports`, label: 'Monthly reports', icon: FileBarChart2, end: true });
    }
    return [{ items }];
  }

  return [];
}
