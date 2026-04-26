/**
 * Required client-side environment variables, validated at app startup.
 *
 * Running without these should fail loud and immediate rather than
 * producing cryptic "supabaseKey is required" errors 300ms into the
 * first DB call. We only validate VITE_-prefixed vars here; server-side
 * vars are enforced per-endpoint in api/*.ts.
 */

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn: string | undefined;       // optional, prod-only
  vercelEnv: string;                    // 'production' | 'preview' | 'development'
  vercelGitCommitSha: string | undefined;
  /** Cloudflare Turnstile site key. Optional, when missing we skip the widget
   *  (useful for local dev). When set the auth pages render the challenge
   *  before sending credentials. */
  turnstileSiteKey: string | undefined;
}

export function readEnv(): EnvConfig {
  const env = import.meta.env;
  const supabaseUrl = (env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    const msg = `[env] missing required variables: ${missing.join(', ')}.\n` +
      `Copy .env.example → .env.local and fill them in. For Vercel, set them in Project Settings → Environment Variables.`;
    // Fail loud in dev so the misconfig is obvious. In prod we still log
    // but let the app boot (Sentry will surface the downstream errors).
    if (env.DEV) throw new Error(msg);
    // eslint-disable-next-line no-console
    console.error(msg);
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    sentryDsn: env.VITE_SENTRY_DSN as string | undefined,
    vercelEnv: (env.VITE_VERCEL_ENV as string | undefined) ?? 'development',
    vercelGitCommitSha: env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined,
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY as string | undefined,
  };
}

/** Singleton - validated once at import. */
export const env = readEnv();
