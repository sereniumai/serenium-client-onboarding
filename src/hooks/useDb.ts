import { useSyncExternalStore } from 'react';
import { db } from '../lib/mockDb';

// Triggers re-render whenever the mock DB changes.
export function useDbVersion() {
  return useSyncExternalStore(
    (cb) => db.subscribe(cb),
    () => localStorage.getItem('serenium.mockdb.v2') ?? '',
    () => '',
  );
}
