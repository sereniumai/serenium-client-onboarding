import { useEffect, useRef, useState } from 'react';
import { db } from '../lib/mockDb';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave<T>(organizationId: string, fieldKey: string, userId?: string) {
  const existing = db.getSubmission(organizationId, fieldKey);
  const [value, setValue] = useState<T | undefined>(existing?.value as T | undefined);
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<number | null>(null);
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    setStatus('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        db.upsertSubmission({ organizationId, fieldKey, value, updatedBy: userId });
        setStatus('saved');
        window.setTimeout(() => setStatus(s => s === 'saved' ? 'idle' : s), 1800);
      } catch {
        setStatus('error');
      }
    }, 800);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, organizationId, fieldKey]);

  return { value, setValue, status };
}
