// ============================================================================
// Serenium, send-invitation edge function
// ============================================================================
// Called by the admin UI after an invitation row is created in Supabase.
// Verifies the caller is an authenticated admin (via their session JWT),
// re-reads the invitation (admin-owned RLS bypass uses service-role), builds
// the branded email, and sends it via Resend.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';

interface Body {
  invitationId: string;
  portalUrl?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey || !anonKey) {
    console.error('[send-invitation] missing env', {
      supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey, resendKey: !!resendKey, anonKey: !!anonKey,
    });
    return json({ error: 'Email service not configured' }, 503);
  }

  // 1. Authenticate caller with their JWT, must be admin.
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
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || (profile as { role: string }).role !== 'admin') {
    return json({ error: 'Admins only' }, 403);
  }

  // 2. Parse body.
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!body.invitationId) return json({ error: 'invitationId is required' }, 400);

  // 3. Pull invitation + org via service-role (bypasses RLS).
  const { data: inv, error: invErr } = await admin
    .from('invitations')
    .select('*, organizations!inner(business_name)')
    .eq('id', body.invitationId)
    .maybeSingle();
  if (invErr || !inv) return json({ error: 'Invitation not found' }, 404);

  type InviteRow = {
    email: string; full_name: string | null; token: string; accepted_at: string | null; expires_at: string;
    organizations: { business_name: string };
  };
  const i = inv as unknown as InviteRow;
  if (i.accepted_at) return json({ error: 'Invitation already accepted' }, 400);
  if (new Date(i.expires_at) < new Date()) return json({ error: 'Invitation expired' }, 400);

  const portalBase = (body.portalUrl || 'https://clients.sereniumai.com').replace(/\/$/, '');
  const inviteUrl = `${portalBase}/register?invite=${encodeURIComponent(i.token)}`;

  // 4. Send via Resend.
  const inviterFirstName = ((profile as { full_name: string }).full_name ?? 'Serenium').split(' ')[0];
  const subject = `${inviterFirstName} from Serenium just invited you, ${i.organizations.business_name} is about to take off`;
  const html = renderInviteEmail({
    businessName: i.organizations.business_name,
    inviteeName: i.full_name,
    inviteUrl,
    inviterName: (profile as { full_name: string }).full_name ?? 'Serenium',
  });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: i.email,
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[send-invitation] Resend error', resp.status, txt);
    captureEdgeError(new Error(`Resend ${resp.status}`), {
      endpoint: 'send-invitation',
      extra: { status: resp.status, body: txt.slice(0, 500) },
    });
    return json({ error: 'Email send failed. Try again in a moment.' }, 502);
  }

  return json({ ok: true });
}

function renderInviteEmail({ businessName, inviteeName, inviteUrl, inviterName }: {
  businessName: string; inviteeName: string | null; inviteUrl: string; inviterName: string;
}): string {
  const helloName = inviteeName ? escape(inviteeName.split(' ')[0]) : 'there';
  const inviterFirst = escape(inviterName.split(' ')[0] || 'Serenium');
  const safeBusiness = escape(businessName);
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0A0A0A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#FF6B1F;font-weight:700;">Welcome aboard</p>
          <h1 style="margin:0 0 18px;font-size:26px;font-weight:800;letter-spacing:-0.025em;color:#fff;">Let's go, ${helloName}.</h1>
          <p style="margin:0 0 14px;color:rgba(255,255,255,0.78);font-size:15px;"><strong style="color:#fff;">${inviterFirst} from Serenium</strong> just set up your private client portal. This is where the work happens, and where everything we build for <strong style="color:#fff;">${safeBusiness}</strong> comes together.</p>
          <p style="margin:0 0 14px;color:rgba(255,255,255,0.78);font-size:15px;">It's where you'll fill in everything we need to launch ${safeBusiness}'s online presence, your AI receptionist, your ads, your site, and your reputation. Log in any time, save as you go, pick up exactly where you left off.</p>
          <p style="margin:0 0 24px;color:rgba(255,255,255,0.78);font-size:15px;">We're genuinely excited to get started. Click below to set your password and dive in.</p>
          <p style="margin:0 0 32px;"><a href="${inviteUrl}" style="display:inline-block;background:#FF6B1F;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">Open your portal →</a></p>
          <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:13px;">Stuck or have a question before you start? Just reply to this email, a real human reads it.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
          <p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:12px;">Link valid for 14 days. Or paste this into your browser:</p>
          <p style="margin:0;word-break:break-all;color:rgba(255,107,31,0.85);font-size:12px;">${inviteUrl}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.3);font-size:11px;">Serenium AI · Cochrane, Alberta · clients.sereniumai.com</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
