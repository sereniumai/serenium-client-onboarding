import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronRight } from 'lucide-react';
import {
  listAdminNotifications,
  countUnreadAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AdminNotification,
} from '../lib/db/notifications';
import { cn } from '../lib/cn';

const POLL_MS = 30_000;

export function AdminBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  const { data: unread = 0 } = useQuery({
    queryKey: ['admin-notifications', 'unread-count'],
    queryFn: countUnreadAdminNotifications,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['admin-notifications', 'feed'],
    queryFn: () => listAdminNotifications({ limit: 30 }),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleClickItem = (n: AdminNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const deepLink = (n.payload as { deepLink?: string }).deepLink;
    if (deepLink) {
      navigate(deepLink);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border-subtle bg-bg-secondary/40 text-white/70 hover:text-white hover:border-border-emphasis transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] max-h-[80vh] rounded-xl border border-border-subtle bg-bg-secondary/95 backdrop-blur shadow-2xl overflow-hidden z-50 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-orange transition-colors"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-white/55">No notifications yet.</p>
                  <p className="text-xs text-white/35 mt-1">Client activity will show up here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {items.map(n => {
                    const p = n.payload as { subject?: string; businessName?: string; message?: string };
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClickItem(n)}
                          className={cn(
                            'w-full text-left px-4 py-3 hover:bg-bg-tertiary/50 transition-colors flex items-start gap-3',
                            !n.readAt && 'bg-orange/[0.04]',
                          )}
                        >
                          <div className={cn(
                            'mt-1.5 h-2 w-2 rounded-full shrink-0',
                            n.readAt ? 'bg-transparent' : 'bg-orange',
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{p.subject ?? n.eventKey}</p>
                            {p.businessName && (
                              <p className="text-xs text-white/55 truncate">{p.businessName}</p>
                            )}
                            <p className="text-[11px] text-white/40 mt-1 tabular-nums">{relativeTime(n.createdAt)}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-border-subtle">
              <Link
                to="/admin/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-bg-tertiary/40 transition-colors"
              >
                <span>Notification settings</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
