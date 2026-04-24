// ============================================================================
// AI helper, client-side chat wiring.
// ============================================================================
// Conversation storage lives in mockDb. The actual "brain" is the Vercel edge
// function at /api/ask-assistant which calls Claude with a scoped system prompt
// generated from the module config. No client-side fallback logic, if the
// function is unreachable we show a clear error message.
// ============================================================================

import { db, type AiChatMessage } from './mockDb';

export type ChatMessage = AiChatMessage;

export function loadChatHistory(userId: string): ChatMessage[] {
  if (!userId) return [];
  return db.listAiChatForUser(userId);
}

export function clearChatHistory(userId: string) {
  if (!userId) return;
  db.clearAiChatForUser(userId);
}

export function appendMessage(
  userId: string,
  organizationId: string | null,
  role: 'user' | 'assistant',
  content: string,
  context: string | null = null,
): ChatMessage {
  return db.addAiChatMessage({ userId, organizationId, role, content, context });
}

/**
 * Ask the onboarding assistant a question. Round-trips to the Vercel edge
 * function /api/ask-assistant which calls Claude. On any failure, returns a
 * short error message rather than a stale canned response.
 */
export type ChatMode = 'onboarding' | 'analytics';

export interface UserContext {
  firstName?: string;
  businessName?: string;
  progressPercent?: number;
  completeServices?: string[];
  yearsInBusiness?: unknown;
  serviceAreas?: unknown;
  servicesOffered?: unknown;
  emergencyOffered?: unknown;
}

export interface Attachment {
  fileName: string;
  mimeType: string;
  data: string; // base64 (no data-URL prefix)
}

export interface AskAssistantOptions {
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: string | null;
  userContext?: UserContext | null;
  mode?: ChatMode;
  attachments?: Attachment[];
}

export async function askAssistant(question: string, opts: AskAssistantOptions = {}): Promise<string> {
  try {
    const resp = await fetch('/api/ask-assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question,
        history: opts.history ?? [],
        context: opts.context ?? null,
        userContext: opts.userContext ?? null,
        mode: opts.mode ?? 'onboarding',
        attachments: opts.attachments ?? [],
      }),
    });

    if (resp.ok) {
      const data = (await resp.json()) as { answer?: string };
      if (data.answer) return data.answer;
    }

    if (resp.status === 503) {
      return "I'm not set up just yet. The Serenium team is finishing my configuration. In the meantime, email **contact@sereniumai.com** with anything you're stuck on.";
    }
    return "Sorry, I hit a snag answering that. Try again in a moment, or email **contact@sereniumai.com** for anything urgent.";
  } catch {
    return "I'm temporarily unreachable. Check your connection and try again, or email **contact@sereniumai.com**.";
  }
}

export const SUGGESTED_QUESTIONS_ONBOARDING = [
  'How do I give you domain access?',
  'What should I put for unique selling points?',
  'How do I grant Google Analytics access?',
  'Do I need to finish this in one sitting?',
  'What happens after I finish the onboarding?',
];

export const SUGGESTED_QUESTIONS_ANALYTICS = [
  'Summarize last month\'s performance across all channels',
  'What\'s driving my cost per lead right now?',
  'Where did my best leads come from this month?',
  'How did Facebook Ads perform vs Google Ads?',
  'What should I focus on next month?',
];

// Back-compat export for anything still importing the old name.
export const SUGGESTED_QUESTIONS = SUGGESTED_QUESTIONS_ONBOARDING;
