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
import { captureEdgeError } from './_sentry';

export const config = { runtime: 'edge' };

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Serenium <noreply@sereniumai.com>';
const TEAM_RECIPIENTS = (process.env.RESEND_TEAM_NOTIFICATION_EMAILS || 'contact@sereniumai.com')
  .split(',').map(s => s.trim()).filter(Boolean);

interface Body {
  organizationId: string;
  eventKey: string;
}

// Allowlist of event keys + their server-rendered subject/message. Clients
// can only TRIGGER one of these events, never control the content of the
// email itself. Prevents a compromised client session from spamming the
// team inbox with arbitrary text.
const EVENT_TEMPLATES: Record<string, { subject: string; message: string }> = {
  'signup:first_login': {
    subject: 'Client has logged in for the first time',
    message: 'The invite landed and the client is in. Onboarding has officially begun.',
  },
  'module_completed:website.registrar_delegation': {
    subject: 'Registrar access granted',
    message: 'The client has added contact@sereniumai.com as a delegate on their domain registrar. Confirm access + take next steps on DNS now.',
  },
  'module_completed:website.cms_access': {
    subject: 'CMS access granted',
    message: 'The client has added us as a WordPress admin. Log in, confirm access, and begin the site audit.',
  },
  'module_completed:website.analytics_and_search_console': {
    subject: 'Analytics + Search Console access granted',
    message: 'Admin access to Google Analytics + Search Console is in. Verify, configure conversion goals, and submit the sitemap if appropriate.',
  },
  'module_completed:ai_receptionist.phone_number_setup': {
    subject: 'Call forwarding configured, live phone now routes to the AI',
    message: 'Client has completed the phone forwarding steps. Test the AI immediately, their customers may already be reaching it.',
  },
  'module_completed:facebook_ads.grant_access': {
    subject: 'Meta Business Manager access granted',
    message: 'Partner access is in for the Meta Business Manager, Page, Instagram, Pixel, and Ad Account. Verify and begin campaign setup.',
  },
  'onboarding:complete': {
    subject: 'Client has completed all onboarding sections',
    message: 'Every section the client can fill in is complete. Review their submission, request anything missing, then flip the account to live in admin so they get the launched experience.',
  },
};

function templateForEvent(eventKey: string) {
  if (EVENT_TEMPLATES[eventKey]) return EVENT_TEMPLATES[eventKey];
  if (eventKey.startsWith('service_completed:')) {
    const svc = eventKey.slice('service_completed:'.length).replace(/_/g, ' ');
    return {
      subject: `Service complete · ${svc}`,
      message: `A client has finished the ${svc} section. Review their answers in the admin portal.`,
    };
  }
  if (eventKey.startsWith('module_completed:')) {
    const mod = eventKey.slice('module_completed:'.length).replace(/_/g, ' ');
    return {
      subject: `Access granted · ${mod}`,
      message: `A client has completed the ${mod} step, likely granting Serenium access to a third-party tool. Test the connection.`,
    };
  }
  return null;
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

  let b: Body;
  try { b = (await req.json()) as Body; } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!b.organizationId || !b.eventKey) return json({ error: 'Missing fields' }, 400);

  const tpl = templateForEvent(b.eventKey);
  if (!tpl) return json({ error: 'Unknown event' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Authorize: caller must be a member of the org OR an admin. Prevents a
  // client in Org A from triggering notifications for Org B.
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
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

  // Read admin's per-event channel toggles. Missing row = both channels on
  // (safe default for any new event we add before seeding it).
  const { data: setting } = await admin
    .from('notification_settings')
    .select('send_email, send_bell')
    .eq('event_key', b.eventKey)
    .maybeSingle();
  const sendEmail = setting ? (setting as { send_email: boolean }).send_email : true;
  const sendBell  = setting ? (setting as { send_bell:  boolean }).send_bell  : true;

  // Bell row first , fast, no external dependency. Even if email fails or is
  // disabled, the admin still sees the event in the in-app feed.
  if (sendBell) {
    const { error: bellErr } = await admin.from('admin_notifications').insert({
      event_key:       b.eventKey,
      organization_id: b.organizationId,
      payload: {
        subject:        tpl.subject,
        message:        tpl.message,
        businessName:   o.business_name,
        slug:           o.slug,
        primaryContact: o.primary_contact_email,
        deepLink:       `/admin/clients/${o.slug}`,
      },
    });
    if (bellErr) console.warn('[send-team-notification] bell insert failed', bellErr);
  }

  if (sendEmail) {
    const html = renderTeamEmail({
      subject: tpl.subject,
      message: tpl.message,
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
        subject: `[Serenium] ${tpl.subject} · ${o.business_name}`,
        html,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('[send-team-notification] Resend error', resp.status, txt);
      captureEdgeError(new Error(`Resend ${resp.status}`), {
        endpoint: 'send-team-notification',
        organizationId: b.organizationId,
        extra: { status: resp.status, body: txt.slice(0, 500), eventKey: b.eventKey },
      });
      // Don't fail the whole request , bell row is in, that's most of the value.
    }
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
