// ============================================================================
// Minimal Sentry error reporter for Vercel Edge functions.
// ============================================================================
// The @sentry/node SDK doesn't work in Edge runtime. We POST directly to the
// Sentry envelope endpoint. Fire-and-forget, never blocks the response.
//
// DSN format: https://<key>@<host>/<projectId>
//   → envelope URL: https://<host>/api/<projectId>/envelope/?sentry_key=<key>&sentry_version=7
// ============================================================================

const DSN = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;

interface ParsedDsn { envelopeUrl: string; publicKey: string; projectId: string }

let parsed: ParsedDsn | null | undefined;
function getDsn(): ParsedDsn | null {
  if (parsed !== undefined) return parsed;
  if (!DSN) { parsed = null; return parsed; }
  try {
    const u = new URL(DSN);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, '');
    const host = u.host;
    const envelopeUrl = `https://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`;
    parsed = { envelopeUrl, publicKey, projectId };
  } catch {
    parsed = null;
  }
  return parsed;
}

export function captureEdgeError(err: unknown, context: {
  endpoint: string;
  userId?: string | null;
  organizationId?: string | null;
  extra?: Record<string, unknown>;
}): void {
  const dsn = getDsn();
  if (!dsn) return;

  const e = err instanceof Error ? err : new Error(String(err));

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const timestamp = new Date().toISOString();

  const event = {
    event_id: eventId,
    timestamp,
    platform: 'javascript',
    environment: process.env.VERCEL_ENV || 'production',
    release: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    server_name: `edge:${context.endpoint}`,
    tags: {
      endpoint: context.endpoint,
      runtime: 'vercel-edge',
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      organizationId: context.organizationId ?? null,
      ...context.extra,
    },
    exception: {
      values: [{
        type: e.name || 'Error',
        value: e.message,
        stacktrace: e.stack ? { frames: parseStack(e.stack) } : undefined,
      }],
    },
  };

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: timestamp, dsn: DSN }) + '\n' +
    JSON.stringify({ type: 'event' }) + '\n' +
    JSON.stringify(event);

  // Fire and forget. No await, so we never block the response.
  fetch(dsn.envelopeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-sentry-envelope' },
    body: envelope,
  }).catch(() => {});
}

function parseStack(stack: string): Array<{ filename?: string; function?: string; lineno?: number; colno?: number }> {
  return stack.split('\n').slice(1, 20).map(line => {
    const m = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?$/);
    if (!m) return { function: line.trim() };
    return {
      function: m[1] || 'anonymous',
      filename: m[2],
      lineno: parseInt(m[3], 10),
      colno: parseInt(m[4], 10),
    };
  });
}
