/**
 * Impersonation context.
 *
 * "View as client" lets an admin experience a client's portal exactly as that
 * client sees it (sidebar, dashboards, paused screens, the lot). The active
 * impersonation slug lives in sessionStorage so it survives client-side
 * navigation within the tab, is scoped to the tab (so opening a fresh admin
 * tab doesn't inherit it), and is dropped on signOut.
 *
 * Mutations made during impersonation are tagged with `impersonating: true`
 * in activity_log metadata so audit trails clearly show admin-originated
 * edits. The admin_impersonation_audit table separately records the session.
 */
const KEY = 'serenium.impersonation';
export const IMPERSONATION_EVENT = 'serenium:impersonation-change';

export function getImpersonatedOrgSlug(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function startImpersonation(orgSlug: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, orgSlug);
    window.dispatchEvent(new CustomEvent(IMPERSONATION_EVENT));
  } catch {
    // sessionStorage blocked, impersonation just won't activate, the admin
    // sees the regular admin view of the client. Not worth surfacing.
  }
}

export function stopImpersonation(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(IMPERSONATION_EVENT));
  } catch {
    // sessionStorage blocked, nothing to do.
  }
}

export function isImpersonating(): boolean {
  return !!getImpersonatedOrgSlug();
}

/**
 * Spread into activity_log inserts. Always includes the boolean so
 * `metadata->>impersonating` is reliable for SQL filtering.
 */
export function impersonationMetadata(): { impersonating: boolean } {
  return { impersonating: isImpersonating() };
}
