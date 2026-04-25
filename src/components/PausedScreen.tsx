import { Pause, Mail } from 'lucide-react';
import { AppShell } from './AppShell';
import { HeroGlow } from './HeroGlow';

/**
 * Shown to a client when their org is paused or churned. Blocks portal
 * features without revoking auth, so admin can flip status back to 'live'
 * and the same login walks straight back in. All their submissions, reports,
 * uploads and conversations are preserved untouched.
 */
export function PausedScreen({ businessName, status }: {
  businessName: string;
  status: 'paused' | 'churned';
}) {
  const isPaused = status === 'paused';
  const headline = isPaused ? 'Your portal is paused.' : 'Your portal is archived.';
  const subline = isPaused
    ? "We've put things on hold for now. All your info, reports, and history are safely kept. When you're ready to come back, just reply to your last email and we'll switch the lights back on."
    : "Your account has been archived. All your data, reports, and history are preserved. To reactivate, just reach out and we'll get you set up again.";

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-2xl px-4 md:px-6 pt-16 md:pt-24 pb-16 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange mb-6">
            <Pause className="h-6 w-6" />
          </div>
          <p className="eyebrow mb-3">{businessName}</p>
          <h1 className="font-display font-black text-[clamp(2rem,5vw,2.75rem)] leading-[1.05] tracking-[-0.025em] mb-4">
            {headline}
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-lg mx-auto leading-relaxed mb-8">
            {subline}
          </p>
          <a
            href="mailto:contact@sereniumai.com"
            className="btn-primary inline-flex"
          >
            <Mail className="h-4 w-4" /> Get in touch
          </a>
        </div>
      </div>
    </AppShell>
  );
}
