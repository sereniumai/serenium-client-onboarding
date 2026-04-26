import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, Globe2, MessageCircleQuestion, Lock } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/cn';

type Status = 'pending' | 'ok' | 'degraded';

interface Check {
  id: string;
  label: string;
  description: string;
  icon: typeof Globe2;
  status: Status;
}

// Client-facing status page. Plain language only , no jargon, no error
// strings, no latency numbers. The intent is "is the portal healthy?"
// answered in one glance, not a debug tool.
const INITIAL: Check[] = [
  {
    id: 'portal',
    label: 'Portal connection',
    description: 'Saving your answers and loading your dashboard.',
    icon: Globe2,
    status: 'pending',
  },
  {
    id: 'session',
    label: 'Your secure sign-in',
    description: 'Keeping your account logged in safely.',
    icon: Lock,
    status: 'pending',
  },
  {
    id: 'aria',
    label: 'Aria, your AI helper',
    description: 'The assistant in the bottom-right when you need help.',
    icon: MessageCircleQuestion,
    status: 'pending',
  },
];

export function SystemStatusPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [running, setRunning] = useState(false);

  const update = (id: string, patch: Partial<Check>) =>
    setChecks(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)));

  const run = async () => {
    setRunning(true);
    setChecks(INITIAL);

    await runCheck('portal', async () => {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if (error) throw error;
    });

    await runCheck('session', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('no session');
    });

    await runCheck('aria', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('no session');
      const r = await fetch('/api/ask-assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ question: 'ping', mode: 'onboarding', history: [] }),
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
    });

    setRunning(false);

    async function runCheck(id: string, fn: () => Promise<void>) {
      try {
        await fn();
        update(id, { status: 'ok' });
      } catch {
        update(id, { status: 'degraded' });
      }
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const allOk = checks.every(c => c.status === 'ok');
  const anyDegraded = checks.some(c => c.status === 'degraded');
  const anyPending = checks.some(c => c.status === 'pending');

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Status</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">
                System <span className="text-orange">status</span>
              </h1>
              <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
                Live status of the systems your portal depends on. If something's down, our team is already on it.
              </p>
            </div>
            <button onClick={run} disabled={running} className="btn-secondary whitespace-nowrap shrink-0 self-start">
              <RefreshCw className={cn('h-4 w-4', running && 'animate-spin')} /> Re-check
            </button>
          </div>

          <div className={cn(
            'mb-6 rounded-xl border p-5 flex items-center gap-4',
            allOk && 'border-success/30 bg-success/5',
            anyDegraded && 'border-orange/30 bg-orange/5',
            anyPending && !anyDegraded && 'border-white/10 bg-bg-secondary/40',
          )}>
            {anyPending ? (
              <Loader2 className="h-6 w-6 text-orange animate-spin shrink-0" />
            ) : allOk ? (
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange shrink-0" />
            )}
            <div>
              <p className="font-semibold text-base text-white">
                {anyPending ? 'Checking…' : allOk ? 'All systems normal' : "We're investigating"}
              </p>
              <p className="text-sm text-white/55 mt-0.5">
                {anyPending
                  ? 'Running through each system, this takes a few seconds.'
                  : allOk
                  ? "Your portal's running smoothly. Carry on."
                  : "Something isn't responding the way it should. Our team is automatically alerted, no action needed from you."}
              </p>
            </div>
          </div>

          <div className="card p-0 divide-y divide-border-subtle">
            {checks.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                    c.status === 'ok'       && 'bg-success/10 text-success',
                    c.status === 'degraded' && 'bg-orange/10 text-orange',
                    c.status === 'pending'  && 'bg-white/5 text-white/45',
                  )}>
                    {c.status === 'pending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90">{c.label}</p>
                    <p className="text-xs text-white/55 mt-0.5">{c.description}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full shrink-0',
                    c.status === 'ok'       && 'bg-success/15 text-success',
                    c.status === 'degraded' && 'bg-orange/15 text-orange',
                    c.status === 'pending'  && 'bg-white/5 text-white/55',
                  )}>
                    {c.status === 'ok' ? 'Normal' : c.status === 'degraded' ? 'Investigating' : 'Checking'}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-white/40 mt-6 leading-relaxed">
            Need help? Tap Aria in the bottom-right of any screen, or email <a href="mailto:contact@sereniumai.com" className="text-orange hover:text-orange-hover underline-offset-2 hover:underline">contact@sereniumai.com</a> and we'll get back to you fast.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
