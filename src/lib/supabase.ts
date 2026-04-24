import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Add them to .env.local (or Vercel env vars in production).',
  );
}

/**
 * Supabase client (untyped at the generic level; we enforce shapes at the
 * mapper boundary instead). When we stabilize, run `supabase gen types` to
 * regenerate typed bindings and re-introduce the Database generic.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'serenium-auth',
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});
