import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Search } from 'lucide-react';
import { LoadingState } from '../../components/LoadingState';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { listAllChatMessages } from '../../lib/db/chat';
import { supabase } from '../../lib/supabase';
import { Markdown } from '../../components/Markdown';
import { cn } from '../../lib/cn';

export function AiConversationsPage() {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['ai-chat', 'all'],
    queryFn: () => listAllChatMessages(500),
  });

  const { data: users = {} } = useQuery({
    queryKey: ['profiles', 'map'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email');
      const map: Record<string, { name: string; email: string }> = {};
      for (const r of (data ?? []) as Array<{ id: string; full_name: string; email: string }>) {
        map[r.id] = { name: r.full_name, email: r.email };
      }
      return map;
    },
  });

  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Group messages by user, newest conversation first
  const byUser = useMemo(() => {
    const m: Record<string, typeof messages> = {};
    for (const msg of messages) {
      (m[msg.userId] ??= []).push(msg);
    }
    // Sort each user's messages by created_at ascending (chronological)
    for (const k of Object.keys(m)) m[k] = [...m[k]].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return m;
  }, [messages]);

  const userList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(byUser)
      .map(([userId, msgs]) => ({
        userId,
        name: users[userId]?.name ?? userId.slice(0, 8),
        email: users[userId]?.email ?? '',
        lastMessage: msgs[msgs.length - 1],
        count: msgs.length,
      }))
      .filter(u => !q
        || u.name.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || u.lastMessage?.content.toLowerCase().includes(q))
      .sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''));
  }, [byUser, users, query]);

  const activeMessages = selectedUser ? byUser[selectedUser] ?? [] : [];

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="mb-6">
            <p className="eyebrow mb-2">Communication</p>
            <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em]">AI conversations</h1>
            <p className="text-white/60 text-sm mt-1">Every chat between clients and Rob/Adam.</p>
          </div>

          {isLoading && (
            <LoadingState />
          )}

          {!isLoading && userList.length === 0 && (
            <div className="card text-center py-16">
              <MessageCircle className="h-8 w-8 text-white/30 mx-auto mb-3" />
              <p className="text-white/50">No AI conversations yet.</p>
            </div>
          )}

          {!isLoading && userList.length > 0 && (
            <div className="grid md:grid-cols-[320px,1fr] gap-4">
              <div className="card p-0 overflow-hidden">
                <div className="p-3 border-b border-border-subtle">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                    <input
                      type="search"
                      placeholder="Search…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="input !pl-9 !py-2 w-full text-sm"
                    />
                  </div>
                </div>
                <div className="divide-y divide-border-subtle max-h-[60vh] overflow-y-auto">
                  {userList.map(u => (
                    <button
                      key={u.userId}
                      onClick={() => setSelectedUser(u.userId)}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-bg-tertiary/60 transition-colors',
                        selectedUser === u.userId && 'bg-orange/5',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{u.name}</p>
                        {u.lastMessage && (
                          <span className="text-[10px] text-white/40 shrink-0">{formatDistanceToNow(new Date(u.lastMessage.createdAt), { addSuffix: false })}</span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 truncate">{u.email}</p>
                      {u.lastMessage && (
                        <p className="text-xs text-white/40 truncate mt-0.5">{u.lastMessage.role === 'user' ? '↳ ' : ''}{u.lastMessage.content}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card overflow-hidden">
                {!selectedUser ? (
                  <div className="text-center py-16 text-white/50 text-sm">Pick a conversation from the list</div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto space-y-3">
                    {activeMessages.map(m => (
                      <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                          m.role === 'user' ? 'bg-orange text-white rounded-br-md' : 'bg-bg-tertiary text-white/90 rounded-bl-md',
                        )}>
                          {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : <span className="whitespace-pre-wrap">{m.content}</span>}
                          {m.context && <p className="text-[10px] opacity-60 mt-1">at {m.context}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
