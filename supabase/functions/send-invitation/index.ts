// Supabase Edge Function — send a branded invitation email via Resend.
// Deploy: supabase functions deploy send-invitation
// Invoke from the client/admin after creating an invitation row:
//   supabase.functions.invoke('send-invitation', { body: { invitationId } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { invitationEmail } from '../_shared/templates.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const { invitationId } = await req.json();
  if (!invitationId) return new Response(JSON.stringify({ error: 'missing invitationId' }), { status: 400 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );

  const { data: invitation, error: invErr } = await supabase
    .from('invitations').select('*').eq('id', invitationId).single();
  if (invErr || !invitation) return new Response(JSON.stringify({ error: 'invitation not found' }), { status: 404 });

  const { data: org } = await supabase
    .from('organizations').select('business_name').eq('id', invitation.organization_id).single();

  const portalBase = Deno.env.get('PORTAL_BASE_URL') ?? 'https://clients.sereniumai.com';
  const acceptUrl = `${portalBase}/register?token=${invitation.token}`;

  const { subject, html } = invitationEmail({
    fullName: invitation.full_name ?? undefined,
    businessName: org?.business_name ?? 'your organization',
    acceptUrl,
  });

  const result = await sendEmail({ to: invitation.email, subject, html });
  if (result.error) return new Response(JSON.stringify({ error: result.error }), { status: 500 });

  return new Response(JSON.stringify({ ok: true, id: result.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
