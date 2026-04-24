import { useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, FileBarChart2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { useAuth } from '../../auth/AuthContext';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useOrgSnapshot } from '../../hooks/useOnboarding';
import { getOrgProgress } from '../../lib/progress';
import { listReportsForOrg, markReportsViewed } from '../../lib/db/reports';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { Markdown } from '../../components/Markdown';

export function ReportsPage() {
  const { orgSlug } = useParams();
  const { user } = useAuth();
  const { data: org, isLoading: orgLoading } = useOrgBySlug(orgSlug);
  const { snapshot, isLoading: snapLoading } = useOrgSnapshot(org?.id);
  const progress = snapshot ? getOrgProgress(snapshot) : null;
  const onboardingDone = !!progress && progress.totalModules > 0 && progress.overall === 100;

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', org?.id],
    queryFn: () => listReportsForOrg(org!.id),
    enabled: !!org?.id && onboardingDone,
  });

  useEffect(() => {
    if (user && org?.id && onboardingDone) markReportsViewed(user.id, org.id).catch(() => {});
  }, [user, org?.id, onboardingDone]);

  if (orgLoading || snapLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh] text-white/60">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      </AppShell>
    );
  }
  if (!orgSlug || !org) return <Navigate to="/login" replace />;
  if (!onboardingDone) return <Navigate to={`/onboarding/${org.slug}`} replace />;

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <section className="relative mx-auto max-w-4xl px-4 md:px-6 pt-8 md:pt-14 pb-16">
          <Link to={`/onboarding/${org.slug}`} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>

          <p className="eyebrow mb-3">Monthly reports</p>
          <h1 className="font-display font-black text-[clamp(2rem,5vw,3rem)] leading-[1.04] tracking-[-0.025em] mb-2">
            {org.businessName}'s <span className="text-orange">performance</span>.
          </h1>
          <p className="text-white/60 mb-10">Your monthly ad + growth report from the Serenium team.</p>

          {reportsLoading ? (
            <div className="text-white/50 text-sm"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="card text-center py-16">
              <FileBarChart2 className="h-10 w-10 text-orange mx-auto mb-4" />
              <h3 className="font-display font-bold text-xl mb-2">Your first report lands at month end</h3>
              <p className="text-white/60 text-sm max-w-md mx-auto">Serenium publishes a new performance report every month. You'll get an email and a notification here when it's ready.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((r, i) => {
                const embed = r.loomUrl ? videoEmbedUrl(r.loomUrl) : null;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <p className="text-xs uppercase tracking-[0.18em] text-orange font-semibold tabular-nums">{formatPeriod(r.period)}</p>
                      <p className="text-xs text-white/40 tabular-nums">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <h2 className="font-display font-bold text-2xl mb-4 tracking-[-0.01em]">{r.title}</h2>

                    {embed && (
                      <div className="aspect-video rounded-xl border border-border-subtle overflow-hidden bg-black mb-5">
                        <iframe src={embed} allow="fullscreen; clipboard-write" className="w-full h-full" title={r.title} />
                      </div>
                    )}

                    {r.highlights && r.highlights.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-2 mb-5">
                        {r.highlights.map((h, idx) => (
                          <div key={idx} className="px-3 py-2.5 rounded-lg bg-orange/5 border border-orange/20 text-sm text-white/90">
                            {h}
                          </div>
                        ))}
                      </div>
                    )}

                    {r.summary && (
                      <div className="text-sm text-white/80 leading-relaxed">
                        <Markdown>{r.summary}</Markdown>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatPeriod(period: string): string {
  // 'YYYY-MM' → 'April 2026'
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
