import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Activity, Rocket, Search, ArrowUp, ArrowDown, ArrowUpDown, Loader2, Bell, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { StatusPill as SystemStatusPill } from '../../components/StatusPill';
import { OrgStatusPill } from '../../components/OrgStatusPill';
import { useAllOrgs } from '../../hooks/useOrgs';
import { useAuth } from '../../auth/AuthContext';
import { listOpenEscalations, resolveEscalation } from '../../lib/db/escalations';
import { cn } from '../../lib/cn';

type Filter = 'all' | 'onboarding' | 'live';
type SortKey = 'business' | 'contact' | 'status';
type SortDir = 'asc' | 'desc';

export function AdminHome() {
  const { data: orgs = [], isLoading, isError, error } = useAllOrgs();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: escalations = [] } = useQuery({
    queryKey: ['aria-escalations-open'],
    queryFn: listOpenEscalations,
  });
  const handleResolve = async (id: string) => {
    if (!user) return;
    try {
      await resolveEscalation(id, user.id);
      qc.invalidateQueries({ queryKey: ['aria-escalations-open'] });
      toast.success('Marked resolved');
    } catch (err) {
      toast.error("Couldn't mark resolved", { description: (err as Error).message });
    }
  };
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('business');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const counts = useMemo(() => ({
    all: orgs.length,
    onboarding: orgs.filter(o => o.status === 'onboarding').length,
    live: orgs.filter(o => o.status === 'live').length,
  }), [orgs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byFilter = orgs.filter(o => {
      if (filter === 'live') return o.status === 'live';
      if (filter === 'onboarding') return o.status === 'onboarding';
      return true;
    });
    const bySearch = q
      ? byFilter.filter(o =>
          o.businessName.toLowerCase().includes(q) ||
          o.primaryContactName?.toLowerCase().includes(q) ||
          o.primaryContactEmail?.toLowerCase().includes(q) ||
          o.primaryContactPhone?.toLowerCase().includes(q) ||
          o.slug.toLowerCase().includes(q)
        )
      : byFilter;
    const sorted = [...bySearch].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'business': cmp = a.businessName.localeCompare(b.businessName); break;
        case 'contact':  cmp = (a.primaryContactName ?? '').localeCompare(b.primaryContactName ?? ''); break;
        case 'status': {
          // Sort by a curated order so admin sees live clients first, then
          // those mid-onboarding, then paused, then churned - rather than
          // alphabetical order which puts "churned" before "live".
          const order: Record<string, number> = { live: 0, onboarding: 1, paused: 2, churned: 3 };
          cmp = (order[a.status] ?? 99) - (order[b.status] ?? 99);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [orgs, filter, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 pt-10 md:pt-16 pb-16 md:pb-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10">
            <div>
              <p className="eyebrow mb-3">Serenium admin</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,6vw,3rem)] leading-[1.05] tracking-[-0.03em]">Clients</h1>
              <p className="text-white/60 mt-2 text-sm md:text-base">
                {isLoading ? 'Loading…'
                  : orgs.length === 0 ? 'No clients yet. Spin up your first one.'
                  : `${orgs.length} total, ${counts.onboarding} still onboarding, ${counts.live} live.`}
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <SystemStatusPill variant="admin" />
              <Link to="/admin/clients/new" className="btn-primary">
                <Plus className="h-4 w-4" /> New client
              </Link>
            </div>
          </div>

          {isError && (
            <div className="card border-error/40 bg-error/5 mb-8">
              <p className="font-semibold text-error mb-1">Couldn't load clients</p>
              <p className="text-sm text-white/70">{(error as Error)?.message ?? 'Unknown error'}</p>
            </div>
          )}

          {escalations.length > 0 && (
            <div className="card border-orange/30 bg-orange/5 mb-8 md:mb-10 !p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-orange/20 flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange" />
                <span className="text-sm font-semibold text-white">
                  {escalations.length === 1 ? 'Aria flagged a question' : `Aria flagged ${escalations.length} questions`}
                </span>
                <span className="ml-auto text-xs text-white/45">Reply by email, then mark resolved.</span>
              </div>
              <ul className="divide-y divide-border-subtle">
                {escalations.slice(0, 5).map(e => {
                  const orgRow = orgs.find(o => o.id === e.organizationId);
                  return (
                    <li key={e.id} className="px-5 py-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-semibold text-white">{orgRow?.businessName ?? 'Unknown client'}</span>
                          {e.pageContext && <span className="text-white/40"> · {e.pageContext}</span>}
                          <span className="text-white/35"> · {timeAgo(e.createdAt)}</span>
                        </div>
                        <p className="text-sm text-white/75 mt-1 line-clamp-2">{e.question}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {orgRow && (
                          <Link
                            to={`/admin/clients/${orgRow.slug}?tab=flagged`}
                            className="text-xs text-orange hover:text-orange-hover font-medium px-2.5 py-1.5"
                          >
                            Open client →
                          </Link>
                        )}
                        <button
                          onClick={() => handleResolve(e.id)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border-subtle hover:border-white/30 hover:bg-white/5 text-white/75"
                        >
                          <Check className="h-3.5 w-3.5" /> Resolve
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {escalations.length > 5 && (
                <div className="px-5 py-2.5 border-t border-border-subtle text-xs text-white/50">
                  + {escalations.length - 5} more, open each client to see them.
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 grid-cols-3 mb-8 md:mb-10">
            <StatCard active={filter === 'all'}        onClick={() => setFilter('all')}        icon={Users}    label="All clients"   value={counts.all} />
            <StatCard active={filter === 'onboarding'} onClick={() => setFilter('onboarding')} icon={Activity} label="In onboarding" value={counts.onboarding} />
            <StatCard active={filter === 'live'}       onClick={() => setFilter('live')}       icon={Rocket}   label="Live"          value={counts.live} />
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex flex-col md:flex-row md:items-center gap-3 md:gap-6 md:justify-between">
              <h2 className="font-semibold capitalize">{filter === 'all' ? 'All clients' : filter}</h2>
              <div className="flex items-center gap-3 md:flex-1 md:max-w-md md:ml-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name, email, phone…"
                    className="input !pl-9 !py-2 w-full"
                  />
                </div>
                <span className="text-xs text-white/40 whitespace-nowrap">{filtered.length} shown</span>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-border-subtle">
                  <SortTh active={sortKey === 'business'} dir={sortDir} onClick={() => toggleSort('business')}>Business</SortTh>
                  <SortTh active={sortKey === 'contact'} dir={sortDir} onClick={() => toggleSort('contact')}>Primary contact</SortTh>
                  <SortTh active={sortKey === 'status'} dir={sortDir} onClick={() => toggleSort('status')}>Status</SortTh>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={4} className="px-6 py-16 text-center text-white/50">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Loading clients…
                  </td></tr>
                )}
                {!isLoading && filtered.map(org => (
                  <tr key={org.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-tertiary/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{org.businessName}</div>
                      {org.plan && <PlanBadge plan={org.plan} />}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">{org.primaryContactName ?? '-'}</td>
                    <td className="px-6 py-4"><OrgStatusPill status={org.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/clients/${org.slug}`} className="text-sm text-orange hover:text-orange-hover font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-white/50">
                    {query
                      ? <>No clients match "{query}".</>
                      : filter === 'all'
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

function SortTh({ children, active, dir, onClick }: { children: React.ReactNode; active: boolean; dir: SortDir; onClick: () => void }) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-6 py-3 font-medium">
      <button onClick={onClick} className={cn('inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-white/80 transition-colors', active && 'text-orange')}>
        {children}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

function StatCard({ icon: Icon, label, value, active, onClick }: {
  icon: typeof Users; label: string; value: number; active?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={cn(
      'relative group card !p-5 md:!p-6 flex flex-col gap-3 text-left transition-all overflow-hidden',
      active && 'border-orange',
      !active && 'hover:border-border-emphasis hover:-translate-y-0.5',
    )}>
      {active && <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange to-transparent" />}
      <div className="flex items-center justify-between">
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          active ? 'bg-orange text-white' : 'bg-orange/10 text-orange'
        )}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
        {active && <span className="text-[10px] uppercase tracking-wider text-orange font-semibold">Viewing</span>}
      </div>
      <div>
        <p className="font-display font-black text-3xl md:text-4xl leading-none tabular-nums">{value}</p>
        <p className="text-xs text-white/50 mt-1.5">{label}</p>
      </div>
    </button>
  );
}


function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function PlanBadge({ plan }: { plan: 'starter' | 'pro' | 'custom' }) {
  const styles: Record<typeof plan, string> = {
    starter: 'bg-white/5 text-white/60 border-border-subtle',
    pro:     'bg-orange/10 text-orange border-orange/30',
    custom:  'bg-white/10 text-white/90 border-white/20',
  };
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-semibold uppercase tracking-wider border', styles[plan])}>
      {plan}
    </span>
  );
}
