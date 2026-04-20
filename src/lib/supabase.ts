import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase client — returns null if env vars aren't set (local mock mode).
// Once keys are configured in .env.local, this becomes the live backend.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabase = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (!hasSupabase && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info('[serenium] Running in local mock mode. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to enable live backend.');
}
