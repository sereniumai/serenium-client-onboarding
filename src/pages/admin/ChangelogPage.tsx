import { useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { CHANGELOG, LATEST_CHANGELOG_DATE } from '../../config/changelog';

const LAST_SEEN_KEY = 'serenium.changelog.lastSeen';

export function markChangelogSeen() {
  try { localStorage.setItem(LAST_SEEN_KEY, LATEST_CHANGELOG_DATE); } catch {}
}

export function hasUnreadChangelog(): boolean {
  try {
    const seen = localStorage.getItem(LAST_SEEN_KEY);
    return seen !== LATEST_CHANGELOG_DATE;
  } catch {
    return false;
  }
}

export function ChangelogPage() {
  useEffect(() => { markChangelogSeen(); }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12">
        <p className="eyebrow mb-3">Product updates</p>
        <h1 className="font-display font-black text-3xl md:text-4xl tracking-[-0.025em] mb-2">What's new</h1>
        <p className="text-white/55 mb-10">Every change we ship to the portal, newest first.</p>

        <div className="space-y-5">
          {CHANGELOG.map((entry, i) => (
            <div key={i} className="card">
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <h2 className="font-display font-bold text-lg tracking-[-0.01em]">{entry.title}</h2>
                <span className="text-xs text-white/40 tabular-nums shrink-0">{entry.date}</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{entry.body}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
