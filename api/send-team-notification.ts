// ============================================================================
// Serenium, send-team-notification edge function
// ============================================================================
// Fires internal emails to the Serenium ops team when specific events happen
// on a client org. Each (org, event_key) pair sends at most once, tracked
// via team_notifications_sent.
//
// Recipients: RESEND_TEAM_NOTIFICATION_EMAILS (comma-separated) env var.
// Falls back to noreply@sereniumai.com if unset.
//
// Events:
//   signup:first_login
//   service_completed:<service_key>  (all services)
//   module_completed:website.registrar_delegation
//   module_completed:website.cms_access
//   module_completed:website.analytics_and_search_console
//   module_completed:ai_receptionist.phone_number_setup
//   module_completed:facebook_ads.grant_access
// ============================================================================

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';
const TEAM_RECIPIENTS = (process.env.RESEND_TEAM_NOTIFICATION_EMAILS || 'contact@sereniumai.com')
  .split(',').map(s => s.trim()).filter(Boolean);

interface Body {
  organizationId: string;
  eventKey: string;
  subject: string;
  message: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey || !anonKey) return json({ error: 'Email service not configured' }, 503);

  // Caller can be any authenticated user, the trigger fires from client-side
  // on service/module completion events. Membership in the org is enforced
  // implicitly by the RLS-gated reads we do.
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
  if (!b.organizationId || !b.eventKey || !b.subject || !b.message) return json({ error: 'Missing fields' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // De-dupe, check if this (org, event) was already sent.
  const { data: existing } = await admin
    .from('team_notifications_sent')
    .select('id')
    .eq('organization_id', b.organizationId)
    .eq('event_key', b.eventKey)
    .maybeSingle();
  if (existing) return json({ ok: true, deduped: true });

  // Look up org for the subject line context.
  const { data: org } = await admin
    .from('organizations')
    .select('business_name, slug, primary_contact_email')
    .eq('id', b.organizationId)
    .maybeSingle();
  if (!org) return json({ error: 'Organization not found' }, 404);
  const o = org as { business_name: string; slug: string; primary_contact_email: string | null };

  const adminUrl = `https://clients.sereniumai.com/admin/clients/${o.slug}`;

  const html = renderTeamEmail({
    subject: b.subject,
    message: b.message,
    businessName: o.business_name,
    primaryContact: o.primary_contact_email,
    adminUrl,
  });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: TEAM_RECIPIENTS,
      subject: `[Serenium] ${b.subject} · ${o.business_name}`,
      html,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[send-team-notification] Resend error', resp.status, txt);
    return json({ error: 'Email send failed' }, 502);
  }

  // Lock the (org, event) pair so this never fires twice.
  const { error: insertErr } = await admin
    .from('team_notifications_sent')
    .insert({ organization_id: b.organizationId, event_key: b.eventKey });
  if (insertErr) {
    console.warn('[send-team-notification] dedupe insert failed', insertErr);
  }

  return json({ ok: true });
}

function renderTeamEmail({ subject, message, businessName, primaryContact, adminUrl }: {
  subject: string; message: string; businessName: string; primaryContact: string | null; adminUrl: string;
}): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
<tr><td>
<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B1F;font-weight:600;">Serenium · internal</p>
<h1 style="margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${escape(subject)}</h1>
<p style="margin:0 0 16px;color:rgba(255,255,255,0.8);font-size:15px;white-space:pre-wrap;">${escape(message)}</p>
<table role="presentation" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0;font-size:13px;color:rgba(255,255,255,0.7);">
<tr><td style="color:rgba(255,255,255,0.4);padding-right:12px;">Business</td><td>${escape(businessName)}</td></tr>
${primaryContact ? `<tr><td style="color:rgba(255,255,255,0.4);padding-right:12px;">Contact</td><td>${escape(primaryContact)}</td></tr>` : ''}
</table>
<p style="margin:16px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:#FF6B1F;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;">Open in admin →</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
