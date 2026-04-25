import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Activity, CalendarDays } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { LoadingState } from '../../components/LoadingState';
import { useAllOrgs } from '../../hooks/useOrgs';
import {
  listRevenueLines,
  computeMRR,
  revenueForMonth,
  revenueYTD,
} from '../../lib/db/revenue';
import { getService } from '../../config/modules';
import type { Organization, ServiceKey } from '../../types';
import { FieldTooltip } from '../../components/FieldTooltip';
import { cn } from '../../lib/cn';

const fmtCAD = (cents: number, opts: { compact?: boolean } = {}) => {
  const dollars = cents / 100;
  return dollars.toLocaleString('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
    notation: opts.compact && Math.abs(dollars) >= 10000 ? 'compact' : 'standard',
  });
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export function RevenuePage() {
  const { data: orgs = [] } = useAllOrgs();
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['revenue', 'all'],
    queryFn: listRevenueLines,
  });
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const mrr = useMemo(() => computeMRR(lines), [lines]);
  const thisMonth = useMemo(() => revenueForMonth(lines, year, month), [lines, year, month]);
  const ytd = useMemo(() => revenueYTD(lines, year), [lines, year]);

  // Last 12 months for the chart
  const monthly = useMemo(() => {
    const out: Array<{ label: string; year: number; month: number; revenue: number; mrr: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const eom = new Date(Date.UTC(y, m, 0));
      out.push({
        label: d.toLocaleDateString('en-CA', { month: 'short' }),
        year: y,
        month: m,
        revenue: revenueForMonth(lines, y, m),
        mrr: computeMRR(lines, eom),
      });
    }
    return out;
  }, [lines, now]);

  const prevMonth = monthly[monthly.length - 2];
  const momChange = prevMonth && prevMonth.revenue > 0 ? ((thisMonth - prevMonth.revenue) / prevMonth.revenue) * 100 : null;

  // Lead source counts: how many clients came from each source.
  const leadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orgs) {
      const key = o.leadSource ?? 'unknown';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return LEAD_ORDER
      .map(source => ({ source, count: counts[source] ?? 0 }))
      .filter(x => x.count > 0);
  }, [orgs]);

  // Total earned per service across the lifetime of the agency: every
  // one-time billed plus the accrued sum of every monthly retainer line for
  // its active months. Drives the "where the money has come from" picture.
  const earningsByService = useMemo(() => {
    const totals: Partial<Record<ServiceKey, number>> = {};
    for (const l of lines) {
      if (l.serviceKey === 'business_profile') continue;
      if (l.type === 'one_time') {
        totals[l.serviceKey] = (totals[l.serviceKey] ?? 0) + l.amountCents;
        continue;
      }
      const start = new Date(l.startedAt + 'T00:00:00Z');
      const stop = l.endedAt ? new Date(l.endedAt + 'T00:00:00Z') : new Date();
      if (stop <= start) continue;
      const months = (stop.getUTCFullYear() - start.getUTCFullYear()) * 12 + (stop.getUTCMonth() - start.getUTCMonth());
      if (months > 0) totals[l.serviceKey] = (totals[l.serviceKey] ?? 0) + l.amountCents * months;
    }
    return Object.entries(totals)
      .map(([key, cents]) => ({ key: key as ServiceKey, cents: cents as number }))
      .sort((a, b) => b.cents - a.cents);
  }, [lines]);

  // Per-client roll-up
  const perClient = useMemo(() => {
    return orgs.map(org => {
      const orgLines = lines.filter(l => l.organizationId === org.id);
      const mrrContrib = computeMRR(orgLines);
      // LTV = sum of one-times + (months active × amount) for each monthly line
      let ltv = 0;
      for (const l of orgLines) {
        if (l.type === 'one_time') {
          ltv += l.amountCents;
        } else {
          const start = new Date(l.startedAt + 'T00:00:00Z');
          const stop = l.endedAt ? new Date(l.endedAt + 'T00:00:00Z') : new Date();
          if (stop <= start) continue;
          const months = (stop.getUTCFullYear() - start.getUTCFullYear()) * 12 + (stop.getUTCMonth() - start.getUTCMonth());
          if (months > 0) ltv += l.amountCents * months;
        }
      }
      const liveAt = org.liveAt ? new Date(org.liveAt) : null;
      const endedAt = org.churnedAt ? new Date(org.churnedAt) : null;
      const tenureDays = liveAt ? Math.floor(((endedAt ?? new Date()).getTime() - liveAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return { org, mrrContrib, ltv, tenureDays };
    }).sort((a, b) => b.mrrContrib - a.mrrContrib);
  }, [orgs, lines]);

  const activeClients = orgs.filter(o => o.status === 'live').length;
  const arpu = activeClients > 0 ? mrr / activeClients : 0;

  // Forecasted MRR = current MRR + sum of future-dated retainers that have
  // not yet started. Surfaces locked-in growth (e.g. a $300/mo retainer
  // signed today that kicks in 90 days from now).
  const futureLockedInMrr = useMemo(() => {
    const today = todayStr();
    return lines
      .filter(l => l.type === 'monthly' && l.startedAt > today && (!l.endedAt || l.endedAt > today))
      .reduce((s, l) => s + l.amountCents, 0);
  }, [lines]);
  const forecastedMrr = mrr + futureLockedInMrr;
  const clientsWithRevenue = perClient.filter(r => r.mrrContrib > 0 || r.ltv > 0);
  const avgServicesPerClient = clientsWithRevenue.length > 0
    ? clientsWithRevenue.reduce((sum, r) => {
        const orgServices = new Set(lines.filter(l => l.organizationId === r.org.id).map(l => l.serviceKey));
        return sum + orgServices.size;
      }, 0) / clientsWithRevenue.length
    : 0;
  const churnedLast30 = orgs.filter(o => {
    if (o.status !== 'churned' || !o.churnedAt) return false;
    const days = (Date.now() - new Date(o.churnedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  }).length;
  const churnRate30 = activeClients + churnedLast30 > 0 ? (churnedLast30 / (activeClients + churnedLast30)) * 100 : 0;
  const churnedClients = orgs.filter(o => o.status === 'churned' && o.liveAt && o.churnedAt);
  const avgLifetime = churnedClients.length > 0
    ? churnedClients.reduce((sum, o) => sum + ((new Date(o.churnedAt!).getTime() - new Date(o.liveAt!).getTime()) / (1000 * 60 * 60 * 24)), 0) / churnedClients.length
    : null;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState variant="inline" label="Loading revenue…" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-10 md:pt-14 pb-16 md:pb-24">
          <div className="mb-8">
            <p className="eyebrow mb-2">Business</p>
            <h1 className="font-display font-black text-[clamp(2rem,5vw,3rem)] leading-[1.04] tracking-[-0.025em]">
              Revenue.
            </h1>
            <p className="text-white/55 text-sm mt-1.5">Where your money comes from, where you're heading.</p>
          </div>

          {/* METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
            <MetricCard
              label="Monthly recurring revenue"
              value={fmtCAD(mrr)}
              icon={Activity}
              accent="orange"
              footnote={`${activeClients} active client${activeClients === 1 ? '' : 's'}`}
              tooltip="MRR (Monthly Recurring Revenue): the total of every monthly retainer that's billing right now. Excludes one-time payments and future-dated retainers that haven't kicked in yet. This is the core SaaS health metric."
            />
            <MetricCard
              label={`This month · ${now.toLocaleDateString('en-CA', { month: 'long' })}`}
              value={fmtCAD(thisMonth)}
              icon={CalendarDays}
              footnote={momChange !== null ? `${momChange >= 0 ? '+' : ''}${momChange.toFixed(0)}% vs ${prevMonth?.label}` : 'Tracking…'}
              footnoteAccent={momChange !== null ? (momChange >= 0 ? 'success' : 'error') : 'muted'}
              tooltip="Total revenue billed in this calendar month: every active retainer plus any one-time payments dated this month. The percentage compares this month vs last month."
            />
            <MetricCard
              label={`Year-to-date · ${year}`}
              value={fmtCAD(ytd)}
              icon={TrendingUp}
              footnote={`${monthly.filter(m => m.year === year).length} month${monthly.filter(m => m.year === year).length === 1 ? '' : 's'} of revenue`}
              tooltip="Sum of every dollar billed since January 1 of this year. Combines retainer income (months active × amount) with all one-time payments dated this year."
            />
          </div>

          {/* SECONDARY STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <MiniStat
              label="ARPU"
              value={fmtCAD(arpu)}
              icon={Users}
              hint="MRR ÷ active clients"
              tooltip="Average Revenue Per User. Total MRR divided by active clients. Tells you what an average client is worth to you per month. Higher ARPU usually means you're attaching more services or charging confidently."
            />
            <MiniStat
              label="Forecasted MRR"
              value={fmtCAD(forecastedMrr)}
              icon={TrendingUp}
              accent={futureLockedInMrr > 0 ? 'success' : 'default'}
              hint={futureLockedInMrr > 0 ? `+${fmtCAD(futureLockedInMrr)} locked in` : 'Once future retainers kick in'}
              tooltip="Current MRR plus every retainer you've signed but hasn't started yet (e.g. a $300/mo retainer that kicks in 90 days). Shows what your MRR will be once everything in the pipeline goes live."
            />
            <MiniStat
              label="Avg services / client"
              value={avgServicesPerClient > 0 ? avgServicesPerClient.toFixed(1) : '—'}
              icon={Activity}
              hint="Across paying clients"
              tooltip="Average number of services each paying client buys from you (e.g. a client on Website + AI SMS = 2). Higher means more cross-sell. Helps you spot under-served clients you could expand."
            />
            <MiniStat
              label="Active retainers"
              value={String(lines.filter(l => l.type === 'monthly' && l.startedAt <= todayStr() && (!l.endedAt || l.endedAt > todayStr())).length)}
              icon={CalendarDays}
              hint="Monthly retainers billing right now"
              tooltip="Count of every monthly retainer that's billing right now. Different from active clients: one client can have multiple retainers (e.g. Website + AI SMS = 2 retainers, 1 client)."
            />
          </div>

          {/* MoM CHART */}
          <section className="card mb-10 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="eyebrow mb-1">Last 12 months</p>
                <h2 className="font-display font-bold text-xl">Revenue trend</h2>
              </div>
            </div>
            <p className="text-xs text-white/50 mb-4">Total billed each month, with MRR overlay as the orange line.</p>
            <RevenueChart monthly={monthly} />
          </section>

          {/* WHERE MONEY COMES FROM + WHERE LEADS COME FROM (side by side) */}
          <div className="grid md:grid-cols-2 gap-3 mb-10">
            <section className="card">
              <div className="flex items-center justify-between mb-1">
                <p className="eyebrow">Earnings by service</p>
                <FieldTooltip text="Total earned to date per service: every one-time payment plus the accrued sum of every monthly retainer for the months it's been active. Business Profile excluded since it's not a billable service." />
              </div>
              <h2 className="font-display font-bold text-base mb-4">Where money comes from</h2>
              {earningsByService.length > 0
                ? <ColumnChart bars={earningsByService.map(e => ({
                    key: e.key,
                    label: getService(e.key)?.label.split(' ')[0] ?? e.key,
                    value: e.cents,
                    formatted: fmtCAD(e.cents, { compact: true }),
                  }))} />
                : <EmptyChart text="No revenue logged yet." />}
            </section>

            <section className="card">
              <div className="flex items-center justify-between mb-1">
                <p className="eyebrow">Clients per source</p>
                <FieldTooltip text="How many clients came from each lead source. Helps you spot which channel is producing real customers (vs just calls). Set the source on a client's Overview tab." />
              </div>
              <h2 className="font-display font-bold text-base mb-4">Where leads come from</h2>
              {leadCounts.length > 0
                ? <ColumnChart bars={leadCounts.map(c => ({
                    key: c.source,
                    label: shortLeadLabel(c.source),
                    value: c.count,
                    formatted: String(c.count),
                  }))} colour="success" />
                : <EmptyChart text="No clients yet." />}
            </section>
          </div>

          {/* CLIENTS SECTION */}
          <section className="mb-10">
            <div className="mb-4">
              <p className="eyebrow mb-1">Clients</p>
              <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Who you serve.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <MiniStat
                label="Active clients"
                value={String(activeClients)}
                icon={Users}
                tooltip="Clients currently set to 'live' status. Excludes onboarding (still setting up), paused (taking a break), and churned (gone). This is your active book of business."
              />
              <MiniStat
                label="30-day churn rate"
                value={`${churnRate30.toFixed(1)}%`}
                icon={TrendingDown}
                accent={churnRate30 > 5 ? 'error' : 'success'}
                tooltip="Percentage of clients who churned in the last 30 days, out of all who were active at any point in that window. Anything under 5% is healthy for an agency. Above 5% = investigate why."
              />
              <MiniStat
                label="Avg client lifetime"
                value={avgLifetime !== null ? `${Math.round(avgLifetime)} days` : '—'}
                icon={CalendarDays}
                hint={avgLifetime === null ? 'Need 1+ churned client' : undefined}
                tooltip="Average number of days a churned client stayed with you (from the day you marked them live to the day they churned). Higher means you keep clients longer. Becomes meaningful after several have churned."
              />
            </div>
            <ClientLtvTable rows={perClient} />
          </section>
        </div>
      </div>
    </AppShell>
  );
}

// ─── METRIC CARDS ──────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, accent = 'default', footnote, footnoteAccent = 'muted', tooltip }: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: 'default' | 'orange';
  footnote?: string;
  footnoteAccent?: 'success' | 'error' | 'muted';
  tooltip?: string;
}) {
  return (
    <div className={cn(
      'card relative overflow-hidden',
      accent === 'orange' && 'border-orange/30 bg-orange/[0.03]',
    )}>
      {accent === 'orange' && <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-orange/10 blur-3xl pointer-events-none" />}
      <div className="relative">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 font-semibold truncate">{label}</p>
            {tooltip && <FieldTooltip text={tooltip} />}
          </div>
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-orange/15 text-orange shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="font-display font-black text-3xl md:text-4xl tracking-[-0.025em] tabular-nums leading-none mb-2">{value}</p>
        {footnote && (
          <p className={cn(
            'text-xs',
            footnoteAccent === 'success' && 'text-success',
            footnoteAccent === 'error' && 'text-error',
            footnoteAccent === 'muted' && 'text-white/45',
          )}>
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── REVENUE CHART (no external lib) ───────────────────────────────────────

function RevenueChart({ monthly }: { monthly: Array<{ label: string; revenue: number; mrr: number }> }) {
  const W = 800;
  const H = 240;
  const PAD_L = 50;
  const PAD_R = 16;
  const PAD_T = 14;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxRev = Math.max(1, ...monthly.map(m => Math.max(m.revenue, m.mrr)));
  const yScale = (cents: number) => PAD_T + innerH - (cents / Math.max(1, maxRev)) * innerH;
  const xScale = (i: number) => PAD_L + (innerW * i) / Math.max(1, monthly.length - 1);

  const barW = (innerW / monthly.length) * 0.55;

  const mrrPath = monthly.map((m, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(m.mrr)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Y axis lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={PAD_L - 8} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="ui-sans-serif">
                {fmtCAD(maxRev * t, { compact: true })}
              </text>
            </g>
          );
        })}
        {/* Revenue bars */}
        {monthly.map((m, i) => {
          const x = xScale(i) - barW / 2;
          const y = yScale(m.revenue);
          return (
            <g key={i}>
              <rect
                x={x} y={y}
                width={barW} height={Math.max(2, PAD_T + innerH - y)}
                fill="rgba(255,107,31,0.30)"
                rx="2"
              />
            </g>
          );
        })}
        {/* MRR line */}
        <path d={mrrPath} stroke="#FF6B1F" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {monthly.map((m, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(m.mrr)} r="3" fill="#FF6B1F" />
        ))}
        {/* X axis labels */}
        {monthly.map((m, i) => (
          <text key={i} x={xScale(i)} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="10">
            {m.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── COMPACT COLUMN CHART ──────────────────────────────────────────────────

const LEAD_LABEL: Record<string, string> = {
  facebook_ad: 'Facebook ads',
  google_ads: 'Google Ads',
  referral: 'Referral',
  outreach: 'Outreach',
  socials: 'Socials',
  networking: 'Networking',
  other: 'Other',
  unsure: 'Unsure / not tracked',
  unknown: 'Not set',
};
const LEAD_ORDER = ['facebook_ad', 'google_ads', 'referral', 'outreach', 'socials', 'networking', 'other', 'unsure', 'unknown'];

function shortLeadLabel(source: string): string {
  switch (source) {
    case 'facebook_ad': return 'Facebook';
    case 'google_ads': return 'Google';
    case 'referral': return 'Referral';
    case 'outreach': return 'Outreach';
    case 'socials': return 'Socials';
    case 'networking': return 'Network';
    case 'other': return 'Other';
    case 'unsure': return 'Unsure';
    case 'unknown': return 'Not set';
    default: return source;
  }
}

function ColumnChart({ bars, colour = 'orange' }: {
  bars: Array<{ key: string; label: string; value: number; formatted: string }>;
  colour?: 'orange' | 'success';
}) {
  const max = Math.max(...bars.map(b => b.value), 1);
  const fillClass = colour === 'success'
    ? 'bg-gradient-to-t from-success/80 to-success'
    : 'bg-gradient-to-t from-orange/80 to-orange';
  return (
    <div className="flex items-end gap-2 h-40 pt-3">
      {bars.map(b => {
        const heightPct = (b.value / max) * 100;
        return (
          <div key={b.key} className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
            <p className="text-[11px] tabular-nums font-semibold text-white whitespace-nowrap">{b.formatted}</p>
            <div className="flex-1 w-full flex items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(2, heightPct)}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={cn('w-full rounded-t-md', fillClass)}
              />
            </div>
            <p className="text-[10px] text-white/55 truncate w-full text-center" title={b.label}>{b.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-white/40">{text}</div>
  );
}

// ─── MINI STAT ─────────────────────────────────────────────────────────────

function MiniStat({ label, value, icon: Icon, accent = 'default', hint, tooltip }: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: 'default' | 'success' | 'error';
  hint?: string;
  tooltip?: string;
}) {
  return (
    <div className="card !p-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 font-semibold truncate">{label}</p>
          {tooltip && <FieldTooltip text={tooltip} />}
        </div>
        <div className="h-6 w-6 rounded-md flex items-center justify-center bg-orange/15 text-orange shrink-0">
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <p className={cn(
        'font-display font-black text-2xl tracking-[-0.02em] tabular-nums leading-none',
        accent === 'success' && 'text-success',
        accent === 'error' && 'text-error',
      )}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
    </div>
  );
}

// ─── CLIENT LTV TABLE ──────────────────────────────────────────────────────

function ClientLtvTable({ rows }: { rows: Array<{ org: Organization; mrrContrib: number; ltv: number; tenureDays: number }> }) {
  if (rows.length === 0) {
    return (
      <div className="card text-center py-10 text-sm text-white/55">No clients yet.</div>
    );
  }
  return (
    <div className="card !p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-white/40 border-b border-border-subtle">
              <th className="px-5 py-3 font-semibold">Business</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">MRR contribution</th>
              <th className="px-5 py-3 font-semibold text-right">LTV</th>
              <th className="px-5 py-3 font-semibold text-right">Days as client</th>
              <th className="px-5 py-3 font-semibold">Lead source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.org.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-tertiary/30 transition-colors">
                <td className="px-5 py-3 text-sm font-medium">{r.org.businessName}</td>
                <td className="px-5 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
                    r.org.status === 'live' && 'bg-success/10 text-success border-success/30',
                    r.org.status === 'onboarding' && 'bg-orange/10 text-orange border-orange/30',
                    r.org.status === 'paused' && 'bg-warning/10 text-warning border-warning/30',
                    r.org.status === 'churned' && 'bg-white/10 text-white/55 border-white/20',
                  )}>
                    {r.org.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm tabular-nums text-right">
                  {r.mrrContrib > 0 ? <span className="text-orange font-semibold">{fmtCAD(r.mrrContrib)}/mo</span> : <span className="text-white/30">—</span>}
                </td>
                <td className="px-5 py-3 text-sm tabular-nums text-right font-semibold">{fmtCAD(r.ltv)}</td>
                <td className="px-5 py-3 text-sm tabular-nums text-right text-white/65">{r.tenureDays > 0 ? r.tenureDays : '—'}</td>
                <td className="px-5 py-3 text-xs text-white/55">{r.org.leadSource ? LEAD_LABEL[r.org.leadSource] : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Silence unused import warning
void useEffect;
