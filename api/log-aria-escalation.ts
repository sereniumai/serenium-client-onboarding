// ============================================================================
// Serenium, log-aria-escalation edge function
// ----------------------------------------------------------------------------
// Called by the chat UI when Aria's reply indicates she's escalating to the
// Serenium team. Logs an escalation row and emails the team list with a
// deep-link to the client's admin page and a "Reply by email" mailto.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';
const TEAM_RECIPIENTS = (process.env.RESEND_TEAM_NOTIFICATION_EMAILS || 'contact@sereniumai.com')
  .split(',').map(s => s.trim()).filter(Boolean);

interface Body {
  organizationId: string;
  threadId?: string | null;
  question: string;
  contextSnippet?: string | null;
  pageContext?: string | null;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey || !anonKey) {
    return json({ error: 'Notification service not configured' }, 503);
  }

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
  if (!b.organizationId || !b.question) return json({ error: 'Missing fields' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Authorize: caller must be a member of this org (or admin).
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
  const isAdmin = profile && (profile as { role: string }).role === 'admin';
  if (!isAdmin) {
    const { data: membership } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', b.organizationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) return json({ error: 'Forbidden' }, 403);
  }

  // De-dupe: if the same user logged the same question in the last 10 minutes,
  // skip. Aria sometimes repeats herself across messages and we don't want
  // multiple emails for what is really one ask.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from('aria_escalations')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', b.organizationId)
    .eq('question', b.question)
    .gte('created_at', tenMinAgo)
    .maybeSingle();
  if (recent) return json({ ok: true, deduped: true });

  // Look up org for context.
  const { data: org } = await admin
    .from('organizations')
    .select('business_name, slug, primary_contact_email')
    .eq('id', b.organizationId)
    .maybeSingle();
  if (!org) return json({ error: 'Organization not found' }, 404);
  const o = org as { business_name: string; slug: string; primary_contact_email: string | null };

  const userName = (profile as { full_name: string | null } | null)?.full_name ?? user.email ?? 'A client';

  // Insert the escalation row.
  const { data: insertedRow, error: insertErr } = await admin
    .from('aria_escalations')
    .insert({
      organization_id: b.organizationId,
      user_id: user.id,
      thread_id: b.threadId ?? null,
      question: b.question.slice(0, 4000),
      context_snippet: b.contextSnippet?.slice(0, 4000) ?? null,
      page_context: b.pageContext ?? null,
    })
    .select('id')
    .single();
  if (insertErr) {
    console.error('[log-aria-escalation] insert failed', insertErr);
    return json({ error: 'Could not log escalation' }, 500);
  }

  const adminUrl = `https://clients.sereniumai.com/admin/clients/${o.slug}?tab=flagged&escalation=${(insertedRow as { id: string }).id}`;
  const mailto = o.primary_contact_email
    ? `mailto:${o.primary_contact_email}?subject=${encodeURIComponent(`Re: ${b.question.slice(0, 60)}`)}&body=${encodeURIComponent(`Hey,\n\nThanks for the question through the portal:\n\n> ${b.question}\n\n`)}`
    : '';

  const html = renderEscalationEmail({
    businessName: o.business_name,
    userName,
    primaryContact: o.primary_contact_email,
    question: b.question,
    contextSnippet: b.contextSnippet ?? null,
    pageContext: b.pageContext ?? null,
    adminUrl,
    mailto,
  });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: TEAM_RECIPIENTS,
      reply_to: o.primary_contact_email || undefined,
      subject: `[Aria flagged] ${o.business_name} · ${b.question.slice(0, 80)}`,
      html,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[log-aria-escalation] Resend error', resp.status, txt);
    captureEdgeError(new Error(`Resend ${resp.status}`), {
      endpoint: 'log-aria-escalation',
      organizationId: b.organizationId,
      extra: { status: resp.status, body: txt.slice(0, 500) },
    });
    // Row is logged even if email fails. Admin will still see it in the bell.
    return json({ ok: true, emailFailed: true });
  }

  return json({ ok: true });
}

function renderEscalationEmail({
  businessName, userName, primaryContact, question, contextSnippet, pageContext, adminUrl, mailto,
}: {
  businessName: string; userName: string; primaryContact: string | null;
  question: string; contextSnippet: string | null; pageContext: string | null;
  adminUrl: string; mailto: string;
}): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
<tr><td>
<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B1F;font-weight:700;">Aria flagged a question</p>
<h1 style="margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${escape(businessName)}</h1>
<p style="margin:0 0 20px;color:rgba(255,255,255,0.6);font-size:13px;">${escape(userName)}${primaryContact ? ` · ${escape(primaryContact)}` : ''}${pageContext ? ` · on the "${escape(pageContext)}" step` : ''}</p>

<p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Their question</p>
<div style="background:#0A0A0A;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;margin:0 0 16px;color:#fff;font-size:15px;white-space:pre-wrap;">${escape(question)}</div>

${contextSnippet ? `
<p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Aria's reply</p>
<div style="background:#0A0A0A;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;margin:0 0 24px;color:rgba(255,255,255,0.75);font-size:13px;white-space:pre-wrap;">${escape(contextSnippet)}</div>
` : ''}

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;"><tr>
${mailto ? `<td style="padding-right:10px;"><a href="${mailto}" style="display:inline-block;background:#FF6B1F;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">Reply by email</a></td>` : ''}
<td><a href="${adminUrl}" style="display:inline-block;background:transparent;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:14px;">Open in admin →</a></td>
</tr></table>

<p style="margin:24px 0 0;color:rgba(255,255,255,0.4);font-size:12px;">Once you've replied, mark this resolved in the admin portal so the bell clears.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
