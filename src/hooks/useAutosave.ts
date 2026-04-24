import { useEffect, useRef, useState } from 'react';
import { db } from '../lib/mockDb';

type Status = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave for a single field on the `submissions` table. The initial
 * value is read once per (organizationId, fieldKey) pair via lazy state; after
 * that all updates go through a 800ms debounce. Status transitions:
 *   idle → saving (on change) → saved (on success) → idle (after 1.8s)
 *                              → error (on failure, sticky)
 */
export function useAutosave<T>(organizationId: string, fieldKey: string, userId?: string) {
  // Seed state lazily — re-seed whenever orgId or fieldKey changes so the hook
  // can be reused across different fields without carrying stale values.
  const [value, setValue] = useState<T | undefined>(
    () => db.getSubmission(organizationId, fieldKey)?.value as T | undefined,
  );
  const [status, setStatus] = useState<Status>('idle');
  const saveTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const initial = useRef(true);
  const keyRef = useRef(`${organizationId}::${fieldKey}`);

  // If the identity of the hook instance changes (different org/field), re-seed
  // the value and reset the "initial" flag so we don't autosave stale data.
  useEffect(() => {
    const nextKey = `${organizationId}::${fieldKey}`;
    if (keyRef.current !== nextKey) {
      keyRef.current = nextKey;
      initial.current = true;
      setValue(db.getSubmission(organizationId, fieldKey)?.value as T | undefined);
      setStatus('idle');
    }
  }, [organizationId, fieldKey]);

  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    setStatus('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        db.upsertSubmission({ organizationId, fieldKey, value, updatedBy: userId });
        setStatus('saved');
        if (resetTimer.current) window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => {
          setStatus(s => (s === 'saved' ? 'idle' : s));
        }, 1800);
      } catch {
        setStatus('error');
      }
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // userId omitted intentionally — it's injected once per session, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, organizationId, fieldKey]);

  // Clean up the status-reset timer on unmount so we don't setState after unmount.
  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  return { value, setValue, status };
}
