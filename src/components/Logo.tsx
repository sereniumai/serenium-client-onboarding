import { cn } from '../lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/serenium.avif"
      alt="Serenium"
      className={cn('brand-logo h-7 w-auto select-none', className)}
      draggable={false}
    />
  );
}
