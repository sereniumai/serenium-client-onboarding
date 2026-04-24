import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Trash2, Bot } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../lib/mockDb';
import { useDbVersion } from '../hooks/useDb';
import { askAssistant, loadChatHistory, clearChatHistory, appendMessage, SUGGESTED_QUESTIONS, type ChatMessage } from '../lib/aiHelper';
import { Markdown } from './Markdown';
import { cn } from '../lib/cn';

export function AiHelperChat() {
  const { user } = useAuth();
  const location = useLocation();
  useDbVersion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages: ChatMessage[] = user?.id ? loadChatHistory(user.id) : [];

  const currentOrgId = user && user.role === 'client'
    ? db.listOrganizationsForUser(user.id)[0]?.id ?? null
    : null;

  const currentContext = (() => {
    const m = location.pathname.match(/\/services\/([^/]+)\/([^/]+)/);
    if (m) return `${m[1]}.${m[2]}`;
    const s = location.pathname.match(/\/services\/([^/]+)/);
    if (s) return s[1];
    return null;
  })();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, thinking]);

  if (!user || user.role === 'admin') return null;

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking || !user) return;
    appendMessage(user.id, currentOrgId, 'user', content, currentContext);
    setInput('');
    setThinking(true);

    try {
      const reply = await askAssistant(content);
      appendMessage(user.id, currentOrgId, 'assistant', reply, currentContext);
    } catch {
      appendMessage(user.id, currentOrgId, 'assistant', "Sorry — I hit a snag. Try again, or email contact@sereniumai.com for anything urgent.", currentContext);
    } finally {
      setThinking(false);
    }
  };

  const clear = () => {
    if (!user?.id) return;
    if (messages.length > 0 && !window.confirm('Clear this conversation? This can’t be undone.')) return;
    clearChatHistory(user.id);
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full bg-orange text-white shadow-orange-glow hover:bg-orange-hover active:scale-95 transition-all flex items-center justify-center group"
            aria-label="Open onboarding assistant"
          >
            <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white animate-ping opacity-60" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2.5rem)] max-w-sm md:max-w-md h-[min(640px,calc(100vh-2.5rem))] flex flex-col bg-bg-secondary border border-border-emphasis rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-gradient-to-r from-orange/10 via-bg-secondary to-bg-secondary shrink-0">
              <div className="h-9 w-9 rounded-xl bg-orange flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Serenium assistant</p>
                <p className="text-[11px] text-white/50 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Here to help with onboarding
                </p>
              </div>
              {messages.length > 0 && (
                <button onClick={clear} className="text-white/40 hover:text-white/80 p-1.5 rounded hover:bg-white/5" title="Clear chat">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1.5 rounded hover:bg-white/5" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <div className="h-14 w-14 rounded-2xl bg-orange/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-7 w-7 text-orange" />
                  </div>
                  <p className="font-semibold text-sm mb-1">Hey — ask me anything</p>
                  <p className="text-xs text-white/50 mb-5 px-2">I can help you figure out what to put in each step, how to grant access to tools, and what's expected.</p>
                  <div className="space-y-1.5">
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-subtle hover:border-orange/30 transition-colors text-white/80"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}

              {thinking && <TypingIndicator />}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border-subtle p-3 bg-bg shrink-0">
              <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Ask about any onboarding step…"
                  rows={1}
                  className="flex-1 resize-none bg-bg-tertiary/60 border border-border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/30 placeholder:text-white/30 max-h-32"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || thinking}
                  className="h-9 w-9 shrink-0 rounded-xl bg-orange text-white hover:bg-orange-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="text-[10px] text-white/30 mt-2 text-center">Answers may be imperfect — our team always has your back.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-orange/15 text-orange flex items-center justify-center shrink-0 self-end">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-orange text-white rounded-br-md'
            : 'bg-bg-tertiary/70 border border-border-subtle text-white/90 rounded-bl-md'
        )}
      >
        {isUser ? message.content : <Markdown>{message.content}</Markdown>}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 justify-start">
      <div className="h-7 w-7 rounded-lg bg-orange/15 text-orange flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-bg-tertiary/70 border border-border-subtle rounded-2xl rounded-bl-md px-3.5 py-3 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce" />
      </div>
    </div>
  );
}
