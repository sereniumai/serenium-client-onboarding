/**
 * Impersonation context helpers.
 *
 * When an admin has `?impersonate=1` in the URL they're actively acting as
 * a client inside that client's onboarding view. Any mutations they make
 * should be auditable as admin-originated, not client-originated. Rather
 * than thread a flag through every call site we check the current URL at
 * write-time - cheap, always fresh, no stale cache headaches.
 *
 * The admin_impersonation_audit table separately records the session
 * (when they opened the impersonation view) - this helper lets individual
 * writes be flagged too, so the activity_log shows which edits happened
 * inside an impersonation session.
 */

/**
 * Cheap, synchronous check. Reads the URL live each call; URLSearchParams
 * parsing is O(length) which is trivial at our scale.
 */
export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('impersonate') === '1';
  } catch {
    return false;
  }
}

/**
 * Returns a metadata object ready to spread into an activity_log insert.
 * Always includes `impersonating` (true or false) so the column is never
 * absent - makes filtering `metadata->>impersonating` in SQL reliable.
 */
export function impersonationMetadata(): { impersonating: boolean } {
  return { impersonating: isImpersonating() };
}
