import { supabase } from '../supabase';
import { toAiChatMessage, toAiChatThread } from './mappers';
import type { AiChatMessage, AiChatThread } from '../../types';

// ─── Threads ────────────────────────────────────────────────────────────────

export async function listThreadsForUser(userId: string): Promise<AiChatThread[]> {
  const { data, error } = await supabase
    .from('ai_chat_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toAiChatThread);
}

export async function createThread(args: {
  userId: string;
  organizationId?: string | null;
  title?: string;
}): Promise<AiChatThread> {
  const { data, error } = await supabase
    .from('ai_chat_threads')
    .insert({
      user_id: args.userId,
      organization_id: args.organizationId ?? null,
      title: args.title ?? 'New chat',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toAiChatThread(data);
}

export async function renameThread(threadId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_threads')
    .update({ title })
    .eq('id', threadId);
  if (error) throw error;
}

export async function deleteThread(threadId: string): Promise<void> {
  const { error } = await supabase.from('ai_chat_threads').delete().eq('id', threadId);
  if (error) throw error;
}

// ─── Messages (scoped to thread) ────────────────────────────────────────────

export async function listMessagesForThread(threadId: string, limit = 200): Promise<AiChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toAiChatMessage);
}

export async function listAllChatMessages(limit = 500): Promise<AiChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toAiChatMessage);
}

export async function appendChatMessage(args: {
  threadId: string;
  userId: string;
  organizationId?: string | null;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
}): Promise<AiChatMessage> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      thread_id: args.threadId,
      user_id: args.userId,
      organization_id: args.organizationId ?? null,
      role: args.role,
      content: args.content,
      context: args.context ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toAiChatMessage(data);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns the user's most recent thread, creating one if none exists. */
export async function ensureActiveThread(args: {
  userId: string;
  organizationId?: string | null;
}): Promise<AiChatThread> {
  const threads = await listThreadsForUser(args.userId);
  if (threads.length > 0) return threads[0];
  return createThread(args);
}
