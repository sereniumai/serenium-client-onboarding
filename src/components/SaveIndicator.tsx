import { Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/cn';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function SaveIndicator({ status }: { status: Status }) {
  if (status === 'idle') return null;
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
      status === 'saving' && 'text-orange bg-orange/10',
      status === 'saved' && 'text-success bg-success/10',
      status === 'error' && 'text-error bg-error/10',
    )}>
      {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'saved' && <Check className="h-3 w-3" />}
      {status === 'error' && <AlertCircle className="h-3 w-3" />}
      <span>{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save failed'}</span>
    </div>
  );
}
