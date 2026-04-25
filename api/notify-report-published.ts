// ============================================================================
// Serenium, notify-report-published edge function
// ----------------------------------------------------------------------------
// Fires when admin publishes a brand-new monthly report. Emails every member
// of the org telling them the report is live, with a login link back to the
// portal. No PDF attachments, reports stay behind auth.
// ----------------------------------------------------------------------------
// Edits to existing reports do NOT call this; we only ping clients on the
// initial create so a typo fix doesn't generate noise.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';

interface Body {
  organizationId: string;
  reportId: string;
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return `${MONTH_LABELS[m - 1]} ${y}`;
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
  if (!b.organizationId || !b.reportId) return json({ error: 'Missing fields' }, 400);

  const { data: org } = await admin
    .from('organizations')
    .select('business_name, slug')
    .eq('id', b.organizationId)
    .maybeSingle();
  if (!org) return json({ error: 'Organization not found' }, 404);
  const o = org as { business_name: string; slug: string };

  const { data: report } = await admin
    .from('monthly_reports')
    .select('period, title')
    .eq('id', b.reportId)
    .maybeSingle();
  if (!report) return json({ error: 'Report not found' }, 404);
  const r = report as { period: string; title: string };

  // All members of the org (accepted invitations only), pull their emails
  // from auth via profiles.
  const { data: memberRows } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', b.organizationId)
    .not('accepted_at', 'is', null);
  const memberIds = (memberRows ?? []).map(m => (m as { user_id: string }).user_id);

  const recipients: string[] = [];
  if (memberIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('email')
      .in('id', memberIds);
    for (const p of (profiles ?? []) as Array<{ email: string | null }>) {
      if (p.email) recipients.push(p.email);
    }
  }

  if (recipients.length === 0) return json({ ok: true, sent: 0, note: 'No member recipients yet' });

  const portalUrl = `https://clients.sereniumai.com/onboarding/${o.slug}/reports`;
  const subject = `Your ${periodLabel(r.period)} report for ${o.business_name} is ready`;
  const html = renderEmail({
    monthLabel: periodLabel(r.period),
    portalUrl,
  });

  // Resend supports bcc / multiple `to` recipients per call. We send one
  // email per recipient so each user gets a personal envelope (cleaner
  // for inbox threading and less likely to be flagged as bulk).
  let sent = 0;
  for (const to of recipients) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });
    if (resp.ok) {
      sent++;
    } else {
      const txt = await resp.text();
      console.error('[notify-report-published] Resend error', resp.status, txt);
      captureEdgeError(new Error(`Resend ${resp.status}`), {
        endpoint: 'notify-report-published',
        organizationId: b.organizationId,
        extra: { status: resp.status, body: txt.slice(0, 500), to },
      });
    }
  }

  return json({ ok: true, sent });
}

function renderEmail({ monthLabel, portalUrl }: {
  monthLabel: string; portalUrl: string;
}): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;">
<tr><td>
<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#FF6B1F;font-weight:700;">New monthly report</p>
<h1 style="margin:0 0 24px;font-size:26px;font-weight:800;letter-spacing:-0.025em;color:#fff;">Your ${escape(monthLabel)} report is ready.</h1>
<p style="margin:0 0 32px;"><a href="${portalUrl}" style="display:inline-block;background:#FF6B1F;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">Log in to view your report →</a></p>
<p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;">Reports stay behind your portal login, we never email PDFs. Questions? Reply to this email and a real person picks it up.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
