// Scheduled Edge Function, find stalled clients and send a gentle nudge.
// Deploy: supabase functions deploy send-stalled-nudge
// Schedule via Supabase cron (daily 09:00):
//   select cron.schedule('stalled-nudge-daily', '0 9 * * *',
//     $$ select net.http_post('https://<project>.functions.supabase.co/send-stalled-nudge') $$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { stalledNudgeEmail } from '../_shared/templates.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const STALE_DAYS = 7;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 3600 * 1000).toISOString();
  const portalBase = Deno.env.get('PORTAL_BASE_URL') ?? 'https://clients.sereniumai.com';

  // Find orgs still in onboarding with no activity in the last STALE_DAYS
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, slug, business_name, status')
    .neq('status', 'live')
    .neq('status', 'churned');

  let sent = 0;
  for (const org of orgs ?? []) {
    const { data: lastActivity } = await supabase
      .from('activity_log').select('created_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const latest = lastActivity?.[0]?.created_at;
    if (latest && latest > cutoff) continue; // active recently, skip

    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, profiles(email, full_name)')
      .eq('organization_id', org.id);

    const days = latest
      ? Math.round((Date.now() - new Date(latest).getTime()) / 86_400_000)
      : STALE_DAYS;

    for (const m of members ?? []) {
      // deno-lint-ignore no-explicit-any
      const p = (m as any).profiles;
      if (!p?.email) continue;
      const { subject, html } = stalledNudgeEmail({
        fullName: p.full_name ?? undefined,
        businessName: org.business_name,
        daysSinceActivity: days,
        dashboardUrl: `${portalBase}/onboarding/${org.slug}`,
      });
      await sendEmail({ to: p.email, subject, html });
      sent += 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
