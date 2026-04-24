import type { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, FileBarChart2, LayoutDashboard, Volume2, VolumeX } from 'lucide-react';
import { soundsEnabled, setSoundsEnabled } from '../lib/soundFx';
import { Logo } from './Logo';
import { AiHelperChat } from './AiHelperChat';
import { AdminSubNav } from './AdminSubNav';
import { ErrorBoundary } from './ErrorBoundary';
import { useAuth } from '../auth/AuthContext';
import { useOrgsForUser } from '../hooks/useOrgs';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import { getOrgProgress } from '../lib/progress';
import { cn } from '../lib/cn';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sound, setSound] = useState(soundsEnabled());

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const homePath = user?.role === 'admin' ? '/admin' : '/';

  // Find the user's org (client side) to build nav links
  const userOrgs = useOrgsForUser(user && user.role === 'client' ? user.id : undefined);
  const org = userOrgs.data?.[0] ?? null;
  const orgSlug = org?.slug ?? null;
  const { snapshot } = useOrgSnapshot(org?.id);
  const progress = snapshot ? getOrgProgress(snapshot) : null;
  const onboardingDone = !!progress && progress.totalModules > 0 && progress.overall === 100;
  // Unread-reports badge will come back when reports are ported in Phase 7.
  const unreadReports = 0;

  const clientNavItems: Array<{ to: string; label: string; icon: typeof LayoutDashboard; active: boolean; badge?: number; dot?: boolean }> = [];
  if (orgSlug) {
    clientNavItems.push({
      to: `/onboarding/${orgSlug}`,
      label: 'Onboarding',
      icon: LayoutDashboard,
      active: location.pathname === `/onboarding/${orgSlug}` || location.pathname.startsWith(`/onboarding/${orgSlug}/services`),
    });
    if (onboardingDone) {
      clientNavItems.push({
        to: `/onboarding/${orgSlug}/reports`,
        label: 'Monthly reports',
        icon: FileBarChart2,
        active: location.pathname === `/onboarding/${orgSlug}/reports`,
        badge: unreadReports > 0 ? unreadReports : undefined,
        dot: unreadReports > 0,
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-bg/80 border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <Link to={homePath} className="flex items-center gap-3 shrink-0">
              <Logo />
            </Link>
            {clientNavItems.length > 0 && (
              <nav className="hidden md:flex items-center gap-1">
                {clientNavItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.to} to={item.to} className={cn(
                      'relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      item.active ? 'bg-bg-tertiary text-white' : 'text-white/60 hover:text-white hover:bg-bg-tertiary/60',
                    )}>
                      <Icon className="h-4 w-4" /> {item.label}
                      {item.badge !== undefined && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange text-white text-[10px] font-bold tabular-nums">{item.badge}</span>
                      )}
                      {item.dot && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange" />
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {user && (
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-white leading-tight">{user.fullName}</p>
                <p className="text-xs text-white/50 truncate max-w-[180px]">{user.email}</p>
              </div>
            )}
            <button
              onClick={() => { const next = !sound; setSoundsEnabled(next); setSound(next); }}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-white/50 hover:text-white hover:bg-bg-tertiary transition-colors"
              title={sound ? 'Sound effects on' : 'Sound effects off'}
              aria-label="Toggle sound effects"
            >
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-bg-tertiary transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {clientNavItems.length > 0 && (
          <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
            {clientNavItems.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap',
                  item.active ? 'bg-bg-tertiary text-white' : 'text-white/60 hover:text-white',
                )}>
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                  {item.badge !== undefined && <span className="px-1.5 rounded-full bg-orange/20 text-orange text-[10px] font-bold">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {user?.role === 'admin' && location.pathname.startsWith('/admin') && <AdminSubNav />}

      <main className="flex-1">
        <ErrorBoundary variant="inline" resetKey={location.pathname}>
          {children}
        </ErrorBoundary>
      </main>
      <AppFooter isClient={user?.role === 'client'} onboardingDone={onboardingDone} />
      <AiHelperChat />
    </div>
  );
}

function AppFooter({ isClient, onboardingDone }: { isClient: boolean; onboardingDone: boolean }) {
  const tagline = !isClient
    ? 'Built for the Serenium team.'
    : onboardingDone
      ? 'You\'re live. Welcome to a new era of roofing marketing.'
      : 'You\'ve joined a new era of roofing marketing.';

  return (
    <footer className="mt-8 border-t border-border-subtle bg-bg/60">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
        <p>{tagline}</p>
        <div className="flex items-center gap-2">
          <span>Powered by</span>
          <Logo className="h-4 w-auto opacity-60" />
          <span className="text-white/30">· © {new Date().getFullYear()} Serenium AI</span>
        </div>
      </div>
    </footer>
  );
}
