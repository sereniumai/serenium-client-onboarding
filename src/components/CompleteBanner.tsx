import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

export function CompleteBanner({ hasReports }: { hasReports: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden mb-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange/25 via-orange/10 to-transparent" />
      <div className="absolute inset-0 bg-hero-glow opacity-50" />
      <div className="relative border border-orange/30 rounded-2xl p-5 md:p-7 flex items-start gap-4">
        <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-orange text-white flex items-center justify-center shrink-0 shadow-orange-glow">
          <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow mb-1 flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> All set</p>
          <h2 className="font-display font-black text-lg md:text-2xl leading-[1.15] tracking-[-0.02em] mb-1">Onboarding complete — we're live on your account.</h2>
          <p className="text-white/70 text-sm">
            {hasReports
              ? "We're working in the background. Your latest monthly report is below."
              : "Your first monthly report will land here at the end of the month with a video breakdown and full performance data."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
