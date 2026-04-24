/**
 * Impersonation context helpers.
 *
 * When an admin has `?impersonate=1` in the URL they're actively acting as
 * a client inside that client's onboarding view. Any mutations they make
 * should be auditable as admin-originated, not client-originated. We store
 * this signal at window-scope so every db call can attach `impersonating:
 * true` to its activity_log metadata without needing to thread a flag
 * through every call site.
 *
 * The admin_impersonation_audit table separately records the session
 * (when they opened the impersonation view) — this helper lets individual
 * writes be flagged too, so the activity_log shows which edits happened
 * inside an impersonation session.
 */

let cachedImpersonating: boolean | null = null;

function readFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('impersonate') === '1';
  } catch {
    return false;
  }
}

/**
 * Cheap, synchronous check. Cached for the lifetime of the current URL —
 * if the URL changes (navigation), React Router will re-render and a fresh
 * read will land.
 */
export function isImpersonating(): boolean {
  if (cachedImpersonating === null) {
    cachedImpersonating = readFromUrl();
  }
  return cachedImpersonating;
}

/** Reset the cache. Call on route transitions. */
export function refreshImpersonationContext(): void {
  cachedImpersonating = readFromUrl();
}

/**
 * Returns a metadata object ready to spread into an activity_log insert.
 * Always includes `impersonating` (true or false) so the column is never
 * absent — makes filtering `metadata->>impersonating` in SQL reliable.
 */
export function impersonationMetadata(): { impersonating: boolean } {
  return { impersonating: isImpersonating() };
}
