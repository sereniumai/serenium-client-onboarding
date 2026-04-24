import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Trash2, Minus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { useOrgsForUser } from '../hooks/useOrgs';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import { getOrgProgress } from '../lib/progress';
import { askAssistant, loadChatForUser, saveMessage, clearChat } from '../lib/aiHelper';
import { ARIA } from '../config/personas';
import { suggestionsForContext } from './aiSuggestions';
import { Markdown } from './Markdown';
import { cn } from '../lib/cn';

export function AiHelperChat() {
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userOrgs = useOrgsForUser(user && user.role === 'client' ? user.id : undefined);
  const org = userOrgs.data?.[0] ?? null;
  const { snapshot } = useOrgSnapshot(org?.id);
  const progress = snapshot ? getOrgProgress(snapshot) : null;

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['ai-chat', user?.id],
    queryFn: () => loadChatForUser(user!.id),
    enabled: !!user && open,
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
  const suggestions = suggestionsForContext(currentContext);

  const send = async (prompt?: string) => {
    const content = (prompt ?? input).trim();
    if (!content || thinking) return;
    setInput('');
    setThinking(true);

    try {
      await saveMessage({
        userId: user.id,
        organizationId: org?.id ?? null,
        role: 'user',
        content,
        context: currentContext,
      });
      qc.invalidateQueries({ queryKey: ['ai-chat', user.id] });

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
        userId: user.id,
        organizationId: org?.id ?? null,
        role: 'assistant',
        content: reply,
        context: currentContext,
      });
      qc.invalidateQueries({ queryKey: ['ai-chat', user.id] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[chat] send failed', err);
      toast.error('Could not reach Aria', { description: message });
    } finally {
      setThinking(false);
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const runClear = async () => {
    setShowClearConfirm(false);
    try {
      await clearChat(user.id);
      refetch();
    } catch (err) {
      toast.error("Couldn't clear chat", { description: (err as Error).message });
    }
  };

  return (
    <>
      {!open && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 h-14 w-14 rounded-full bg-orange shadow-orange-glow text-white flex items-center justify-center z-40 hover:scale-105 transition-transform"
          aria-label="Open Aria chat"
        >
          <Sparkles className="h-6 w-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-5 right-5 w-[min(380px,calc(100vw-2.5rem))] h-[min(600px,calc(100vh-6rem))] z-50 bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center gap-2.5">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0', ARIA.avatarColor)}>
                {ARIA.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{ARIA.name}</p>
                <p className="text-[10px] text-white/40 truncate">{ARIA.role}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white p-1 rounded hover:bg-bg-tertiary transition-colors" title="Minimize" aria-label="Minimize">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white p-1 rounded hover:bg-bg-tertiary transition-colors" title="Close" aria-label="Close chat">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {messages.length === 0 ? (
                <AriaIntro suggestions={suggestions} onPrompt={p => send(p)} />
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

            {/* Context-aware suggestion chips when there's an active conversation */}
            {messages.length > 0 && suggestions.length > 0 && (
              <div className="border-t border-border-subtle px-3 py-2 flex gap-1.5 overflow-x-auto">
                {suggestions.slice(0, 3).map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={thinking}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-bg-tertiary text-white/70 hover:text-white hover:bg-bg-tertiary/80 border border-border-subtle hover:border-orange/40 transition-colors whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

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
              {messages.length > 0 && (
                <button onClick={() => setShowClearConfirm(true)} className="text-[10px] text-white/30 hover:text-white/60 inline-flex items-center gap-1 mt-2">
                  <Trash2 className="h-2.5 w-2.5" /> Clear conversation
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showClearConfirm}
        tone="destructive"
        title="Clear chat history?"
        body="All of your past questions and Aria's answers will be removed from your account. Can't be undone."
        confirmLabel="Clear everything"
        cancelLabel="Keep them"
        onConfirm={runClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}

function AriaIntro({ suggestions, onPrompt }: { suggestions: string[]; onPrompt: (p: string) => void }) {
  return (
    <div className="py-2">
      <div className="text-center mb-4">
        <div className={cn('h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2', ARIA.avatarColor)}>{ARIA.initial}</div>
        <h3 className="font-display font-bold text-base mb-1">Hi, I'm Aria.</h3>
        <p className="text-xs text-white/55 leading-relaxed px-2">{ARIA.blurb}</p>
      </div>
      {suggestions.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 px-1">Try asking</p>
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
