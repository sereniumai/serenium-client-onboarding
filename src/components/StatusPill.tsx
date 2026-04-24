import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Live system-health pill. Pings /api/health every 60s. Green = all good,
 * red = health check failed. Click-through optional via `href`.
 *
 * Variant 'admin' renders a link to /admin/diagnostics with label text.
 * Variant 'client' is compact and tooltip-only - Serenium signature on
 * the client dashboard that says "the people behind this are watching it."
 */
export function StatusPill({ variant = 'admin', href }: { variant?: 'admin' | 'client'; href?: string }) {
  const [state, setState] = useState<'ok' | 'down' | 'loading'>('loading');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const t0 = performance.now();
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        if (!mounted) return;
        setState(r.ok ? 'ok' : 'down');
        setLatency(Math.round(performance.now() - t0));
      } catch {
        if (mounted) setState('down');
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const color = state === 'ok' ? 'bg-success' : state === 'down' ? 'bg-error' : 'bg-white/30';
  const shortLabel = state === 'ok' ? 'All systems operational' : state === 'down' ? 'Health check failed' : 'Checking…';
  const tooltip = latency !== null ? `${shortLabel} · ${latency}ms` : shortLabel;

  if (variant === 'client') {
    return (
      <span className="relative group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-subtle bg-bg-secondary/40 text-[11px] text-white/55 cursor-help">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {state === 'ok' && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', color)} />}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', color)} />
        </span>
        <span className="whitespace-nowrap">Portal status</span>
        <span
          role="tooltip"
          className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-bg-secondary border border-border-subtle text-[11px] text-white/85 whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20"
        >
          <span className="block font-semibold">{shortLabel}</span>
          {latency !== null && <span className="block text-white/50 mt-0.5">Round-trip {latency}ms</span>}
          <span className="block text-white/40 mt-0.5">Live health check, refreshes every 60s.</span>
        </span>
      </span>
    );
  }

  const content = (
    <>
      <span className="relative flex h-2 w-2 shrink-0">
        {state === 'ok' && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', color)} />}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
      </span>
      <Heart className="h-3.5 w-3.5" />
      <span className="hidden md:inline">{shortLabel}</span>
      <span className="md:hidden">Status</span>
    </>
  );
  const className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle bg-bg-secondary/60 hover:bg-bg-secondary transition-colors text-xs text-white/70 hover:text-white';
  if (href) {
    return <a href={href} title={tooltip} className={className}>{content}</a>;
  }
  return <span title={tooltip} className={className}>{content}</span>;
}
