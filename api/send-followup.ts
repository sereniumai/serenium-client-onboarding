// ============================================================================
// Serenium, send-followup edge function
// ============================================================================
// Sends a follow-up / chase email to an organization's primary contact via
// Resend, and logs it to followups_sent. Admin-only.
// Request body: { organizationId, templateKey, subject, body, sentBy?, mode? }
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';
import { resolveRecipient } from './_recipient';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';

interface Body {
  organizationId: string;
  templateKey: string;
  subject: string;
  body: string;
  sentBy?: string;
  mode?: 'manual' | 'auto';
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
  if (!b.organizationId || !b.templateKey || !b.subject || !b.body) return json({ error: 'Missing required fields' }, 400);

  // Hardening: cap subject + body lengths so a compromised admin session can't
  // use this endpoint to dump kilobytes of content from the Serenium domain.
  if (b.subject.length > 200) return json({ error: 'Subject too long' }, 400);
  if (b.body.length > 5000)   return json({ error: 'Body too long' }, 400);

  // Hardening: templateKey must match one of the configured templates. Stops
  // abuse via a fabricated template_key in the audit log.
  const { data: settingsRow } = await admin
    .from('followup_settings')
    .select('settings')
    .eq('id', 1)
    .maybeSingle();
  const allowedKeys = new Set<string>(
    (((settingsRow as { settings?: { templates?: Array<{ key?: string }> } } | null)?.settings?.templates) ?? [])
      .map(t => t?.key)
      .filter((k): k is string => typeof k === 'string'),
  );
  if (!allowedKeys.has(b.templateKey)) return json({ error: 'Unknown template' }, 400);

  // Resolve the recipient. Falls back to the first member's profile email
  // when the org-level primary_contact_email is unset, matching what the
  // Send-follow-up modal shows the admin in the To: field.
  const recipient = await resolveRecipient(admin, b.organizationId);
  if (!recipient) return json({ error: 'No contact email on file for this client' }, 400);
  const { email: toEmail, firstName, businessName } = recipient;
  const portalUrl = 'https://clients.sereniumai.com';

  // Template substitution. Simple regex, no dependencies.
  const subject = interpolate(b.subject, { firstName, businessName, portalUrl });
  const body    = interpolate(b.body,    { firstName, businessName, portalUrl });
  const html = renderFollowupEmail(body);

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to: toEmail, subject, html, text: body }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[send-followup] Resend error', resp.status, txt);
    captureEdgeError(new Error(`Resend ${resp.status}`), {
      endpoint: 'send-followup',
      organizationId: b.organizationId,
      extra: { status: resp.status, body: txt.slice(0, 500) },
    });
    return json({ error: 'Email send failed' }, 502);
  }

  // Log to followups_sent.
  const { data: record, error: insertErr } = await admin
    .from('followups_sent')
    .insert({
      organization_id: b.organizationId,
      template_key: b.templateKey,
      subject,
      body,
      sent_by: b.sentBy ?? user.id,
      mode: b.mode ?? 'manual',
    })
    .select('*')
    .single();
  if (insertErr) return json({ error: insertErr.message }, 500);

  await admin.from('activity_log').insert({
    organization_id: b.organizationId,
    user_id: user.id,
    action: 'followup_sent',
    metadata: { template_key: b.templateKey, subject },
  });

  return json({ ok: true, record });
}

function interpolate(tmpl: string, vars: Record<string, string>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function renderFollowupEmail(body: string): string {
  const html = escape(body).replace(/\n/g, '<br>');
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0A0A0A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
        <tr><td>
          <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B1F;font-weight:600;">Serenium AI</p>
          <div style="color:rgba(255,255,255,0.85);font-size:15px;white-space:pre-wrap;">${html}</div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
          <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">Reply to this email to reach the Serenium team directly.</p>
        </td></tr>
      </table>
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
