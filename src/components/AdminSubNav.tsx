import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Video, Sparkles, Mail, MessageCircle, Bell } from 'lucide-react';
import { cn } from '../lib/cn';
import { hasUnreadChangelog } from '../lib/changelog';

const ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/clients/new', label: 'New client', icon: UserPlus, end: false },
  { to: '/admin/videos', label: 'Step videos', icon: Video, end: false },
  { to: '/admin/welcome-video', label: 'Welcome video', icon: Sparkles, end: false },
  { to: '/admin/ai-conversations', label: 'AI chats', icon: MessageCircle, end: false },
  { to: '/admin/settings/followups', label: 'Follow-ups', icon: Mail, end: false },
];

export function AdminSubNav() {
  const location = useLocation();
  // Read the unread flag on every route change - hasUnreadChangelog is a
  // plain localStorage read, no need for state+effect round trip.
  const unread = useMemo(() => hasUnreadChangelog(), [location.pathname]);

  return (
    <div className="bg-bg/60 border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-2 flex items-center gap-1 overflow-x-auto">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-orange/15 text-orange border border-orange/30'
                : 'text-white/60 hover:text-white hover:bg-bg-tertiary/60 border border-transparent'
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}

        <div className="ml-auto">
          <NavLink
            to="/admin/whats-new"
            className={({ isActive }) => cn(
              'relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-orange/15 text-orange border border-orange/30'
                : 'text-white/60 hover:text-white hover:bg-bg-tertiary/60 border border-transparent'
            )}
          >
            <Bell className="h-4 w-4" /> What's new
            {unread && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange" />
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </div>
  );
}
