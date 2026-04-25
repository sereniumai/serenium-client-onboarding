import { Users } from 'lucide-react';
import type { PresenceUser } from '../hooks/usePresence';

/**
 * Subtle badge shown when another user is on the same module. Stops two
 * teammates silently overwriting each other through autosave.
 */
export function PresenceBanner({ others }: { others: PresenceUser[] }) {
  if (others.length === 0) return null;

  const label = others.length === 1
    ? `${firstName(others[0].name)} is also here`
    : `${others.length} others are also here`;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-warning/30 bg-warning/10 text-warning text-xs font-medium"
      title={others.map(o => o.name).join(', ') + ' are editing this section. Recent edits may overwrite each other.'}
    >
      <Users className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}

function firstName(full: string): string {
  return (full ?? '').split(' ')[0] || 'Someone';
}
