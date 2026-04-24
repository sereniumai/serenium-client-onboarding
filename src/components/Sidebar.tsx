import { type ReactNode, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Volume2, VolumeX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from './Logo';
import { soundsEnabled, setSoundsEnabled } from '../lib/soundFx';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';

export interface SidebarNavItem {
  to?: string;
  onClick?: () => void;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number | string;
  dot?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarNavItem[];
}

/**
 * Shared left-sidebar layout for admin + client portals. Collapses to a
 * hamburger + slide-in panel on mobile, persistent on desktop.
 */
export function Sidebar({ sections, children, footerExtra }: {
  sections: SidebarSection[];
  children?: ReactNode;
  footerExtra?: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(soundsEnabled());

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarInner = (
    <>
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <Link to={user?.role === 'admin' ? '/admin' : '/'} className="shrink-0">
          <Logo />
        </Link>
        <button onClick={() => setOpen(false)} className="md:hidden text-white/50 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {footerExtra && <div className="px-3 pb-3">{footerExtra}</div>}

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-white/30 font-semibold">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item, idx) => (
                <SidebarItem key={item.to ?? `${section.title ?? i}-${idx}`} item={item} onNavigate={() => setOpen(false)} />
              ))}
            </div>
          </div>
        ))}
        {children}
      </nav>

      <div className="border-t border-border-subtle px-3 py-3 space-y-2">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-orange/15 text-orange flex items-center justify-center text-xs font-bold shrink-0">
              {user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{user.fullName}</p>
              <p className="text-[11px] text-white/50 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => { const next = !sound; setSoundsEnabled(next); setSound(next); }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:bg-bg-tertiary hover:text-white transition-colors"
            title={sound ? 'Sound on' : 'Sound off'}
          >
            {sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Sound
          </button>
          <button
            onClick={handleSignOut}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:bg-bg-tertiary hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-bg/90 backdrop-blur border-b border-border-subtle">
        <Link to={user?.role === 'admin' ? '/admin' : '/'}>
          <Logo className="h-6 w-auto" />
        </Link>
        <button onClick={() => setOpen(true)} className="text-white/70 hover:text-white p-1" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-bg-secondary border-r border-border-subtle flex flex-col md:hidden"
            >
              {sidebarInner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop persistent */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[260px] bg-bg-secondary/40 border-r border-border-subtle flex-col z-30">
        {sidebarInner}
      </aside>

      {/* Active location marker for route changes to close the drawer */}
      <span className="sr-only" aria-hidden>{location.pathname}</span>
    </>
  );
}

function SidebarItem({ item, onNavigate }: { item: SidebarNavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  const classes = (isActive: boolean) => cn(
    'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-orange/10 text-orange'
      : 'text-white/65 hover:bg-bg-tertiary/60 hover:text-white',
  );

  const inner = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span className="text-[10px] font-semibold tabular-nums text-white/50">{item.badge}</span>
      )}
      {item.dot && (
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange" />
        </span>
      )}
    </>
  );

  if (item.onClick) {
    return (
      <button onClick={() => { item.onClick!(); onNavigate(); }} className={cn(classes(false), 'w-full text-left')}>
        {inner}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to!}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => classes(isActive)}
    >
      {inner}
    </NavLink>
  );
}
