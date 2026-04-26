import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Bell, ExternalLink, AlertCircle, MessagesSquare } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { LoadingState } from '../../components/LoadingState';
import { cn } from '../../lib/cn';
import {
  listNotificationSettings,
  updateNotificationSetting,
  listAdminNotifications,
  type NotificationSetting,
  type AdminNotification,
} from '../../lib/db/notifications';

const CATEGORY_ORDER = ['lifecycle', 'service', 'access', 'support', 'reports', 'general'];
const CATEGORY_LABEL: Record<string, string> = {
  lifecycle: 'Lifecycle',
  service:   'Service completed',
  access:    'Access granted',
  support:   'Support',
  reports:   'Reports',
  general:   'Other',
};

export function NotificationsPage() {
  const qc = useQueryClient();

  const { data: settings = [], isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: listNotificationSettings,
  });

  const { data: feed = [], isLoading: feedLoading } = useQuery({
    queryKey: ['admin-notifications', 'feed-page'],
    queryFn: () => listAdminNotifications({ limit: 100 }),
    refetchOnWindowFocus: true,
  });

  const toggle = useMutation({
    mutationFn: ({ eventKey, patch }: { eventKey: string; patch: { sendEmail?: boolean; sendBell?: boolean } }) =>
      updateNotificationSetting(eventKey, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-settings'] }),
  });

  const team   = useMemo(() => groupByCategory(settings.filter(s => s.audience === 'team')),   [settings]);
  const client = useMemo(() => groupByCategory(settings.filter(s => s.audience === 'client')), [settings]);

  const noSettings = !settingsLoading && !settingsError && settings.length === 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12">
        <div className="mb-8">
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="font-display font-black text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">
            Notifications
          </h1>
          <p className="text-white/60 max-w-2xl">
            Every email and in-app bell the portal sends, with on/off toggles. Bell-only events still get logged on this page, you just don't get an inbox ping for them.
          </p>
        </div>

        {noSettings && <MigrationEmptyState />}

        {/* TEAM CHANNELS */}
        {team.length > 0 && (
          <section className="mb-12">
            <div className="mb-4">
              <h2 className="font-display font-bold text-xl">Team notifications</h2>
              <p className="text-sm text-white/55 mt-1">Goes to the Serenium ops team. Bell appears at the top-right of every admin page.</p>
            </div>
            <SettingsGroups
              groups={team}
              showBell={true}
              onToggle={(eventKey, patch) => toggle.mutate({ eventKey, patch })}
              busy={toggle.isPending}
            />
          </section>
        )}

        {/* CLIENT CHANNELS */}
        {client.length > 0 && (
          <section className="mb-12">
            <div className="mb-4">
              <h2 className="font-display font-bold text-xl">Client notifications</h2>
              <p className="text-sm text-white/55 mt-1">Emails sent to your clients. Flip any of these off to stop the portal from sending it.</p>
            </div>
            <SettingsGroups
              groups={client}
              showBell={false}
              onToggle={(eventKey, patch) => toggle.mutate({ eventKey, patch })}
              busy={toggle.isPending}
            />
            <Link
              to="/admin/settings/followups"
              className="inline-flex items-center gap-2 mt-4 text-sm text-orange hover:text-orange-hover font-semibold"
            >
              <MessagesSquare className="h-4 w-4" /> Manage stalled-onboarding follow-ups <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {settingsLoading && <LoadingState variant="inline" />}

        {/* RECENT ACTIVITY */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl">Recent activity</h2>
            <span className="text-xs text-white/45">Last {feed.length} events</span>
          </div>

          {feedLoading ? (
            <LoadingState variant="inline" />
          ) : feed.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-white/55 text-sm">Nothing fired yet. Once a client triggers an event you'll see it here.</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <ul className="divide-y divide-border-subtle">
                {feed.map(n => <FeedRow key={n.id} n={n} />)}
              </ul>
            </div>
          )}
        </section>

        {/* RESEND LOG */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl">Email send log</h2>
          </div>
          <div className="card p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-white/45 shrink-0 mt-0.5" />
              <p className="text-sm text-white/80 leading-relaxed">
                Every email the portal sends goes through Resend. Open the Resend dashboard to see delivery status (delivered, bounced, opened), recipient, and full email history. Logs are retained for 30 days.
              </p>
            </div>
            <a
              href="https://resend.com/emails"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange hover:bg-orange-hover text-white text-sm font-semibold transition-colors"
            >
              Open Resend dashboard <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function groupByCategory(items: NotificationSetting[]) {
  const map = new Map<string, NotificationSetting[]>();
  for (const s of items) {
    const key = s.category || 'general';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return CATEGORY_ORDER
    .filter(c => map.has(c))
    .map(c => ({ category: c, items: map.get(c)! }));
}

function SettingsGroups({ groups, showBell, onToggle, busy }: {
  groups: { category: string; items: NotificationSetting[] }[];
  showBell: boolean;
  onToggle: (eventKey: string, patch: { sendEmail?: boolean; sendBell?: boolean }) => void;
  busy?: boolean;
}) {
  return (
    <div className="space-y-6">
      {groups.map(g => (
        <div key={g.category} className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle bg-bg-tertiary/40">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-semibold">
              {CATEGORY_LABEL[g.category] ?? g.category}
            </p>
          </div>
          <ul className="divide-y divide-border-subtle">
            {g.items.map(s => (
              <li key={s.eventKey} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white/90">{s.label}</p>
                  <p className="text-[11px] text-white/35 font-mono mt-0.5 truncate">{s.eventKey}</p>
                </div>
                <ToggleChip
                  icon={Mail}
                  label="Email"
                  on={s.sendEmail}
                  disabled={busy}
                  onClick={() => onToggle(s.eventKey, { sendEmail: !s.sendEmail })}
                />
                {showBell && (
                  <ToggleChip
                    icon={Bell}
                    label="Bell"
                    on={s.sendBell}
                    disabled={busy}
                    onClick={() => onToggle(s.eventKey, { sendBell: !s.sendBell })}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ToggleChip({ icon: Icon, label, on, disabled, onClick }: {
  icon: typeof Mail;
  label: string;
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50',
        on
          ? 'border-orange/40 bg-orange/10 text-orange'
          : 'border-border-subtle bg-bg-tertiary/30 text-white/40 hover:text-white/70',
      )}
      aria-pressed={on}
    >
      <Icon className="h-3.5 w-3.5" />
      {label} {on ? 'on' : 'off'}
    </button>
  );
}

function FeedRow({ n }: { n: AdminNotification }) {
  const p = n.payload as { subject?: string; businessName?: string; slug?: string; deepLink?: string };
  const inner = (
    <div className="px-5 py-3 flex items-center gap-3 hover:bg-bg-tertiary/40 transition-colors">
      <div className={cn('h-2 w-2 rounded-full shrink-0', n.readAt ? 'bg-transparent' : 'bg-orange')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{p.subject ?? n.eventKey}</p>
        <p className="text-xs text-white/45 truncate">
          {p.businessName ?? '·'}
          <span className="text-white/25 mx-1.5">·</span>
          {new Date(n.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
  if (p.deepLink) {
    return (
      <li>
        <Link to={p.deepLink} className="block">
          {inner}
        </Link>
      </li>
    );
  }
  return <li>{inner}</li>;
}

function MigrationEmptyState() {
  return (
    <div className="mb-8 rounded-xl border border-orange/30 bg-orange/5 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-white">Notifications database isn't ready yet</p>
          <p className="text-sm text-white/70 mt-1 leading-relaxed">
            The <code className="text-orange font-mono text-xs">notification_settings</code> table is empty. Run the latest Supabase migration (<code className="text-orange font-mono text-xs">20260501000019_notifications.sql</code>) in the SQL editor and refresh this page.
          </p>
        </div>
      </div>
    </div>
  );
}
