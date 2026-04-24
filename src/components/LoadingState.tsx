import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Unified loading state used in place of the ~15 bespoke
 *   <div className="card text-center text-white/50 py-12">
 *     <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
 *     Loading…
 *   </div>
 * blocks that had drifted across the codebase. Consistent spinner size,
 * copy tone, and spacing everywhere.
 *
 * Variants:
 *  - 'card'   → takes container width, padded card surface (tab bodies, page shells)
 *  - 'inline' → row-height helper, paints next to other content (section headers, list rows)
 *  - 'page'   → full viewport height, used for top-of-app boots like RouteLoader
 */
interface Props {
  label?: string;
  variant?: 'card' | 'inline' | 'page';
  className?: string;
}

export function LoadingState({ label = 'Loading…', variant = 'card', className }: Props) {
  if (variant === 'page') {
    return (
      <div className={cn('min-h-screen flex items-center justify-center bg-bg', className)}>
        <div className="flex flex-col items-center gap-3 text-white/55">
          <Loader2 className="h-6 w-6 animate-spin text-orange" />
          <p className="text-xs uppercase tracking-wider">{label}</p>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-2 text-sm text-white/55', className)}>
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div className={cn('card flex items-center justify-center text-white/55 py-12', className)}>
      <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
      <span>{label}</span>
    </div>
  );
}
