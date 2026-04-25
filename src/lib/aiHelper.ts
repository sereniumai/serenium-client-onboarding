import {
  listMessagesForThread,
  listThreadsForUser,
  createThread,
  deleteThread,
  renameThread,
  ensureActiveThread,
  appendChatMessage,
} from './db/chat';
import type { AiChatMessage, AiChatThread } from '../types';
import type { PersonaKey } from '../config/personas';

export type ChatMode = 'onboarding' | 'analytics';

export interface Attachment {
  fileName: string;
  mimeType: string;
  data: string;
}

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

export interface AskOptions {
  mode?: ChatMode;
  persona?: PersonaKey;
  context?: string | null;
  userContext?: UserContext | null;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  attachments?: Attachment[];
}

export async function askAssistant(question: string, opts: AskOptions = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/ask-assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question,
        mode: opts.mode ?? 'onboarding',
        persona: opts.persona,
        context: opts.context ?? null,
        userContext: opts.userContext ?? null,
        history: opts.history ?? [],
        attachments: opts.attachments ?? [],
      }),
    });
  } catch (err) {
    throw new Error(`Network error, couldn't reach the assistant endpoint (${(err as Error).message}).`);
  }

  const raw = await res.text();
  let data: { reply?: string; error?: string } = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON response, use raw below */ }

  if (!res.ok) {
    const specific = data.error || raw || `HTTP ${res.status}`;
    throw new Error(`${specific} (status ${res.status})`);
  }
  return data.reply ?? '';
}

// ─── Threads ────────────────────────────────────────────────────────────────

export async function loadThreads(userId: string): Promise<AiChatThread[]> {
  return listThreadsForUser(userId);
}

export async function startNewThread(args: {
  userId: string;
  organizationId?: string | null;
}): Promise<AiChatThread> {
  return createThread(args);
}

export async function getOrCreateActiveThread(args: {
  userId: string;
  organizationId?: string | null;
}): Promise<AiChatThread> {
  return ensureActiveThread(args);
}

export async function removeThread(threadId: string): Promise<void> {
  return deleteThread(threadId);
}

export async function setThreadTitle(threadId: string, title: string): Promise<void> {
  return renameThread(threadId, title);
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function loadChat(threadId: string): Promise<AiChatMessage[]> {
  return listMessagesForThread(threadId);
}

export async function saveMessage(args: {
  threadId: string;
  userId: string;
  organizationId?: string | null;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
}): Promise<AiChatMessage> {
  return appendChatMessage(args);
}

// ─── Escalation detection ──────────────────────────────────────────────────

/**
 * Aria signals "this should be escalatable" by appending [[FLAG_TO_TEAM]] at
 * the end of her message. The frontend detects the token, hides it, and
 * renders a "Flag to the Serenium team" button. Click → email fires.
 *
 * Token-based (not phrase-based) so we never flag accidentally and clients
 * always have intent in the loop.
 */
export const FLAG_TOKEN = '[[FLAG_TO_TEAM]]';

export function hasFlagToken(reply: string): boolean {
  return reply.includes(FLAG_TOKEN);
}

export function stripFlagToken(reply: string): string {
  return reply.replace(/\[\[FLAG_TO_TEAM\]\]/g, '').trim();
}

export async function logAriaEscalation(args: {
  organizationId: string;
  threadId?: string | null;
  question: string;
  contextSnippet?: string | null;
  pageContext?: string | null;
}): Promise<void> {
  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;

  try {
    await fetch('/api/log-aria-escalation', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(args),
    });
  } catch (err) {
    console.warn('[aria escalation] log failed (non-fatal)', err);
  }
}

/** Auto-derive a thread title from the first user message. ~40 char cap. */
export function deriveThreadTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 40) return cleaned;
  return cleaned.slice(0, 37).trimEnd() + '…';
}

export const SUGGESTED_QUESTIONS_ONBOARDING = [
  "What do I need to give Serenium to get started?",
  "How do I add Serenium as a manager on my Google Business Profile?",
  "What are CASL requirements for SMS?",
  "How do I forward my existing number to the AI?",
] as const;

export const SUGGESTED_QUESTIONS_ANALYTICS = [
  'Summarise this month\'s report in 3 lines',
  'Which channel brought the best ROAS?',
  'What should we change next month?',
] as const;
