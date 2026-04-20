import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Activity, Rocket, Video, Sparkles, AlertTriangle } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { db } from '../../lib/mockDb';
import { useDbVersion } from '../../hooks/useDb';
import { getOrgProgress } from '../../lib/progress';
import { getClientHealth, type HealthState } from '../../lib/clientHealth';
import { cn } from '../../lib/cn';

type Filter = 'all' | 'onboarding' | 'live' | 'stalled';

export function AdminHome() {
  useDbVersion();
  const [filter, setFilter] = useState<Filter>('all');
  const orgs = db.listAllOrganizations();
  const rows = orgs.map(o => ({ org: o, progress: getOrgProgress(o.id), health: getClientHealth(o.id) }));

  const counts = {
    all: rows.length,
    onboarding: rows.filter(r => r.health.state !== 'complete').length,
    live: rows.filter(r => r.health.state === 'complete').length,
    stalled: rows.filter(r => r.health.state === 'stalled').length,
  };

  const filtered = rows.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'stalled') return r.health.state === 'stalled';
    if (filter === 'live') return r.health.state === 'complete';
    if (filter === 'onboarding') return r.health.state !== 'complete';
    return true;
  });

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 pt-10 md:pt-16 pb-16 md:pb-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10">
            <div>
              <p className="eyebrow mb-3">Admin</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,6vw,3rem)] leading-[1.05] tracking-[-0.03em]">Client dashboard</h1>
              <p className="text-white/60 mt-2 text-sm md:text-base">{orgs.length} active {orgs.length === 1 ? 'organization' : 'organizations'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/welcome-video" className="btn-secondary">
                <Sparkles className="h-4 w-4" /> Welcome video
              </Link>
              <Link to="/admin/videos" className="btn-secondary">
                <Video className="h-4 w-4" /> Step videos
              </Link>
              <Link to="/admin/clients/new" className="btn-primary">
                <Plus className="h-4 w-4" /> New client
              </Link>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-8 md:mb-10">
            <StatCard active={filter === 'all'}        onClick={() => setFilter('all')}        icon={Users}          label="All clients"    value={counts.all} />
            <StatCard active={filter === 'onboarding'} onClick={() => setFilter('onboarding')} icon={Activity}       label="In onboarding"  value={counts.onboarding} />
            <StatCard active={filter === 'live'}       onClick={() => setFilter('live')}       icon={Rocket}         label="Live"           value={counts.live} />
            <StatCard active={filter === 'stalled'}    onClick={() => setFilter('stalled')}    icon={AlertTriangle}  label="Stalled"        value={counts.stalled} tone={counts.stalled > 0 ? 'warn' : 'default'} />
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
              <h2 className="font-semibold capitalize">{filter === 'all' ? 'All clients' : filter}</h2>
              <span className="text-xs text-white/40">{filtered.length} shown</span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-border-subtle">
                  <th className="px-6 py-3 font-medium">Business</th>
                  <th className="px-6 py-3 font-medium">Primary contact</th>
                  <th className="px-6 py-3 font-medium">Health</th>
                  <th className="px-6 py-3 font-medium">Progress</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ org, progress, health }) => (
                  <tr key={org.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-tertiary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{org.businessName}</td>
                    <td className="px-6 py-4 text-sm text-white/60">{org.primaryContactName ?? '—'}</td>
                    <td className="px-6 py-4"><HealthPill state={health.state} label={health.label} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                          <div className="h-full bg-orange transition-all" style={{ width: `${progress.overall}%` }} />
                        </div>
                        <span className="text-xs text-white/60 w-10 text-right tabular-nums">{progress.overall}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/clients/${org.slug}`} className="text-sm text-orange hover:text-orange-hover font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-white/50">
                    {filter === 'all'
                      ? <>No clients yet. <Link to="/admin/clients/new" className="text-orange">Create the first one →</Link></>
                      : <>No clients in this state.</>}
                  </td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, active, onClick, tone = 'default' }: {
  icon: typeof Users; label: string; value: number; active?: boolean; onClick?: () => void; tone?: 'default' | 'warn';
}) {
  return (
    <button onClick={onClick} className={cn(
      'card !p-4 md:!p-6 flex items-center gap-3 md:gap-4 text-left transition-all',
      active && 'border-orange bg-orange/5',
      tone === 'warn' && value > 0 && !active && 'border-warning/30',
      !active && 'hover:border-border-emphasis',
    )}>
      <div className={cn(
        'flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl shrink-0',
        tone === 'warn' && value > 0 ? 'bg-warning/10 text-warning' : 'bg-orange/10 text-orange'
      )}>
        <Icon className="h-5 w-5 md:h-6 md:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs uppercase tracking-wider text-white/40 truncate">{label}</p>
        <p className="font-display font-black text-2xl md:text-3xl leading-none mt-0.5 md:mt-1 tabular-nums">{value}</p>
      </div>
    </button>
  );
}

function HealthPill({ state, label }: { state: HealthState; label: string }) {
  const styles: Record<HealthState, string> = {
    complete: 'bg-success/10 text-success',
    healthy:  'bg-orange/10 text-orange',
    fresh:    'bg-white/10 text-white/70',
    stalled:  'bg-warning/15 text-warning',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize', styles[state])}>
      {label}
    </span>
  );
}
