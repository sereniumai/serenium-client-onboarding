import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import type { MonthlyReport } from '../types';
import { format, parse } from 'date-fns';
import { videoEmbedUrl } from '../lib/videoEmbed';

export function LatestReportHero({ report, orgSlug }: { report: MonthlyReport; orgSlug: string }) {
  const embed = report.loomUrl ? videoEmbedUrl(report.loomUrl) : null;
  const month = safeFormatPeriod(report.period);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-10"
    >
      <div className="card p-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-hero-glow opacity-60 pointer-events-none" />
        <div className="relative grid md:grid-cols-[1.1fr,1fr] gap-0">
          {embed ? (
            <div className="aspect-video md:aspect-auto md:h-full bg-black">
              <iframe src={embed} allow="fullscreen; clipboard-write" className="w-full h-full" title={report.title} />
            </div>
          ) : (
            <div className="aspect-video md:aspect-auto md:h-full bg-bg-tertiary flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-orange/20 flex items-center justify-center mx-auto mb-3">
                  <Play className="h-7 w-7 text-orange" />
                </div>
                <p className="text-sm text-white/50">Video walkthrough coming</p>
              </div>
            </div>
          )}
          <div className="p-5 md:p-8 flex flex-col">
            <p className="eyebrow mb-3">Latest report · {month}</p>
            <h2 className="font-display font-black text-xl md:text-3xl leading-[1.1] tracking-[-0.025em] mb-3">{report.title}</h2>
            {report.summary && (
              <p className="text-white/60 text-sm leading-relaxed line-clamp-4 mb-5">{report.summary}</p>
            )}
            {report.highlights && report.highlights.length > 0 && (
              <div className="grid gap-2 mb-6">
                {report.highlights.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange shrink-0" />
                    <span className="text-white/80">{h}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-auto pt-2">
              <Link to={`/onboarding/${orgSlug}/reports`} className="btn-primary">
                View full report <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function safeFormatPeriod(period: string): string {
  try { return format(parse(period, 'yyyy-MM', new Date()), 'MMMM yyyy'); }
  catch { return period; }
}
