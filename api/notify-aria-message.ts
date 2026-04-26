// ============================================================================
// Serenium , notify-aria-message edge function
// ============================================================================
// Fires admin-side notifications (bell row + optional email) when a client
// posts a message in Aria. Distinct from send-team-notification because:
//   - No once-per-org dedupe (Aria conversations are recurring)
//   - Has its own 60-minute consolidation window so a back-and-forth
//     conversation produces ONE bell row + ONE email, not 20.
//
// Channel toggles read from notification_settings (event_key = aria:new_message).
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

const EVENT_KEY = 'aria:new_message';
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';
const TEAM_RECIPIENTS = (process.env.RESEND_TEAM_NOTIFICATION_EMAILS || 'contact@sereniumai.com')
  .split(',').map(s => s.trim()).filter(Boolean);

interface Body {
  organizationId: string;
  /** First ~220 chars of the latest message, used in the email/bell snippet. */
  messagePreview: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: 'Not configured' }, 503);

  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let b: Body;
  try { b = (await req.json()) as Body; } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!b.organizationId) return json({ error: 'Missing organizationId' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Caller must belong to the org.
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile ? (profile as { role: string }).role : null;
  if (role !== 'admin') {
    const { data: membership } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', b.organizationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) return json({ error: 'Forbidden' }, 403);
  }

  // Channel toggles , admin can mute either side without a deploy.
  const { data: setting } = await admin
    .from('notification_settings')
    .select('send_email, send_bell')
    .eq('event_key', EVENT_KEY)
    .maybeSingle();
  const sendEmail = setting ? (setting as { send_email: boolean }).send_email : true;
  const sendBell  = setting ? (setting as { send_bell:  boolean }).send_bell  : true;

  const { data: org } = await admin
    .from('organizations')
    .select('business_name, slug')
    .eq('id', b.organizationId)
    .maybeSingle();
  if (!org) return json({ error: 'Org not found' }, 404);
  const o = org as { business_name: string; slug: string };

  // Consolidation window , if there's already an unread bell for this org
  // from the last hour, we treat this as part of the same conversation and
  // suppress both the new bell row and the email.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from('admin_notifications')
    .select('id')
    .eq('event_key', EVENT_KEY)
    .eq('organization_id', b.organizationId)
    .is('read_at', null)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();
  if (recent) return json({ ok: true, consolidated: true });

  const subject = `New Aria message from ${o.business_name}`;
  const preview = (b.messagePreview ?? '').slice(0, 220);

  if (sendBell) {
    const { error: bellErr } = await admin.from('admin_notifications').insert({
      event_key:       EVENT_KEY,
      organization_id: b.organizationId,
      payload: {
        subject,
        message:        preview,
        businessName:   o.business_name,
        slug:           o.slug,
        deepLink:       '/admin/ai-conversations',
      },
    });
    if (bellErr) console.warn('[notify-aria-message] bell insert failed', bellErr);
  }

  if (sendEmail && resendKey) {
    const html = renderEmail({ subject, preview, businessName: o.business_name, slug: o.slug });
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: TEAM_RECIPIENTS,
        subject: `[Serenium] ${subject}`,
        html,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('[notify-aria-message] Resend error', resp.status, txt);
      captureEdgeError(new Error(`Resend ${resp.status}`), {
        endpoint: 'notify-aria-message',
        organizationId: b.organizationId,
        extra: { status: resp.status, body: txt.slice(0, 500) },
      });
    }
  }

  return json({ ok: true });
}

function renderEmail({ subject, preview, businessName, slug }: {
  subject: string; preview: string; businessName: string; slug: string;
}): string {
  const adminUrl = `https://clients.sereniumai.com/admin/ai-conversations`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
<tr><td>
<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B1F;font-weight:600;">Serenium · Aria</p>
<h1 style="margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${escape(subject)}</h1>
<p style="margin:0 0 16px;color:rgba(255,255,255,0.85);font-size:15px;font-style:italic;border-left:3px solid #FF6B1F;padding-left:14px;">${escape(preview)}</p>
<p style="margin:0 0 6px;color:rgba(255,255,255,0.55);font-size:13px;">From: ${escape(businessName)}</p>
<p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:11px;">/${escape(slug)}</p>
<p style="margin:20px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:#FF6B1F;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;">Open conversation →</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return (s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
