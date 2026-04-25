import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, Minus, MessageCircleQuestion, Plus, MessagesSquare, ChevronLeft, Search, Sparkles } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { useOrgsForUser } from '../hooks/useOrgs';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import { getOrgProgress } from '../lib/progress';
import {
  askAssistant,
  loadChat,
  loadThreads,
  startNewThread,
  getOrCreateActiveThread,
  removeThread,
  setThreadTitle,
  deriveThreadTitle,
  saveMessage,
  isAriaEscalation,
  logAriaEscalation,
} from '../lib/aiHelper';
import { ARIA } from '../config/personas';
import { suggestionsForContext } from './aiSuggestions';
import { Markdown } from './Markdown';
import { cn } from '../lib/cn';

export function AiHelperChat() {
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userOrgs = useOrgsForUser(user && user.role === 'client' ? user.id : undefined);
  const org = userOrgs.data?.[0] ?? null;
  const { snapshot } = useOrgSnapshot(org?.id);
  const progress = snapshot ? getOrgProgress(snapshot) : null;

  // Threads list - keep cached for fast switching
  const { data: threads = [] } = useQuery({
    queryKey: ['ai-threads', user?.id],
    queryFn: () => loadThreads(user!.id),
    enabled: !!user && open,
  });

  // Establish an active thread on first open. Pick the most recent, or create one.
  useEffect(() => {
    if (!open || !user || activeThreadId) return;
    let cancelled = false;
    (async () => {
      const t = await getOrCreateActiveThread({ userId: user.id, organizationId: org?.id ?? null });
      if (!cancelled) {
        setActiveThreadId(t.id);
        qc.invalidateQueries({ queryKey: ['ai-threads', user.id] });
      }
    })().catch(err => console.error('[chat] ensure thread', err));
    return () => { cancelled = true; };
  }, [open, user, org?.id, activeThreadId, qc]);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['ai-chat', activeThreadId],
    queryFn: () => loadChat(activeThreadId!),
    enabled: !!activeThreadId && open,
  });

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages.length, thinking]);

  useEffect(() => {
    const openFromElsewhere = () => setOpen(true);
    window.addEventListener('serenium:open-chat', openFromElsewhere);
    return () => window.removeEventListener('serenium:open-chat', openFromElsewhere);
  }, []);

  if (!user) return null;

  const currentContext = deriveContext(location.pathname);
  const suggestions = suggestionsForContext(currentContext, {
    enabledServices: progress?.enabledServices,
  });
  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;

  const send = async (prompt?: string) => {
    const content = (prompt ?? input).trim();
    if (!content || thinking || !activeThreadId) return;
    setInput('');
    setThinking(true);

    try {
      // Auto-title the thread on the first user message.
      const isFirstMessage = messages.length === 0;
      if (isFirstMessage && activeThread && (activeThread.title === 'New chat' || activeThread.title === 'Default')) {
        const newTitle = deriveThreadTitle(content);
        setThreadTitle(activeThreadId, newTitle).catch(() => {});
        qc.invalidateQueries({ queryKey: ['ai-threads', user.id] });
      }

      await saveMessage({
        threadId: activeThreadId,
        userId: user.id,
        organizationId: org?.id ?? null,
        role: 'user',
        content,
        context: currentContext,
      });
      qc.invalidateQueries({ queryKey: ['ai-chat', activeThreadId] });

      const userContext = org && progress ? {
        firstName: user.fullName.split(' ')[0],
        businessName: org.businessName,
        progressPercent: progress.overall,
        completeServices: progress.enabledServices.filter(k => {
          const mods = progress.perService[k];
          return mods && mods.length > 0 && mods.every(m => m.status === 'complete');
        }),
      } : null;

      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const reply = await askAssistant(content, {
        mode: 'onboarding',
        context: currentContext,
        userContext,
        history,
      });

      if (!reply) throw new Error('The assistant returned an empty reply.');

      await saveMessage({
        threadId: activeThreadId,
        userId: user.id,
        organizationId: org?.id ?? null,
        role: 'assistant',
        content: reply,
        context: currentContext,
      });
      qc.invalidateQueries({ queryKey: ['ai-chat', activeThreadId] });
      qc.invalidateQueries({ queryKey: ['ai-threads', user.id] });

      // If Aria escalated, log it + email the Serenium team. Fire-and-forget;
      // failures don't block the chat.
      if (org?.id && isAriaEscalation(reply)) {
        void logAriaEscalation({
          organizationId: org.id,
          threadId: activeThreadId,
          question: content,
          contextSnippet: reply.slice(0, 1200),
          pageContext: currentContext,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[chat] send failed', err);
      toast.error('Could not reach Aria', { description: message });
    } finally {
      setThinking(false);
    }
  };

  const handleNewChat = async () => {
    try {
      // Reuse an existing empty "New chat" thread if one is already open. Avoids
      // accumulating ghost rows every time the user clicks +.
      const reusable = threads.find(t => t.title === 'New chat');
      if (reusable) {
        setActiveThreadId(reusable.id);
        setShowThreads(false);
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
      const t = await startNewThread({ userId: user.id, organizationId: org?.id ?? null });
      setActiveThreadId(t.id);
      setShowThreads(false);
      qc.invalidateQueries({ queryKey: ['ai-threads', user.id] });
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      toast.error("Couldn't start new chat", { description: (err as Error).message });
    }
  };

  const [threadSearch, setThreadSearch] = useState('');

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const runDeleteThread = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await removeThread(id);
      // If we deleted the active one, fall back to most recent or null
      if (id === activeThreadId) {
        const remaining = threads.filter(t => t.id !== id);
        setActiveThreadId(remaining[0]?.id ?? null);
      }
      qc.invalidateQueries({ queryKey: ['ai-threads', user.id] });
      refetch();
    } catch (err) {
      toast.error("Couldn't delete chat", { description: (err as Error).message });
    }
  };

  const switchThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setShowThreads(false);
  };

  return (
    <>
      {!open && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={() => setOpen(true)}
          className="group fixed bottom-5 right-5 h-12 pl-4 pr-5 rounded-full bg-orange shadow-orange-glow text-white inline-flex items-center gap-2.5 z-40 hover:scale-[1.03] hover:bg-orange-hover transition-all font-semibold text-sm"
          aria-label="Open Aria chat"
        >
          <MessageCircleQuestion className="h-5 w-5 shrink-0" strokeWidth={2.2} />
          <span>Ask Aria</span>
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 w-[min(400px,calc(100vw-2.5rem))] h-[min(640px,calc(100vh-6rem))] z-50 bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* HEADER */}
            <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center gap-2.5">
              {showThreads ? (
                <button
                  onClick={() => setShowThreads(false)}
                  className="text-white/50 hover:text-white p-1 rounded hover:bg-bg-tertiary transition-colors"
                  aria-label="Back to chat"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : (
                <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0', ARIA.avatarColor)}>
                  {ARIA.initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {showThreads ? (
                  <p className="text-sm font-semibold truncate">Threads</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold leading-tight truncate">{ARIA.name}</p>
                    <p className="text-[10px] text-white/40 truncate">{activeThread?.title && activeThread.title !== 'New chat' && activeThread.title !== 'Default' ? activeThread.title : ARIA.role}</p>
                  </>
                )}
              </div>
              {!showThreads && (
                <>
                  <button
                    onClick={handleNewChat}
                    className="text-white/50 hover:text-orange p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                    title="New chat"
                    aria-label="New chat"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowThreads(true)}
                    className="text-white/50 hover:text-white p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                    title="Past chats"
                    aria-label="Past chats"
                  >
                    <MessagesSquare className="h-4 w-4" />
                  </button>
                </>
              )}
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white p-1 rounded hover:bg-bg-tertiary transition-colors" title="Minimize" aria-label="Minimize">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white p-1 rounded hover:bg-bg-tertiary transition-colors" title="Close" aria-label="Close chat">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* THREAD LIST VIEW */}
            {showThreads ? (
              <ThreadsList
                threads={threads}
                activeThreadId={activeThreadId}
                onSwitch={switchThread}
                onNewChat={handleNewChat}
                onDelete={(id) => setPendingDeleteId(id)}
                search={threadSearch}
                onSearchChange={setThreadSearch}
              />
            ) : (
              <>
                {/* MESSAGES */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                  {messages.length === 0 ? (
                    <AriaIntro suggestions={suggestions} onPrompt={p => send(p)} firstName={user.fullName.split(' ')[0]} />
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {m.role === 'assistant' && (
                          <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5', ARIA.avatarColor)}>{ARIA.initial}</div>
                        )}
                        <div className={cn(
                          'max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-snug',
                          m.role === 'user' ? 'bg-orange text-white rounded-br-md' : 'bg-bg-tertiary text-white/90 rounded-bl-md',
                        )}>
                          {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : <span className="whitespace-pre-wrap">{m.content}</span>}
                        </div>
                      </div>
                    ))
                  )}
                  {thinking && (
                    <div className="flex gap-2 justify-start">
                      <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5', ARIA.avatarColor)}>{ARIA.initial}</div>
                      <div className="bg-bg-tertiary rounded-2xl rounded-bl-md px-3 py-2.5">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {/* COMPOSER */}
                <div className="border-t border-border-subtle px-3 py-2.5 bg-bg-secondary">
                  <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder="Ask Aria…"
                      rows={1}
                      className="flex-1 resize-none bg-bg-tertiary/60 border border-border-subtle rounded-xl px-3 py-2 text-sm outline-none focus:border-orange/50 max-h-24"
                    />
                    <button type="submit" disabled={!input.trim() || thinking} className="btn-primary !py-2 !px-3 shrink-0 !rounded-xl" aria-label="Send">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!pendingDeleteId}
        tone="destructive"
        title="Delete this conversation?"
        body="This chat and all its messages will be permanently removed. Your other conversations are not affected."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={runDeleteThread}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}

function ThreadsList({
  threads,
  activeThreadId,
  onSwitch,
  onNewChat,
  onDelete,
  search,
  onSearchChange,
}: {
  threads: import('../types').AiChatThread[];
  activeThreadId: string | null;
  onSwitch: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? threads.filter(t => t.title.toLowerCase().includes(q))
    : threads;

  // Bucket by recency. Today / Yesterday / This week / Older.
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 6 * 86_400_000;

  const buckets: { label: string; items: typeof filtered }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This week', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const t of filtered) {
    const ts = new Date(t.updatedAt).getTime();
    if (ts >= startOfToday) buckets[0].items.push(t);
    else if (ts >= startOfYesterday) buckets[1].items.push(t);
    else if (ts >= startOfWeek) buckets[2].items.push(t);
    else buckets[3].items.push(t);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sticky toolbar: New chat + search */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-border-subtle/60">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-orange hover:bg-orange-hover transition-colors text-sm font-semibold text-white shadow-orange-glow"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
        {threads.length > 4 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search threads"
              className="w-full bg-bg-tertiary/50 border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/35 outline-none focus:border-orange/40 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <ThreadsEmptyState searching={q.length > 0} onNewChat={onNewChat} />
        ) : (
          buckets.map(bucket =>
            bucket.items.length > 0 ? (
              <div key={bucket.label} className="mb-3 last:mb-0">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/35 px-2 mb-1.5">{bucket.label}</p>
                <ul className="space-y-0.5">
                  {bucket.items.map(t => {
                    const isActive = t.id === activeThreadId;
                    return (
                      <li key={t.id} className="group/thread relative">
                        <button
                          onClick={() => onSwitch(t.id)}
                          className={cn(
                            'w-full text-left pl-4 pr-9 py-2.5 rounded-lg transition-all relative',
                            isActive
                              ? 'bg-orange/[0.08]'
                              : 'hover:bg-white/[0.03]',
                          )}
                        >
                          {/* Left accent bar - subtle but unmistakable */}
                          {isActive && (
                            <span className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-orange" aria-hidden />
                          )}
                          <p className={cn('text-[13px] font-medium truncate leading-tight', isActive ? 'text-white' : 'text-white/85')}>
                            {t.title === 'Default' ? 'Earlier conversations' : t.title}
                          </p>
                          <p className="text-[11px] text-white/40 mt-1 leading-tight">{relativeTimeShort(t.updatedAt)}</p>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                          className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1.5 rounded-md text-white/25 hover:text-error hover:bg-error/10 opacity-60 group-hover/thread:opacity-100 transition-all"
                          aria-label="Delete thread"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null
          )
        )}
      </div>
    </div>
  );
}

function ThreadsEmptyState({ searching, onNewChat }: { searching: boolean; onNewChat: () => void }) {
  if (searching) {
    return (
      <div className="text-center py-10 px-4">
        <p className="text-sm text-white/55">No threads match.</p>
        <p className="text-xs text-white/35 mt-1">Try a different search.</p>
      </div>
    );
  }
  return (
    <div className="text-center py-10 px-6">
      <div className="h-12 w-12 rounded-full bg-orange/10 text-orange flex items-center justify-center mx-auto mb-3">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-white mb-1">No threads yet</p>
      <p className="text-xs text-white/55 leading-relaxed mb-4">Start a conversation with Aria, ask anything about your onboarding or any Serenium service.</p>
      <button
        onClick={onNewChat}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange/10 hover:bg-orange/20 border border-orange/30 hover:border-orange/60 transition-colors text-xs font-semibold text-orange"
      >
        <Plus className="h-3.5 w-3.5" /> Start your first chat
      </button>
    </div>
  );
}

function AriaIntro({ suggestions, onPrompt, firstName }: { suggestions: string[]; onPrompt: (p: string) => void; firstName?: string }) {
  const greeting = firstName ? `Hey ${firstName},` : 'Hey there,';
  return (
    <div className="py-1">
      <div className="flex gap-2 justify-start mb-4">
        <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5', ARIA.avatarColor)}>{ARIA.initial}</div>
        <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-bg-tertiary text-white/90 px-3 py-2.5 text-sm leading-snug">
          <p className="font-semibold text-white mb-1">{greeting}</p>
          <p className="text-white/80">
            I'm Aria, Serenium's AI assistant. I'm here to help you through onboarding, so if you get stuck on any step or just want a quick answer, ask me. I know every part of this portal.
          </p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-semibold mb-2 px-1">Try asking</p>
          <div className="space-y-1.5">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => onPrompt(s)}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle hover:border-orange/40 hover:bg-bg-tertiary/30 text-left text-xs text-white/75 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function deriveContext(pathname: string): string | null {
  const mod = pathname.match(/\/services\/([^/]+)\/([^/]+)/);
  if (mod) return `${mod[1]}.${mod[2]}`;
  const svc = pathname.match(/\/services\/([^/]+)/);
  if (svc) return svc[1];
  if (pathname.includes('/reports')) return 'reports';
  if (pathname.startsWith('/onboarding/')) return 'dashboard';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}
