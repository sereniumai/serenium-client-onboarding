// ============================================================================
// Serenium onboarding assistant — Vercel serverless function.
// Runs on Vercel Edge/Node runtime. NOT bundled into the client.
// ============================================================================
// Browser posts { question, history?, context? } here. We build a system prompt
// constrained to Serenium onboarding topics, call Anthropic Claude, and stream
// back the assistant's reply as JSON { answer }.
//
// Key (ANTHROPIC_API_KEY) lives as a Vercel env var — server-side only.
// ============================================================================

// Vite + Vercel auto-detects this file as an API route at /api/ask-assistant.

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  question: string;
  history?: ChatHistoryItem[];
  context?: string | null;
}

// System prompt — restricts the model to Serenium onboarding help. Update this
// whenever the portal adds major new surfaces the bot should reference.
const SYSTEM_PROMPT = `You are the Serenium onboarding assistant — a friendly helper embedded in a client portal used by roofing businesses to hand over the info Serenium needs to build their website, run their ads, and set up their AI voice/SMS agents.

Scope:
- You ONLY answer questions about completing the Serenium onboarding portal.
- Topics you can help with: what info to put in each step, what a field means, how to grant Serenium access to things like Google Analytics / Google Business Profile / their domain registrar / WordPress / Meta Business Manager / Google Ads, what "emergency service" means, why we ask for things, how long the onboarding takes, how to get un-stuck.
- You should NOT answer general roofing questions, pricing questions about Serenium's services, legal questions, or anything off-topic. Politely redirect the user to email contact@sereniumai.com for those.

Tone:
- Warm, practical, confident. Not corporate. Short paragraphs.
- Use Markdown — bullet points, bold for emphasis, step-by-step lists.
- Never make up field names or step names. If you're not sure, say "I'm not 100% on that — try checking the step directly or email contact@sereniumai.com."

Format:
- Direct answer in 2–5 sentences.
- If relevant, point to the specific step by service + module title (e.g. "go to Website → Domain access").
- End with one sentence of reassurance or next-step guidance when helpful.

The 7 services in the portal are: Business Profile, Facebook Ads, Google Ads, Google Business Profile, AI SMS, AI Receptionist, Website.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Assistant is not configured. Contact support.' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const question = (body.question ?? '').trim();
  if (!question) {
    return new Response(JSON.stringify({ error: 'question is required' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  // Build the messages array: recent history (max 10 turns) + current question.
  const history = (body.history ?? []).slice(-10);
  const contextLine = body.context ? `\n\n[User is currently on the "${body.context}" step of the portal.]` : '';

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: question + contextLine },
  ];

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[ask-assistant] Anthropic error', resp.status, errText);
      return new Response(
        JSON.stringify({ error: 'Assistant is having trouble right now. Please try again in a moment.' }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      );
    }

    const data = (await resp.json()) as { content?: Array<{ type: string; text: string }> };
    const text = data.content?.filter(c => c.type === 'text').map(c => c.text).join('\n').trim() ?? '';

    return new Response(JSON.stringify({ answer: text || "Sorry — I didn't get a response. Try again?" }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[ask-assistant] fetch threw', err);
    return new Response(
      JSON.stringify({ error: 'Assistant is unreachable right now. Please try again.' }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
}
