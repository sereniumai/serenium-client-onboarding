/**
 * Impersonation ("View as client") relies on a fast user switch that doesn't
 * exist in Supabase Auth yet, you can't swap sessions without re-authenticating.
 * Re-designed in Phase 7 using an admin-scoped read token. Until then the
 * banner is inert but the export exists so routing code still compiles.
 */
export function registerImpersonation(_adminUserId: string) { /* no-op */ }

export function ImpersonationBanner() {
  return null;
}
