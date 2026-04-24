import { CheckCircle2, Sparkles, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import type { Organization } from '../types';

/**
 * Shown to clients who have finished 100% of onboarding but whose org.status
 * is still 'onboarding'. Transitions to 'live' (reports unlocked) when the
 * Serenium team reviews + flips the switch on the admin side.
 */
export function PendingReview({ org, firstName }: { org: Organization; firstName: string }) {
  useEffect(() => {
    // Celebration on first mount only.
    const t = setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.4 },
        colors: ['#FF6B1F', '#FF7A35', '#FFD4BA', '#ffffff'],
        zIndex: 9999,
      });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-16 md:py-24 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative inline-flex items-center justify-center mb-6"
      >
        <span className="absolute inset-0 rounded-full bg-orange/30 blur-2xl animate-pulse" />
        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-orange to-orange-hover flex items-center justify-center shadow-orange-glow">
          <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <p className="eyebrow mb-3">Onboarding complete</p>
      <h1 className="font-display font-black text-[clamp(2rem,6vw,3.5rem)] leading-[1.02] tracking-[-0.03em] mb-4">
        Nice work, <span className="text-orange">{firstName}</span>. That's everything.
      </h1>
      <p className="text-white/65 text-lg leading-relaxed max-w-xl mx-auto mb-8">
        You've given us everything we need for <span className="text-white">{org.businessName}</span>. The Serenium team is reviewing your setup right now. We'll reach out if anything needs tightening up.
      </p>

      <div className="card max-w-lg mx-auto mb-8 text-left">
        <p className="eyebrow mb-4">What happens next</p>
        <ol className="space-y-3 text-sm text-white/75">
          <StepItem num="1" title="We review your submissions">
            Rob + Adam comb through everything and flag anything that needs clarification.
          </StepItem>
          <StepItem num="2" title="You'll hear from us within a couple of working days">
            We'll email you if we need anything else. Otherwise you'll get the green light.
          </StepItem>
          <StepItem num="3" title="Your portal switches to reports mode">
            From there, every monthly performance report lands here. You'll get an email the moment it's published.
          </StepItem>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
        <a href="mailto:contact@sereniumai.com" className="inline-flex items-center gap-2 text-orange hover:text-orange-hover">
          <Mail className="h-4 w-4" /> contact@sereniumai.com
        </a>
        <span className="hidden sm:inline text-white/30">·</span>
        <span className="inline-flex items-center gap-2 text-white/50">
          <Sparkles className="h-4 w-4 text-orange" /> Thanks for trusting Serenium.
        </span>
      </div>
    </div>
  );
}

function StepItem({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="h-6 w-6 rounded-full bg-orange/15 text-orange flex items-center justify-center text-xs font-bold tabular-nums shrink-0 mt-0.5">{num}</span>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-white/55 text-xs leading-relaxed mt-0.5">{children}</p>
      </div>
    </li>
  );
}
