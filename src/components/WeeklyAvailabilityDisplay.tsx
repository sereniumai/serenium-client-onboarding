import { cn } from '../lib/cn';

// Tailwind class helpers kept static so the JIT picks them up at build.
const GRID_CLASSES: Record<number, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-4 md:grid-cols-7',
};

export type DaySchedule = {
  closed?: boolean;
  open?: string;
  close?: string;
  breakStart?: string;
  breakEnd?: string;
};

export type WeekSchedule = Record<string, DaySchedule | undefined>;

const ALL_DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export function WeeklyAvailabilityDisplay({ schedule }: { schedule: WeekSchedule }) {
  // Only render days actually present in the schedule. Fall back to Mon–Fri if empty.
  const present = ALL_DAYS.filter(d => schedule[d.key] !== undefined);
  const DAYS = present.length > 0 ? present : ALL_DAYS.slice(0, 5);
  const gridCols = GRID_CLASSES[DAYS.length] ?? 'grid-cols-5';
  return (
    <div className={cn('grid gap-1.5 max-w-md', gridCols)}>
      {DAYS.map(({ key, label }) => {
        const d = schedule[key] ?? {};
        const closed = !!d.closed;
        return (
          <div
            key={key}
            className={cn(
              'rounded-md border p-2 text-center',
              closed ? 'bg-white/5 border-border-subtle text-white/40' : 'bg-orange/5 border-orange/20',
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
            {closed ? (
              <div className="text-xs mt-1 text-white/40">Closed</div>
            ) : (
              <>
                <div className="text-xs font-mono mt-1 text-white/90">{d.open ?? '-'}</div>
                <div className="text-[10px] text-white/40">to</div>
                <div className="text-xs font-mono text-white/90">{d.close ?? '-'}</div>
                {d.breakStart && d.breakEnd && (
                  <div className="text-[10px] text-white/40 mt-1 pt-1 border-t border-border-subtle">
                    Break {d.breakStart}–{d.breakEnd}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
