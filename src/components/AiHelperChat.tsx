import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Trash2, Bot, LifeBuoy, Paperclip, BarChart3, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { db } from '../lib/mockDb';
import { useDbVersion } from '../hooks/useDb';
import { getOrgProgress } from '../lib/progress';
import {
  askAssistant, loadChatHistory, clearChatHistory, appendMessage,
  SUGGESTED_QUESTIONS_ONBOARDING, SUGGESTED_QUESTIONS_ANALYTICS,
  type ChatMessage, type ChatMode, type Attachment,
} from '../lib/aiHelper';
import { Markdown } from './Markdown';
import { cn } from '../lib/cn';

// 5 MB per PDF, max 3 attached at a time. Keeps us well under localStorage caps
// and controls Anthropic token cost per request.
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;

export function AiHelperChat() {
  const { user } = useAuth();
  const location = useLocation();
  useDbVersion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [requestingHelp, setRequestingHelp] = useState(false);
  const [helpNote, setHelpNote] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const onReports = /\/onboarding\/[^/]+\/reports$/.test(location.pathname);
  const onOnboarding = location.pathname.startsWith('/onboarding/') && !onReports;
  const mode: ChatMode = (onReports || isAdmin) ? 'analytics' : 'onboarding';

  const messages: ChatMessage[] = loadChatHistory(user.id);
  const attachments = db.listAnalyticsUploadsForUser(user.id);

  const currentOrg = !isAdmin
    ? db.listOrganizationsForUser(user.id)[0] ?? null
    : null;
  const currentOrgId = currentOrg?.id ?? null;

  const currentContext = (() => {
    const m = location.pathname.match(/\/services\/([^/]+)\/([^/]+)/);
    if (m) return `${m[1]}.${m[2]}`;
    const s = location.pathname.match(/\/services\/([^/]+)/);
    if (s) return s[1];
    return null;
  })();

  const userContext = (() => {
    if (!currentOrg) return null;
    const progress = getOrgProgress(currentOrg.id);
    const submissions = db.listSubmissionsForOrg(currentOrg.id);
    const pick = (svc: string, mod: string, field: string) =>
      submissions.find(s => s.fieldKey === `${svc}.${mod}.${field}`)?.value;

    return {
      firstName: user.fullName.split(' ')[0],
      businessName: currentOrg.businessName,
      progressPercent: progress.overall,
      completeServices: progress.enabledServices.filter(k => {
        const mods = progress.perService[k];
        return mods && mods.length > 0 && mods.every(m => m.status === 'complete');
      }),
      yearsInBusiness: pick('business_profile', 'years_in_business', 'years_in_business'),
      serviceAreas: pick('business_profile', 'service_areas', 'service_areas'),
      servicesOffered: pick('business_profile', 'services_offered', 'services_offered'),
      emergencyOffered: pick('business_profile', 'emergency_service', 'emergency_offered'),
    };
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

  // Hide the chat entirely on auth pages or other routes where it doesn't belong.
  if (!onOnboarding && !onReports && !location.pathname.startsWith('/admin')) return null;

  const suggested = mode === 'analytics' ? SUGGESTED_QUESTIONS_ANALYTICS : SUGGESTED_QUESTIONS_ONBOARDING;

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;
    appendMessage(user.id, currentOrgId, 'user', content, currentContext);
    setInput('');
    setThinking(true);

    try {
      const historyForApi = messages.map(m => ({ role: m.role, content: m.content }));
      const attachmentsForApi: Attachment[] = mode === 'analytics'
        ? attachments.slice(0, MAX_ATTACHMENTS).map(a => ({
            fileName: a.fileName,
            mimeType: a.mimeType,
            data: a.fileData,
          }))
        : [];
      const reply = await askAssistant(content, {
        history: historyForApi,
        context: currentContext,
        userContext,
        mode,
        attachments: attachmentsForApi,
      });
      appendMessage(user.id, currentOrgId, 'assistant', reply, currentContext);
    } catch {
      appendMessage(user.id, currentOrgId, 'assistant', "Sorry, I hit a snag. Try again, or email contact@sereniumai.com for anything urgent.", currentContext);
    } finally {
      setThinking(false);
    }
  };

  const clear = () => {
    if (messages.length > 0 && !window.confirm('Clear this conversation? This can’t be undone.')) return;
    clearChatHistory(user.id);
  };

  const submitHumanHelp = () => {
    if (!currentOrgId) {
      toast.error('Not linked to a client org, can\'t route this.');
      return;
    }
    db.requestHumanHelp({
      organizationId: currentOrgId,
      userId: user.id,
      note: helpNote.trim(),
      context: currentContext,
    });
    appendMessage(
      user.id, currentOrgId, 'assistant',
      `Got it. The Serenium team has been notified and someone will reach out to you directly at ${user.email}. In the meantime, you can keep working through the portal or ask me anything else.`,
      currentContext,
    );
    toast.success('Help request sent', { description: 'The Serenium team has been notified.' });
    setHelpNote('');
    setRequestingHelp(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const current = db.listAnalyticsUploadsForUser(user.id).length;
    const remaining = MAX_ATTACHMENTS - current;
    if (remaining <= 0) {
      toast.error(`You already have ${MAX_ATTACHMENTS} reports attached. Remove one to add another.`);
      return;
    }
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name}: only PDFs are supported right now.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Limit is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`);
        continue;
      }
      try {
        const data = await readFileAsBase64(file);
        db.addAnalyticsUpload({
          userId: user.id,
          organizationId: currentOrgId,
          fileName: file.name,
          fileData: data,
          mimeType: file.type,
          fileSize: file.size,
        });
      } catch {
        toast.error(`${file.name}: couldn't read the file.`);
      }
    }
    toast.success('Report attached', { description: 'It\'ll be included with your next question.' });
  };

  const removeAttachment = (id: string) => {
    db.removeAnalyticsUpload(id);
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
            aria-label="Open assistant"
          >
            {mode === 'analytics' ? <BarChart3 className="h-6 w-6 group-hover:animate-pulse" /> : <Sparkles className="h-6 w-6 group-hover:animate-pulse" />}
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
                {mode === 'analytics' ? <BarChart3 className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {mode === 'analytics' ? 'Serenium analyst' : 'Serenium assistant'}
                </p>
                <p className="text-[11px] text-white/50 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  {mode === 'analytics' ? 'Ready to read your reports' : 'Here to help with onboarding'}
                </p>
              </div>
              {!isAdmin && (
                <button
                  onClick={() => setRequestingHelp(v => !v)}
                  className={cn(
                    'p-1.5 rounded hover:bg-white/5 transition-colors',
                    requestingHelp ? 'text-orange' : 'text-white/40 hover:text-white/80',
                  )}
                  title="Talk to a human"
                  aria-label="Request help from the Serenium team"
                >
                  <LifeBuoy className="h-4 w-4" />
                </button>
              )}
              {messages.length > 0 && (
                <button onClick={clear} className="text-white/40 hover:text-white/80 p-1.5 rounded hover:bg-white/5" title="Clear chat">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1.5 rounded hover:bg-white/5" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Human help form */}
            <AnimatePresence>
              {requestingHelp && !isAdmin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-border-subtle bg-orange/5"
                >
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-sm mb-1">Talk to a human</p>
                      <p className="text-xs text-white/60">The Serenium team will be notified and will reach out to you at <span className="text-white/80">{user.email}</span>.</p>
                    </div>
                    <textarea
                      value={helpNote}
                      onChange={e => setHelpNote(e.target.value)}
                      placeholder="What do you need help with? (optional)"
                      rows={2}
                      className="w-full resize-none bg-bg-tertiary/60 border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange/50 placeholder:text-white/30"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setRequestingHelp(false); setHelpNote(''); }}
                        className="text-xs text-white/60 hover:text-white px-3 py-1.5"
                      >Cancel</button>
                      <button
                        onClick={submitHumanHelp}
                        className="text-xs bg-orange hover:bg-orange-hover text-white font-medium px-3 py-1.5 rounded-md transition-colors"
                      >Send help request</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attached reports strip (analytics mode only) */}
            {mode === 'analytics' && attachments.length > 0 && (
              <div className="border-b border-border-subtle px-3 py-2 flex flex-wrap gap-1.5 bg-bg-tertiary/20">
                {attachments.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-orange/10 border border-orange/20 text-orange text-xs max-w-full">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[160px]">{a.fileName}</span>
                    <button
                      onClick={() => removeAttachment(a.id)}
                      className="h-4 w-4 rounded hover:bg-orange/20 flex items-center justify-center shrink-0"
                      aria-label={`Remove ${a.fileName}`}
                    ><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <div className="h-14 w-14 rounded-2xl bg-orange/10 flex items-center justify-center mx-auto mb-3">
                    {mode === 'analytics' ? <BarChart3 className="h-7 w-7 text-orange" /> : <Sparkles className="h-7 w-7 text-orange" />}
                  </div>
                  <p className="font-semibold text-sm mb-1">
                    {mode === 'analytics'
                      ? 'What do your numbers say?'
                      : userContext?.firstName ? `Hey ${userContext.firstName}, ask me anything` : 'Hey, ask me anything'}
                  </p>
                  <p className="text-xs text-white/50 mb-5 px-2">
                    {mode === 'analytics'
                      ? 'Attach your monthly reports (PDF) with the paperclip, then ask anything about performance across your channels.'
                      : userContext?.businessName
                        ? `I've got the full ${userContext.businessName} onboarding loaded. Ask what a field means, how to grant access, or what's next.`
                        : "I can help you figure out what to put in each step, how to grant access to tools, and what's expected."}
                  </p>
                  <div className="space-y-1.5">
                    {suggested.map(q => (
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

              {messages.map(m => <MessageBubble key={m.id} message={m} />)}
              {thinking && <TypingIndicator />}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border-subtle p-3 bg-bg shrink-0">
              <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-end gap-2">
                {mode === 'analytics' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 w-9 shrink-0 rounded-xl bg-bg-tertiary/60 border border-border-subtle hover:border-orange/40 text-white/70 hover:text-orange flex items-center justify-center transition-colors"
                      title="Attach a PDF report"
                      aria-label="Attach a PDF report"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </>
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder={mode === 'analytics' ? 'Ask about your reports…' : 'Ask about any onboarding step…'}
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
              <p className="text-[10px] text-white/30 mt-2 text-center">
                {mode === 'analytics'
                  ? 'Upload limit: 3 PDFs, 5 MB each. Attachments stay available for the whole conversation.'
                  : 'Answers may be imperfect, our team always has your back.'}
              </p>
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
            : 'bg-bg-tertiary/70 border border-border-subtle text-white/90 rounded-bl-md',
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

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      // FileReader returns "data:<mime>;base64,<data>" — strip the prefix.
      const result = r.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = () => reject(new Error('read error'));
    r.readAsDataURL(file);
  });
}
