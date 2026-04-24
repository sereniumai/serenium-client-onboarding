import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { getFollowupSettings, sendFollowup, listFollowupsSent } from '../lib/db/followups';
import { useAuth } from '../auth/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/cn';

interface Props {
  orgId: string;
  primaryContactEmail: string | null;
  onClose: () => void;
}

export function FollowupModal({ orgId, primaryContactEmail, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['followup_settings'], queryFn: getFollowupSettings });
  const { data: sent = [] } = useQuery({
    queryKey: ['followups_sent', orgId],
    queryFn: () => listFollowupsSent(orgId),
  });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!settings) return;
    if (selectedKey === null && settings.templates[0]) {
      setSelectedKey(settings.templates[0].key);
    }
  }, [settings, selectedKey]);

  useEffect(() => {
    if (!settings) return;
    const t = settings.templates.find(x => x.key === selectedKey);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }, [selectedKey, settings]);

  const canSend = !!primaryContactEmail && !!subject.trim() && !!body.trim();

  const send = async () => {
    if (!canSend || !selectedKey) return;
    setSending(true);
    try {
      await sendFollowup({
        organizationId: orgId,
        templateKey: selectedKey,
        subject: subject.trim(),
        body: body.trim(),
        sentBy: user?.id,
        mode: 'manual',
      });
      qc.invalidateQueries({ queryKey: ['followups_sent', orgId] });
      qc.invalidateQueries({ queryKey: ['activity', orgId] });
      toast.success('Follow-up sent');
      onClose();
    } catch (err) {
      toast.error('Send failed', { description: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <div>
              <p className="eyebrow">Send follow-up</p>
              <p className="text-xs text-white/50 mt-0.5">
                To: <span className="text-white/80">{primaryContactEmail ?? 'No email on file'}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="h-4 w-4" /></button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {settings && settings.templates.length === 0 ? (
              <div className="text-sm text-white/60">
                No templates yet. Head to <span className="text-orange">Follow-ups</span> in the sidebar to create one.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {settings?.templates.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setSelectedKey(t.key)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        selectedKey === t.key
                          ? 'bg-orange/15 text-orange border-orange/30'
                          : 'text-white/60 border-border-subtle hover:border-border-emphasis hover:text-white',
                      )}
                    >{t.label}</button>
                  ))}
                </div>
                <div>
                  <label className="label">Subject</label>
                  <input className="input" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                <div>
                  <label className="label">Body</label>
                  <textarea className="input min-h-[180px]" value={body} onChange={e => setBody(e.target.value)} />
                  <p className="text-[11px] text-white/40 mt-1.5">Placeholders: <code>{'{{firstName}}'}</code>, <code>{'{{businessName}}'}</code>, <code>{'{{portalUrl}}'}</code></p>
                </div>

                {sent.length > 0 && (
                  <div className="pt-4 border-t border-border-subtle">
                    <p className="eyebrow mb-2">Previously sent</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {sent.slice(0, 5).map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs text-white/60">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate flex-1">{s.subject}</span>
                          <span className="shrink-0 text-white/30">{formatDistanceToNow(new Date(s.sentAt), { addSuffix: true })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-between">
            {!primaryContactEmail && <span className="text-xs text-error">Primary contact email missing on this client.</span>}
            <div className="ml-auto flex gap-2">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={send} disabled={!canSend || sending} className="btn-primary">
                <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send now'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
