// ============================================================================
// Serenium, notify-ai-ready edge function
// ----------------------------------------------------------------------------
// Fires when admin flips the ai_receptionist_ready_for_connection flag from
// false to true. Emails the client letting them know their AI is ready and
// they can finish the call-forwarding step in the portal. Includes the
// Retell phone number we set in admin so they have it inline.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';

interface Body {
  organizationId: string;
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

  let b: Body;
  try { b = (await req.json()) as Body; } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!b.organizationId) return json({ error: 'Missing organizationId' }, 400);

  const { data: org } = await admin
    .from('organizations')
    .select('business_name, slug, primary_contact_email, primary_contact_name')
    .eq('id', b.organizationId)
    .maybeSingle();
  if (!org) return json({ error: 'Organization not found' }, 404);
  const o = org as { business_name: string; slug: string; primary_contact_email: string | null; primary_contact_name: string | null };

  if (!o.primary_contact_email) return json({ error: 'Client has no primary contact email' }, 400);

  const { data: retellRow } = await admin
    .from('retell_numbers')
    .select('phone_number')
    .eq('organization_id', b.organizationId)
    .maybeSingle();
  const retellNumber = (retellRow as { phone_number: string } | null)?.phone_number ?? null;

  const portalUrl = `https://clients.sereniumai.com/onboarding/${o.slug}/services/ai_receptionist/phone_number_setup`;

  const firstName = (o.primary_contact_name ?? '').split(' ')[0] || 'there';
  const subject = `Your AI receptionist for ${o.business_name} is ready to wire up`;
  const html = renderEmail({
    firstName,
    businessName: o.business_name,
    retellNumber,
    portalUrl,
  });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: o.primary_contact_email,
      subject,
      html,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[notify-ai-ready] Resend error', resp.status, txt);
    captureEdgeError(new Error(`Resend ${resp.status}`), {
      endpoint: 'notify-ai-ready',
      organizationId: b.organizationId,
      extra: { status: resp.status, body: txt.slice(0, 500) },
    });
    return json({ error: 'Email send failed' }, 502);
  }

  return json({ ok: true });
}

function renderEmail({ firstName, businessName, retellNumber, portalUrl }: {
  firstName: string; businessName: string; retellNumber: string | null; portalUrl: string;
}): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;">
<tr><td>
<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#FF6B1F;font-weight:700;">Ready to go live</p>
<h1 style="margin:0 0 18px;font-size:26px;font-weight:800;letter-spacing:-0.025em;color:#fff;">Your AI is ready, ${escape(firstName)}.</h1>
<p style="margin:0 0 14px;color:rgba(255,255,255,0.78);font-size:15px;">We've built and trained <strong style="color:#fff;">${escape(businessName)}'s</strong> AI receptionist. The last step is to forward your existing line to it (or use the new number directly), which takes about 5 minutes.</p>
${retellNumber ? `
<div style="margin:18px 0;padding:18px;border-radius:12px;background:rgba(255,107,31,0.08);border:1px solid rgba(255,107,31,0.25);">
  <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;text-transform:uppercase;letter-spacing:0.18em;font-weight:600;">Your AI phone number</p>
  <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.01em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escape(retellNumber)}</p>
</div>
` : ''}
<p style="margin:0 0 24px;color:rgba(255,255,255,0.78);font-size:15px;">Log into your portal and head to <strong style="color:#fff;">AI Receptionist → Phone number implementation</strong>. We'll walk you through the carrier-specific forwarding setup in 2 clicks.</p>
<p style="margin:0 0 32px;"><a href="${portalUrl}" style="display:inline-block;background:#FF6B1F;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">Finish AI setup →</a></p>
<p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;">Stuck on any step? Just reply to this email or ask Aria in the portal, a real human reads either.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
