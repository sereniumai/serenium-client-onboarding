import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { upsertSubmission, getSubmission } from '../lib/db/submissions';
import { qk } from '../lib/queryClient';

type Status = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave for a single submission row.
 *
 * On mount: fetches the initial value from Supabase (one-shot, not cached
 * through React Query to avoid write-after-invalidate races). After that,
 * any change kicks an 800ms debounce, upserts to Supabase, and reports
 * saving → saved → idle.
 *
 * Status transitions:
 *   idle → saving (on change) → saved (on success) → idle (after 1.8s)
 *                              → error (on failure, sticky)
 */
export function useAutosave<T>(organizationId: string, fieldKey: string, userId?: string) {
  const qc = useQueryClient();
  const [value, setValue] = useState<T | undefined>(undefined);
  const [status, setStatus] = useState<Status>('idle');

  const saveTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const initial = useRef(true);
  const keyRef = useRef(`${organizationId}::${fieldKey}`);

  // Initial load + re-seed whenever org/field identity changes.
  useEffect(() => {
    const nextKey = `${organizationId}::${fieldKey}`;
    let cancelled = false;
    keyRef.current = nextKey;
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

  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    setStatus('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      upsertSubmission({ organizationId, fieldKey, value, userId })
        .then(() => {
          setStatus('saved');
          qc.invalidateQueries({ queryKey: qk.submissions(organizationId) });
          if (resetTimer.current) window.clearTimeout(resetTimer.current);
          resetTimer.current = window.setTimeout(() => {
            setStatus(s => (s === 'saved' ? 'idle' : s));
          }, 1800);
        })
        .catch(() => { setStatus('error'); });
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, organizationId, fieldKey]);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  return { value, setValue, status };
}
