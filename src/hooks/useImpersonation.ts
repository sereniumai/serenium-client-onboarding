import { useEffect, useState } from 'react';
import { getImpersonatedOrgSlug, IMPERSONATION_EVENT } from '../lib/impersonation';

/**
 * Reactive read of the current impersonation slug. Subscribes to a custom
 * event we dispatch from start/stop helpers so any component using this hook
 * re-renders the moment impersonation toggles.
 */
export function useImpersonation(): { orgSlug: string | null; active: boolean } {
  const [orgSlug, setOrgSlug] = useState<string | null>(getImpersonatedOrgSlug);
  useEffect(() => {
    const sync = () => setOrgSlug(getImpersonatedOrgSlug());
    window.addEventListener(IMPERSONATION_EVENT, sync);
    return () => window.removeEventListener(IMPERSONATION_EVENT, sync);
  }, []);
  return { orgSlug, active: !!orgSlug };
}
