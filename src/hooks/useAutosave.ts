import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as Sentry from '@sentry/react';
import { upsertSubmission, getSubmission } from '../lib/db/submissions';
import { qk } from '../lib/queryClient';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave<T>(organizationId: string, fieldKey: string, userId?: string) {
  const qc = useQueryClient();
  const [value, setValue] = useState<T | undefined>(undefined);
  const [status, setStatus] = useState<Status>('idle');

  const saveTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const initial = useRef(true);
  const pendingValue = useRef<T | undefined>(undefined);
  const pendingArgs = useRef<{ organizationId: string; fieldKey: string; userId?: string }>({ organizationId, fieldKey, userId });

  useEffect(() => {
    pendingArgs.current = { organizationId, fieldKey, userId };
  }, [organizationId, fieldKey, userId]);

  // Initial load + re-seed whenever org/field identity changes.
  useEffect(() => {
    let cancelled = false;
    initial.current = true;
    setStatus('idle');
    getSubmission(organizationId, fieldKey)
      .then(sub => {
        if (cancelled) return;
        setValue(sub?.value as T | undefined);
      })
      .catch(() => { /* empty state on load fail, next save will overwrite */ });
    return () => { cancelled = true; };
  }, [organizationId, fieldKey]);

  const runSave = (v: T | undefined, args: typeof pendingArgs.current) => {
    return upsertSubmission({ organizationId: args.organizationId, fieldKey: args.fieldKey, value: v, userId: args.userId })
      .then(() => {
        setStatus('saved');
        qc.invalidateQueries({ queryKey: qk.submissions(args.organizationId) });
        if (resetTimer.current) window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => {
          setStatus(s => (s === 'saved' ? 'idle' : s));
        }, 1800);
      })
      .catch((err) => {
        setStatus('error');
        Sentry.captureException(err, { extra: { fieldKey: args.fieldKey, organizationId: args.organizationId } });
        toast.error("Couldn't save your changes", {
          description: 'Check your connection and try again.',
          duration: 6000,
        });
      });
  };

  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    setStatus('saving');
    pendingValue.current = value;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      pendingValue.current = undefined;
      runSave(value, pendingArgs.current);
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, organizationId, fieldKey]);

  // Flush any pending debounced save when the component unmounts. Without
  // this, fast typing followed by navigation would lose the last keystrokes.
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      if (pendingValue.current !== undefined) {
        // Fire-and-forget; we're unmounting so we can't surface result in state.
        void runSave(pendingValue.current, pendingArgs.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { value, setValue, status };
}
