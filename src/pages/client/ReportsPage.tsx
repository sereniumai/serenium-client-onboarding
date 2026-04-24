import { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileBarChart2, FileText, Download } from 'lucide-react';
import { LoadingState } from '../../components/LoadingState';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { listReportsForOrg, markReportsViewed } from '../../lib/db/reports';
import { getReportFileSignedUrl } from '../../lib/db/reportFiles';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { Markdown } from '../../components/Markdown';
import { cn } from '../../lib/cn';
import type { MonthlyReport } from '../../types';

export function ReportsPage() {
  const { orgSlug } = useParams();
  const { user } = useAuth();
  const { data: org, isLoading: orgLoading } = useOrgBySlug(orgSlug);
  const isLive = org?.status === 'live';

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', org?.id],
    queryFn: () => listReportsForOrg(org!.id),
    enabled: !!org?.id && isLive,
  });

  useEffect(() => {
    if (user && org?.id && isLive) markReportsViewed(user.id, org.id).catch(() => {});
  }, [user, org?.id, isLive]);

  // Pick default open report = most recent by period.
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    if (!openId && reports[0]) setOpenId(reports[0].id);
  }, [reports, openId]);

  const grouped = useMemo(() => groupByYear(reports), [reports]);

  if (orgLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState variant="inline" />
        </div>
      </AppShell>
    );
  }
  if (!orgSlug || !org) return <Navigate to="/login" replace />;
  if (!isLive) return <Navigate to={`/onboarding/${org.slug}`} replace />;

  const active = reports.find(r => r.id === openId);

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <section className="relative mx-auto max-w-6xl px-4 md:px-6 pt-8 md:pt-14 pb-16">
          <Link to={`/onboarding/${org.slug}`} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>

          <div className="mb-8">
            <p className="eyebrow mb-2">Monthly reports</p>
            <h1 className="font-display font-black text-[clamp(2rem,5vw,3rem)] leading-[1.04] tracking-[-0.025em] mb-1">
              {org.businessName}'s <span className="text-orange">performance</span>.
            </h1>
            <p className="text-white/55 text-sm">Every month, the Serenium team drops your results here.</p>
          </div>

          {reportsLoading ? (
            <LoadingState variant="inline" label="Loading reports…" />
          ) : reports.length === 0 ? (
            <div className="card text-center py-16">
              <FileBarChart2 className="h-10 w-10 text-orange mx-auto mb-4" />
              <h3 className="font-display font-bold text-xl mb-2">Your first report lands at month end</h3>
              <p className="text-white/60 text-sm max-w-md mx-auto">Serenium publishes a new performance report every month. You'll get an email and a notification here when it's ready.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[280px,1fr] gap-6">
              {/* Year / month folder tree */}
              <aside className="lg:sticky lg:top-6 lg:self-start">
                <div className="space-y-1.5">
                  {grouped.map(({ year, reports: yearReports }) => (
                    <YearFolder
                      key={year}
                      year={year}
                      reports={yearReports}
                      activeId={openId}
                      onPick={setOpenId}
                    />
                  ))}
                </div>
              </aside>

              {/* Active report body */}
              <div>
                {active ? <ReportDetail report={active} /> : (
                  <div className="card text-center py-12 text-white/50">Pick a report from the list.</div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function YearFolder({ year, reports, activeId, onPick }: {
  year: number;
  reports: MonthlyReport[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasActive = reports.some(r => r.id === activeId);
  const monthsComplete = reports.length;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
          hasActive ? 'bg-orange/10' : 'hover:bg-bg-tertiary/60',
        )}
      >
        <ChevronRight className={cn('h-4 w-4 text-white/40 transition-transform shrink-0', open && 'rotate-90')} />
        <div className="flex-1 min-w-0 text-left">
          <p className="font-display font-bold text-lg tracking-[-0.01em]">{year}</p>
          <p className="text-[11px] text-white/40 tabular-nums">{monthsComplete} report{monthsComplete === 1 ? '' : 's'}</p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden mt-0.5 ml-3 pl-3 border-l border-border-subtle space-y-0.5"
          >
            {reports.map(r => (
              <li key={r.id}>
                <button
                  onClick={() => onPick(r.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    activeId === r.id ? 'bg-orange/15 text-orange' : 'text-white/70 hover:bg-bg-tertiary/60 hover:text-white',
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{monthName(r.period)}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportDetail({ report }: { report: MonthlyReport }) {
  const embed = report.loomUrl ? videoEmbedUrl(report.loomUrl) : null;

  return (
    <motion.article
      key={report.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="card"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="text-xs uppercase tracking-[0.18em] text-orange font-semibold tabular-nums">{formatPeriod(report.period)}</p>
        <p className="text-xs text-white/40 tabular-nums">{new Date(report.createdAt).toLocaleDateString()}</p>
      </div>
      <h2 className="font-display font-black text-2xl md:text-3xl tracking-[-0.02em] mb-5">{report.title}</h2>

      {embed && (
        <div className="aspect-video rounded-xl border border-border-subtle overflow-hidden bg-black mb-5">
          <iframe src={embed} allow="fullscreen; clipboard-write" className="w-full h-full" title={report.title} />
        </div>
      )}

      {report.highlights && report.highlights.length > 0 && (
        <div className="grid md:grid-cols-2 gap-2 mb-5">
          {report.highlights.map((h, idx) => (
            <div key={idx} className="px-3 py-2.5 rounded-lg bg-orange/5 border border-orange/20 text-sm text-white/90">
              {h}
            </div>
          ))}
        </div>
      )}

      {report.summary && (
        <div className="text-sm text-white/80 leading-relaxed mb-5">
          <Markdown>{report.summary}</Markdown>
        </div>
      )}

      {report.files && report.files.length > 0 && (
        <div className="pt-4 border-t border-border-subtle">
          <p className="eyebrow mb-3">Attachments</p>
          <div className="space-y-2">
            {report.files.map(f => <ReportFileRow key={f.id} file={f} />)}
          </div>
        </div>
      )}
    </motion.article>
  );
}

function ReportFileRow({ file }: { file: import('../../types').ReportFile & { description?: string } }) {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      const url = await getReportFileSignedUrl(file.fileUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };
  const sizeKb = Math.round(file.fileSize / 1024);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:border-border-emphasis bg-bg-secondary/40 transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange/10 text-orange shrink-0">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.fileName}</p>
        {file.description && <p className="text-xs text-white/55 truncate">{file.description}</p>}
        <p className="text-[10px] text-white/40 tabular-nums">{sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`}</p>
      </div>
      <button onClick={download} disabled={downloading} className="btn-secondary !py-1.5 !px-3 text-xs">
        <Download className="h-3.5 w-3.5" /> {downloading ? '…' : 'Download'}
      </button>
    </div>
  );
}

function groupByYear(reports: MonthlyReport[]): Array<{ year: number; reports: MonthlyReport[] }> {
  const byYear = new Map<number, MonthlyReport[]>();
  for (const r of reports) {
    const y = Number(r.period.slice(0, 4));
    if (!Number.isFinite(y)) continue;
    (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(r);
  }
  // Newest year first, newest month first inside.
  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, yearReports]) => ({
      year,
      reports: [...yearReports].sort((a, b) => b.period.localeCompare(a.period)),
    }));
}

function monthName(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long' });
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
