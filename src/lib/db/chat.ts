import { supabase } from '../supabase';
import { toAiChatMessage } from './mappers';
import type { AiChatMessage } from '../../types';

export async function listChatMessagesForUser(userId: string, limit = 100): Promise<AiChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('user_id', userId)
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
  userId: string;
  organizationId?: string | null;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
}): Promise<AiChatMessage> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
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

export async function clearChatForUser(userId: string): Promise<void> {
  const { error } = await supabase.from('ai_chat_messages').delete().eq('user_id', userId);
  if (error) throw error;
}
