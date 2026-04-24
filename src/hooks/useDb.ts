/**
 * Legacy pub/sub hook from the mockDb era. React Query handles reactivity now,
 * kept as a no-op so existing imports compile during the migration sweep.
 */
export function useDbVersion(): number {
  return 0;
}
