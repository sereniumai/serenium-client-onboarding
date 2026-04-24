import { listChatMessagesForUser, appendChatMessage, clearChatForUser } from './db/chat';
import type { AiChatMessage } from '../types';
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
  const res = await fetch('/api/ask-assistant', {
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
  const data = await res.json() as { reply?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Assistant error (${res.status})`);
  return data.reply ?? '';
}

export async function loadChatForUser(userId: string): Promise<AiChatMessage[]> {
  return listChatMessagesForUser(userId);
}

export async function saveMessage(args: {
  userId: string;
  organizationId?: string | null;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
}): Promise<AiChatMessage> {
  return appendChatMessage(args);
}

export async function clearChat(userId: string): Promise<void> {
  return clearChatForUser(userId);
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
