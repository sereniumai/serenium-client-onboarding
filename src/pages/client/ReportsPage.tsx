import { useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, Film, Download, Sparkles, ChevronLeft } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { useAuth } from '../../auth/AuthContext';
import { db } from '../../lib/mockDb';
import { useDbVersion } from '../../hooks/useDb';
import { getOrgProgress } from '../../lib/progress';
import { loomEmbedUrl } from '../../lib/loom';
import type { ReportFile } from '../../types';
import { format, parse } from 'date-fns';

export function ReportsPage() {
  const { orgSlug } = useParams();
  const { user } = useAuth();
  useDbVersion();

  const org = orgSlug ? db.getOrganizationBySlug(orgSlug) : null;
  const progress = org ? getOrgProgress(org.id) : null;
  const onboardingDone = !!progress && progress.totalModules > 0 && progress.overall === 100;

  useEffect(() => {
    if (user && org && onboardingDone) db.markReportsViewed(user.id, org.id);
  }, [user, org, onboardingDone]);

  if (!org) return <Navigate to="/login" replace />;
  if (!onboardingDone) return <Navigate to={`/onboarding/${org.slug}`} replace />;

  const reports = db.listReportsForOrg(org.id);

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />

        <section className="relative mx-auto max-w-4xl px-4 md:px-6 pt-8 md:pt-14 pb-8 md:pb-10">
          <Link to={`/onboarding/${org.slug}`} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>

          <p className="eyebrow mb-4">Monthly reports · {org.businessName}</p>
          <h1 className="font-display font-black text-[clamp(2rem,6vw,3.75rem)] leading-[1.02] tracking-[-0.03em] mb-4">
            Your <span className="text-orange">reports</span>.
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl">
            Every month we share what worked, what we learned, and what's next. All your walkthroughs and documents live here.
          </p>
        </section>

        <section className="relative mx-auto max-w-4xl px-4 md:px-6 pb-16 md:pb-24">
          {reports.length === 0 ? (
            <EmptyState businessName={org.businessName} />
          ) : (
            <div className="space-y-14">
              {reports.map((r, i) => (
                <ReportCard key={r.id} report={r} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState({ businessName }: { businessName: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card text-center py-16">
      <div className="h-16 w-16 rounded-2xl bg-orange/10 flex items-center justify-center mx-auto mb-5">
        <Sparkles className="h-8 w-8 text-orange" />
      </div>
      <h3 className="font-display font-black text-2xl tracking-[-0.025em] mb-2">First report coming soon</h3>
      <p className="text-white/60 max-w-md mx-auto">
        We're ramping up {businessName}'s campaigns. Your first monthly report will land here at the end of the month with a video breakdown and the full data.
      </p>
    </motion.div>
  );
}

function ReportCard({ report, index }: { report: ReturnType<typeof db.listReportsForOrg>[number]; index: number }) {
  const embed = report.loomUrl ? loomEmbedUrl(report.loomUrl) : null;
  const monthLabel = safeFormatPeriod(report.period);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative"
    >
      <div className="flex items-center gap-3 md:gap-4 mb-5">
        <div className="h-10 w-10 rounded-xl bg-orange text-white flex items-center justify-center font-display font-black text-xs tabular-nums shrink-0 shadow-orange-glow">
          {report.period.slice(-2)}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold">{monthLabel}</p>
          <h2 className="font-display font-black text-xl md:text-3xl leading-[1.1] tracking-[-0.025em] break-words">{report.title}</h2>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {embed ? (
          <div className="aspect-video bg-black">
            <iframe src={embed} allow="fullscreen; clipboard-write" className="w-full h-full" title={report.title} />
          </div>
        ) : null}

        <div className="p-6 md:p-8 space-y-6">
          {report.highlights && report.highlights.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {report.highlights.map((h, i) => (
                <div key={i} className="px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle">
                  <p className="text-sm font-medium text-white/90">{h}</p>
                </div>
              ))}
            </div>
          )}

          {report.summary && (
            <p className="text-white/75 leading-relaxed whitespace-pre-wrap">{report.summary}</p>
          )}

          {report.files.length > 0 && (
            <div className="pt-2">
              <p className="eyebrow mb-3">Documents</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {report.files.map(f => <FileChip key={f.id} file={f} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function FileChip({ file }: { file: ReportFile }) {
  const Icon = file.mimeType.startsWith('image/') ? ImageIcon : file.mimeType.startsWith('video/') ? Film : FileText;
  return (
    <a
      href={file.fileUrl}
      download={file.fileName}
      className="group flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-bg-tertiary hover:border-orange/40 transition-colors"
    >
      <div className="h-10 w-10 rounded-lg bg-bg flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-orange" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.fileName}</p>
        <p className="text-xs text-white/40">{formatBytes(file.fileSize)}</p>
      </div>
      <Download className="h-4 w-4 text-white/40 group-hover:text-orange transition-colors" />
    </a>
  );
}

function safeFormatPeriod(period: string): string {
  try {
    const d = parse(period, 'yyyy-MM', new Date());
    return format(d, 'MMMM yyyy');
  } catch {
    return period;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
