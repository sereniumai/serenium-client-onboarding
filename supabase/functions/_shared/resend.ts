// Shared Resend client for Supabase Edge Functions
// Deploy with: supabase functions deploy <name>

const RESEND_API = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ id?: string; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const fromDefault = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'Serenium <noreply@sereniumai.com>';
  if (!apiKey) return { error: 'RESEND_API_KEY not configured' };

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from ?? fromDefault,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Resend ${res.status}: ${text}` };
  }
  const data = await res.json();
  return { id: data.id };
}

// deno-lint-ignore no-explicit-any
declare const Deno: any;
