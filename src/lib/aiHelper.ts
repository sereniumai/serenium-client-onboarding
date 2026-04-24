/**
 * AI helper client bindings, re-port in Phase 7 on top of ai_chat_messages
 * and analytics_uploads tables. Types exported so compile-time references
 * elsewhere stay valid until the full port lands.
 */

export type ChatMode = 'onboarding' | 'analytics';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Attachment {
  fileName: string;
  mimeType: string;
  data: string;
}

export const SUGGESTED_QUESTIONS_ONBOARDING: string[] = [];
export const SUGGESTED_QUESTIONS_ANALYTICS: string[] = [];

export async function askAssistant(): Promise<string> {
  return 'AI chat is offline during the Supabase migration, back online in Phase 7.';
}

export function loadChatHistory(_userId: string): ChatMessage[] { return []; }
export function clearChatHistory(_userId: string): void {}
export function appendMessage(_userId: string, _msg: ChatMessage): void {}
