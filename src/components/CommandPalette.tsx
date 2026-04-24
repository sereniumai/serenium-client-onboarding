import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search, LayoutDashboard, Users, Plus, Video, Sparkles, FileBarChart2,
  Settings2, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../lib/mockDb';
import { useDbVersion } from '../hooks/useDb';
import { SERVICES } from '../config/modules';
import { SERVICE_ICON } from '../config/serviceIcons';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  useDbVersion();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  const clientOrg = user?.role === 'client' ? db.listOrganizationsForUser(user.id)[0] : null;
  const allOrgs = user?.role === 'admin' ? db.listAllOrganizations() : [];

  const commands = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') {
      return [
        { group: 'Navigation', label: 'Client dashboard',  icon: LayoutDashboard, action: () => navigate('/admin'),               hint: 'home' },
        { group: 'Navigation', label: 'New client',        icon: Plus,            action: () => navigate('/admin/clients/new'),   hint: 'create' },
        { group: 'Navigation', label: 'Step videos',       icon: Video,           action: () => navigate('/admin/videos'),        hint: 'loom library' },
        { group: 'Navigation', label: 'Welcome video',     icon: Sparkles,        action: () => navigate('/admin/welcome-video'), hint: 'global intro' },
        ...allOrgs.map(o => ({
          group: 'Clients', label: o.businessName, icon: Users,
          action: () => navigate(`/admin/clients/${o.slug}`),
          hint: o.primaryContactEmail ?? '',
        })),
      ];
    }
    // Client commands
    const orgSlug = clientOrg?.slug;
    if (!orgSlug || !clientOrg) return [];
    const commands: Array<{ group: string; label: string; icon: typeof LayoutDashboard; action: () => void; hint?: string }> = [
      { group: 'Navigation', label: 'Dashboard', icon: LayoutDashboard, action: () => navigate(`/onboarding/${orgSlug}`) },
      { group: 'Navigation', label: 'Monthly reports', icon: FileBarChart2, action: () => navigate(`/onboarding/${orgSlug}/reports`) },
    ];
    for (const svcKey of SERVICES.map(s => s.key)) {
      const svc = SERVICES.find(s => s.key === svcKey)!;
      const entry = db.listServicesForOrganization(clientOrg.id).find(s => s.serviceKey === svcKey);
      if (!entry) continue;
      const disabled = new Set(entry.disabledModuleKeys ?? []);
      for (const m of svc.modules) {
        if (disabled.has(m.key)) continue;
        const mp = db.listModuleProgress(clientOrg.id).find(p => p.serviceKey === svcKey && p.moduleKey === m.key);
        commands.push({
          group: svc.label,
          label: m.title,
          icon: mp?.status === 'complete' ? CheckCircle2 : SERVICE_ICON[svcKey],
          action: () => navigate(`/onboarding/${orgSlug}/services/${svcKey}#module-${m.key}`),
          hint: mp?.status === 'complete' ? 'submitted' : `~${m.estimatedMinutes} min`,
        });
      }
    }
    return commands;
  }, [user, navigate, clientOrg, allOrgs]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof commands> = {};
    for (const c of commands) { map[c.group] ||= []; map[c.group].push(c); }
    return map;
  }, [commands]);

  if (!user) return null;

  return (
    <>
      {/* Hint button bottom-right (desktop), round button (mobile) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="fixed bottom-4 right-4 md:bottom-5 md:right-5 z-40 inline-flex items-center gap-2 px-3 py-2 md:py-2 rounded-full bg-bg-secondary border border-border-emphasis hover:border-orange/50 text-white/60 hover:text-white transition-all shadow-card hover:shadow-orange-glow/20 text-xs"
      >
        <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
        <span className="hidden md:inline">Quick jump</span>
        <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle text-[10px] font-mono">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[1100] bg-bg/70 backdrop-blur-md flex items-start justify-center pt-[8vh] md:pt-[12vh] px-3 md:px-4 animate-in fade-in duration-100" onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-xl">
            <Command
              label="Command palette"
              className="card overflow-hidden !p-0 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
                <Search className="h-4 w-4 text-white/40" />
                <Command.Input
                  placeholder="Search anything…"
                  className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-white/30"
                  autoFocus
                />
                <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle text-[10px] font-mono text-white/50">esc</kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="p-8 text-center text-sm text-white/40">
                  No matches. Try a different search.
                </Command.Empty>
                {Object.entries(grouped).map(([group, items]) => (
                  <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-white/40 [&_[cmdk-group-heading]]:font-semibold">
                    {items.map((c, i) => {
                      const Icon = c.icon;
                      return (
                        <Command.Item
                          key={`${group}-${i}`}
                          value={`${c.label} ${c.hint ?? ''}`}
                          onSelect={run(c.action)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-white/80 aria-selected:bg-orange/10 aria-selected:text-white"
                        >
                          <Icon className="h-4 w-4 text-white/50 aria-selected:text-orange" />
                          <span className="flex-1 truncate">{c.label}</span>
                          {c.hint && <span className="text-xs text-white/40">{c.hint}</span>}
                          <ArrowRight className="h-3.5 w-3.5 text-white/30" />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle text-[11px] text-white/40">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-[10px]">↑↓</kbd> navigate</span>
                  <span className="inline-flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-[10px]">↵</kbd> select</span>
                </div>
                <span className="inline-flex items-center gap-1"><Settings2 className="h-3 w-3" /> Serenium</span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
