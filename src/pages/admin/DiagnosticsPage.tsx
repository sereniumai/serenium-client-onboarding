import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Activity, Database, MessageSquare, Mail, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/cn';

type Status = 'pending' | 'ok' | 'fail';

interface Check {
  id: string;
  label: string;
  icon: typeof Database;
  status: Status;
  detail?: string;
  latencyMs?: number;
}

const INITIAL: Check[] = [
  { id: 'health',       label: 'App edge runtime',     icon: Activity,      status: 'pending' },
  { id: 'supabase',     label: 'Supabase API',         icon: Database,      status: 'pending' },
  { id: 'profiles',     label: 'Profiles table (RLS)', icon: ShieldCheck,   status: 'pending' },
  { id: 'session',      label: 'Auth session',         icon: ShieldCheck,   status: 'pending' },
  { id: 'anthropic',    label: 'Anthropic assistant',  icon: MessageSquare, status: 'pending' },
  { id: 'resend',       label: 'Resend (test email)',  icon: Mail,          status: 'pending' },
];

export function DiagnosticsPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [running, setRunning] = useState(false);

  const update = (id: string, patch: Partial<Check>) =>
    setChecks(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)));

  const run = async () => {
    setRunning(true);
    setChecks(INITIAL);

    // 1. /api/health
    await timed('health', async () => {
      const r = await fetch('/api/health');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const b = await r.json();
      return `env=${b.env} · release=${b.release}`;
    });

    // 2. Supabase API reachability (any authenticated endpoint)
    await timed('supabase', async () => {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return 'round-trip OK';
    });

    // 3. Profiles RLS, read own row
    await timed('profiles', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');
      const { data, error } = await supabase.from('profiles').select('id,role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('profile row not found');
      return `role=${(data as { role: string }).role}`;
    });

    // 4. Auth session present + not expired
    await timed('session', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('no session');
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const minsLeft = expiresAt ? Math.round((expiresAt.getTime() - Date.now()) / 60000) : null;
      return minsLeft !== null ? `expires in ${minsLeft} min` : 'session active';
    });

    // 5. Anthropic via ask-assistant (with a trivial prompt so it's quick + cheap)
    await timed('anthropic', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('not authenticated');
      const r = await fetch('/api/ask-assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ question: 'ping', mode: 'onboarding', history: [] }),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 80)}`);
      }
      const b = await r.json();
      return b.reply ? `reply (${String(b.reply).length} chars)` : 'empty reply';
    });

    // 6. Resend, skip the actual send, just confirm the endpoint returns 400
    // for a missing `to` rather than 503 (not configured). A 503 would mean
    // env vars are missing on the server side.
    await timed('resend', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('not authenticated');
      const r = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}), // intentionally empty
      });
      if (r.status === 503) throw new Error('server env not configured');
      // Any other response (400, 401, 429) means the function is reachable.
      return `reachable (HTTP ${r.status})`;
    });

    setRunning(false);

    async function timed(id: string, fn: () => Promise<string | void>) {
      const t0 = performance.now();
      try {
        const detail = await fn();
        update(id, { status: 'ok', detail: detail ?? undefined, latencyMs: Math.round(performance.now() - t0) });
      } catch (e) {
        update(id, { status: 'fail', detail: e instanceof Error ? e.message : String(e), latencyMs: Math.round(performance.now() - t0) });
      }
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const allOk = checks.every(c => c.status === 'ok');
  const anyFail = checks.some(c => c.status === 'fail');

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Admin · Diagnostics</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">
                System <span className="text-orange">health</span>
              </h1>
              <p className="text-white/60 text-sm max-w-2xl">
                Live round-trip check of everything the portal depends on. If something's red, clients are likely hitting it.
              </p>
            </div>
            <button onClick={run} disabled={running} className="btn-secondary">
              <RefreshCw className={cn('h-4 w-4', running && 'animate-spin')} /> Re-run
            </button>
          </div>

          <div className={cn(
            'mb-6 rounded-xl border p-4 flex items-center gap-3',
            allOk && 'border-success/30 bg-success/5',
            anyFail && 'border-error/30 bg-error/5',
            !allOk && !anyFail && 'border-orange/30 bg-orange/5',
          )}>
            {allOk ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> :
             anyFail ? <XCircle className="h-5 w-5 text-error shrink-0" /> :
                       <Loader2 className="h-5 w-5 text-orange animate-spin shrink-0" />}
            <p className="text-sm">
              {allOk   ? 'All systems green.' :
               anyFail ? 'One or more checks failed, see details below.' :
                         'Running checks…'}
            </p>
          </div>

          <div className="card p-0 divide-y divide-border-subtle">
            {checks.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                    c.status === 'ok'      && 'bg-success/10 text-success',
                    c.status === 'fail'    && 'bg-error/10 text-error',
                    c.status === 'pending' && 'bg-white/5 text-white/50',
                  )}>
                    {c.status === 'pending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{c.label}</p>
                    {c.detail && (
                      <p className={cn(
                        'text-xs mt-0.5 truncate',
                        c.status === 'fail' ? 'text-error' : 'text-white/50',
                      )}>{c.detail}</p>
                    )}
                  </div>
                  {typeof c.latencyMs === 'number' && (
                    <span className="text-xs text-white/35 tabular-nums shrink-0">{c.latencyMs}ms</span>
                  )}
                  {c.status === 'ok'   && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  {c.status === 'fail' && <XCircle className="h-4 w-4 text-error shrink-0" />}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-white/35 mt-6">
            Tip: bookmark this page. When a client reports something's broken, run these checks first.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
