import { Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/cn';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function SaveIndicator({ status }: { status: Status }) {
  const display = status === 'idle' ? 'saved' : status;
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
      display === 'saving' && 'text-orange bg-orange/10',
      display === 'saved' && 'text-white/50 bg-white/5',
      display === 'error' && 'text-error bg-error/10',
    )}>
      {display === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
      {display === 'saved' && <Check className="h-3 w-3" />}
      {display === 'error' && <AlertCircle className="h-3 w-3" />}
      <span>
        {display === 'saving' ? 'Saving…' : display === 'saved' ? 'All changes saved' : 'Save failed'}
      </span>
    </div>
  );
}
