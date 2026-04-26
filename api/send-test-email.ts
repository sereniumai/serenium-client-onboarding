// ============================================================================
// Serenium, send-test-email edge function
// ============================================================================
// Sends a one-off test email to a specified address via Resend. Admin-only.
// Used to preview follow-up templates with sample placeholder values.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';

interface Body {
  to: string;
  subject: string;
  body: string;
}

const SAMPLE_VARS: Record<string, string> = {
  '{{firstName}}':    'Craig',
  '{{businessName}}': 'Sure West Roofing',
  '{{portalUrl}}':    'https://clients.sereniumai.com',
};

// Soft per-admin rate limit, caps runaway loops from the admin UI. Upgrade
// to KV-backed when Vercel KV is wired up (Tier 1 checklist).
const RATE_MAX = 10;
const RATE_WINDOW_MS = 60 * 1000;
const rateBuckets = new Map<string, number[]>();
function checkRate(key: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const hits = (rateBuckets.get(key) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    return { ok: false, retryAfter: Math.ceil((RATE_WINDOW_MS - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  return { ok: true };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey || !anonKey) return json({ error: 'Email service not configured' }, 503);

  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || (profile as { role: string }).role !== 'admin') return json({ error: 'Admins only' }, 403);

  const rate = checkRate(user.id);
  if (!rate.ok) {
    return new Response(
      JSON.stringify({ error: `Too many test emails. Wait ${rate.retryAfter}s.` }),
      { status: 429, headers: { 'content-type': 'application/json', 'retry-after': String(rate.retryAfter) } },
    );
  }

  let b: Body;
  try { b = (await req.json()) as Body; } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!b.to || !b.subject || !b.body) return json({ error: 'Missing fields' }, 400);
  if (!b.to.includes('@')) return json({ error: 'Invalid email address' }, 400);
  if (b.subject.length > 200) return json({ error: 'Subject too long' }, 400);
  if (b.body.length > 5000)   return json({ error: 'Body too long' }, 400);

  // Hardening: a "test email" endpoint can be abused as an open relay if the
  // admin session is compromised. Lock recipient to the caller's own email.
  // If the admin needs to test team delivery, run the actual send-followup.
  if (user.email && b.to.toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: 'Test emails can only be sent to your own admin email.' }, 400);
  }

  const interpolate = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE_VARS[`{{${k}}}`] ?? `{{${k}}}`);
  const subject = `[TEST] ${interpolate(b.subject)}`;
  const body = interpolate(b.body);
  const html = renderTestEmail(body);

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to: b.to, subject, html, text: body }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[send-test-email] Resend error', resp.status, txt);
    captureEdgeError(new Error(`Resend ${resp.status}`), {
      endpoint: 'send-test-email',
      userId: user.id,
      extra: { status: resp.status, body: txt.slice(0, 500) },
    });
    return json({ error: 'Email send failed. Try again in a moment.' }, 502);
  }

  return json({ ok: true });
}

function renderTestEmail(body: string): string {
  const html = escape(body).replace(/\n/g, '<br>');
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0A0A0A;padding:32px 16px;">
<tr><td align="center">
<div style="background:rgba(255,107,31,0.15);color:#FF6B1F;padding:8px 16px;border-radius:999px;display:inline-block;margin-bottom:16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;">Test email</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
<tr><td>
<p style="margin:0 0 16px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B1F;font-weight:600;">Serenium AI</p>
<div style="color:rgba(255,255,255,0.85);font-size:15px;white-space:pre-wrap;">${html}</div>
</td></tr></table>
</td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
