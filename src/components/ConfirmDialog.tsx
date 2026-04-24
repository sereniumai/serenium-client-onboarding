import { AlertTriangle } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { cn } from '../lib/cn';

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'destructive' shows red accents. Default is a neutral primary button. */
  tone?: 'neutral' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Branded confirmation dialog. Drop-in replacement for window.confirm() that:
 *  - matches the portal's dark + orange aesthetic
 *  - supports keyboard dismissal (Esc) and focus return on close
 *  - backdrop click cancels (matches native confirm behaviour closely enough)
 *  - destructive tone puts the "yes" button on the right in error red
 *
 * Call sites should render this conditionally off an `open` state, typically
 * kept in a `useState<{…} | null>` so multiple triggers can share a single
 * dialog instance if needed.
 */
export function ConfirmDialog({
  open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'neutral', onConfirm, onCancel,
}: Props) {
  const modalRef = useModal(open, onCancel);
  if (!open) return null;

  const confirmClass = tone === 'destructive' ? 'btn-danger' : 'btn-primary';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-body"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        ref={modalRef}
        className="card max-w-md w-full space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
            tone === 'destructive' ? 'bg-error/10 text-error' : 'bg-orange/10 text-orange',
          )}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="font-display font-bold text-lg tracking-[-0.01em]">{title}</h3>
            <p id="confirm-dialog-body" className="text-xs text-white/60 leading-relaxed mt-1">{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel} className="btn-secondary">{cancelLabel}</button>
          <button onClick={onConfirm} className={confirmClass}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
