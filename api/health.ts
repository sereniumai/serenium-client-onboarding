// ============================================================================
// Health check endpoint for uptime monitoring (UptimeRobot, Better Stack, etc.)
// ============================================================================
// Returns a small JSON payload so monitors can verify the app is up AND the
// edge runtime can parse JSON. Does NOT touch Supabase, Anthropic, or Resend,
// a public endpoint that pings downstream services is a DoS vector.
// ============================================================================

export const config = { runtime: 'edge' };

export default function handler(_req: Request): Response {
  const payload = {
    ok: true,
    service: 'serenium-portal',
    env: process.env.VERCEL_ENV ?? 'unknown',
    release: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    ts: new Date().toISOString(),
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
