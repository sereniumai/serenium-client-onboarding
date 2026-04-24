import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { useOrgsForUser } from '../hooks/useOrgs';
import { useOrgSnapshot } from '../hooks/useOnboarding';
import { getOrgProgress } from '../lib/progress';
import { askAssistant, loadChatForUser, saveMessage, clearChat } from '../lib/aiHelper';
import { PERSONAS, PERSONA_LIST, type PersonaKey } from '../config/personas';
import { Markdown } from './Markdown';
import { cn } from '../lib/cn';

const PERSONA_STORAGE_KEY = 'serenium.chat.persona';

export function AiHelperChat() {
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [persona, setPersona] = useState<PersonaKey | null>(() => {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem(PERSONA_STORAGE_KEY) as PersonaKey | null) ?? null;
  });
  const endRef = useRef<HTMLDivElement>(null);

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

  const currentContext = (() => {
    const m = location.pathname.match(/\/services\/([^/]+)\/([^/]+)/);
    if (m) return `${m[1]}.${m[2]}`;
    const s = location.pathname.match(/\/services\/([^/]+)/);
    if (s) return s[1];
    return null;
  })();

  const pickPersona = (key: PersonaKey) => {
    setPersona(key);
    try { localStorage.setItem(PERSONA_STORAGE_KEY, key); } catch {}
  };

  const send = async (prompt?: string) => {
    const content = (prompt ?? input).trim();
    if (!content || thinking || !persona) return;
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

      // Recent history for context (last 10 turns).
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const reply = await askAssistant(content, {
        mode: 'onboarding',
        persona,
        context: currentContext,
        userContext,
        history,
      });

      await saveMessage({
        userId: user.id,
        organizationId: org?.id ?? null,
        role: 'assistant',
        content: reply,
        context: currentContext,
      });
      qc.invalidateQueries({ queryKey: ['ai-chat', user.id] });
    } catch (err) {
      toast.error('Assistant had trouble replying', { description: (err as Error).message });
    } finally {
      setThinking(false);
    }
  };

  const onClear = async () => {
    if (!confirm('Clear your entire chat history with Rob and Adam?')) return;
    await clearChat(user.id);
    refetch();
  };

  const activePersona = persona ? PERSONAS[persona] : null;

  return (
    <>
      {!open && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 h-14 w-14 rounded-full bg-orange shadow-orange-glow text-white flex items-center justify-center z-40 group hover:scale-105 transition-transform"
          aria-label="Open Serenium chat"
        >
          <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-5 right-5 w-[calc(100vw-2.5rem)] sm:w-[400px] h-[calc(100vh-6rem)] sm:h-[640px] z-50 bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
              {activePersona ? (
                <>
                  <div className={cn('h-9 w-9 rounded-full flex items-center justify-center font-bold', activePersona.avatarColor)}>
                    {activePersona.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{activePersona.name}</p>
                    <p className="text-xs text-white/50 truncate">{activePersona.role}</p>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-orange" />
                  <p className="flex-1 text-sm font-semibold">Talk to Serenium</p>
                </>
              )}
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1" aria-label="Close chat">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Persona switcher when a persona is active */}
            {activePersona && (
              <div className="px-3 pt-2 pb-1 flex gap-1.5">
                {PERSONA_LIST.map(p => (
                  <button
                    key={p.key}
                    onClick={() => pickPersona(p.key)}
                    className={cn(
                      'flex-1 inline-flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      persona === p.key ? 'bg-orange/15 text-orange border border-orange/30' : 'text-white/50 hover:text-white hover:bg-bg-tertiary border border-transparent'
                    )}
                  >
                    <span className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold', p.avatarColor)}>{p.initial}</span>
                    <span>{p.name}</span>
                    <span className="text-white/40 hidden sm:inline">· {p.role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Messages / persona picker */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!activePersona ? (
                <PersonaPicker onPick={pickPersona} />
              ) : messages.length === 0 ? (
                <PersonaIntro persona={activePersona.key} onPrompt={p => send(p)} />
              ) : (
                messages.map(m => (
                  <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {m.role === 'assistant' && activePersona && (
                      <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', activePersona.avatarColor)}>{activePersona.initial}</div>
                    )}
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      m.role === 'user' ? 'bg-orange text-white rounded-br-md' : 'bg-bg-tertiary text-white/90 rounded-bl-md',
                    )}>
                      {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : <span className="whitespace-pre-wrap">{m.content}</span>}
                    </div>
                  </div>
                ))
              )}
              {thinking && (
                <div className="flex gap-2.5 justify-start">
                  {activePersona && <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', activePersona.avatarColor)}>{activePersona.initial}</div>}
                  <div className="bg-bg-tertiary rounded-2xl rounded-bl-md px-3 py-2.5">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            {activePersona && (
              <div className="border-t border-border-subtle px-3 py-3">
                <form
                  onSubmit={e => { e.preventDefault(); send(); }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Ask ${activePersona.name} a question…`}
                    rows={1}
                    className="input !py-2 text-sm resize-none max-h-32"
                  />
                  <button type="submit" disabled={!input.trim() || thinking} className="btn-primary !py-2 !px-3 shrink-0" aria-label="Send">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                <button onClick={onClear} className="text-[11px] text-white/40 hover:text-white/70 inline-flex items-center gap-1 mt-2">
                  <Trash2 className="h-3 w-3" /> Clear conversation
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PersonaPicker({ onPick }: { onPick: (k: PersonaKey) => void }) {
  return (
    <div>
      <div className="text-center mb-6">
        <Sparkles className="h-8 w-8 text-orange mx-auto mb-3" />
        <h3 className="font-display font-bold text-lg mb-1">Who do you want to talk to?</h3>
        <p className="text-sm text-white/60">Two members of the Serenium team are on standby. Pick the one whose area you need.</p>
      </div>
      <div className="space-y-3">
        {PERSONA_LIST.map(p => (
          <button
            key={p.key}
            onClick={() => onPick(p.key)}
            className="w-full card hover:border-orange/40 transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className={cn('h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0', p.avatarColor)}>{p.initial}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="font-display font-bold text-base">{p.name}</p>
                  <p className="text-xs text-orange">{p.role}</p>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-2">{p.blurb}</p>
                <div className="flex flex-wrap gap-1">
                  {p.expertise.map(e => (
                    <span key={e} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/60 border border-border-subtle">{e}</span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PersonaIntro({ persona, onPrompt }: { persona: PersonaKey; onPrompt: (p: string) => void }) {
  const p = PERSONAS[persona];
  const suggestions = persona === 'rob'
    ? [
        'Walk me through forwarding my phone to the AI',
        'How do I grant Serenium access to my WordPress site?',
        'What happens if the AI SMS doesn\'t know the answer?',
      ]
    : [
        'How do I add Serenium as a Manager on my Google Business Profile?',
        'Do I need a Meta Business Manager already set up?',
        'What\'s a Google Ads Manager Account link request?',
      ];
  return (
    <div className="text-center">
      <div className={cn('h-14 w-14 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3', p.avatarColor)}>{p.initial}</div>
      <h3 className="font-display font-bold text-lg mb-1">Hi, I'm {p.name}.</h3>
      <p className="text-sm text-white/60 mb-5">{p.blurb}</p>
      <div className="space-y-2">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => onPrompt(s)}
            className="w-full px-3 py-2 rounded-lg border border-border-subtle hover:border-orange/40 hover:bg-bg-tertiary/60 text-left text-xs text-white/80 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
