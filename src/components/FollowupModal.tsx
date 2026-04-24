import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { db } from '../lib/mockDb';
import { cn } from '../lib/cn';

interface Props {
  orgId: string;
  orgName: string;
  contactName?: string;
  contactEmail?: string;
  onClose: () => void;
}

export function FollowupModal({ orgId, orgName, contactName, contactEmail, onClose }: Props) {
  const { user } = useAuth();
  const settings = db.getFollowupSettings();
  const history = db.listFollowupsForOrg(orgId);
  const [templateKey, setTemplateKey] = useState(settings.templates[0]?.key ?? '');
  const tpl = settings.templates.find(t => t.key === templateKey);

  const firstName = (contactName ?? '').split(' ')[0] || 'there';
  const portalUrl = `${window.location.origin}/onboarding/${orgId}`;

  const interpolate = (s: string) =>
    s.replace(/\{\{firstName\}\}/g, firstName)
     .replace(/\{\{businessName\}\}/g, orgName)
     .replace(/\{\{portalUrl\}\}/g, portalUrl);

  const [subject, setSubject] = useState(tpl ? interpolate(tpl.subject) : '');
  const [body, setBody] = useState(tpl ? interpolate(tpl.body) : '');

  // Body scroll lock + Esc to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const pickTemplate = (key: string) => {
    const next = settings.templates.find(t => t.key === key);
    setTemplateKey(key);
    if (next) { setSubject(interpolate(next.subject)); setBody(interpolate(next.body)); }
  };

  const send = () => {
    if (!contactEmail) {
      toast.error('This client has no primary contact email set.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required.');
      return;
    }
    db.recordFollowupSent({
      organizationId: orgId,
      templateKey,
      subject: subject.trim(),
      body: body.trim(),
      sentBy: user?.id ?? null,
      mode: 'manual',
    });
    toast.success(`Follow-up queued for ${contactEmail}`, {
      description: 'Email delivery is stubbed — will send once Resend is wired.',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Follow-up email for ${orgName}`}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="eyebrow mb-1">Follow-up email</p>
            <h2 className="font-display font-bold text-2xl">{orgName}</h2>
            <p className="text-sm text-white/60 mt-1">
              {contactEmail
                ? <>To: <span className="text-white/80">{contactEmail}</span></>
                : <span className="text-warning">No contact email on file — add one first.</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <label className="label">Template</label>
        <div className="flex flex-wrap gap-2 mb-5">
          {settings.templates.map(t => (
            <button
              key={t.key}
              onClick={() => pickTemplate(t.key)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                templateKey === t.key ? 'bg-orange text-white border-orange' : 'bg-bg-tertiary text-white/70 border-border-subtle hover:border-border-emphasis'
              )}
            >{t.label}</button>
          ))}
        </div>

        <label className="label">Subject</label>
        <input className="input mb-4" value={subject} onChange={e => setSubject(e.target.value)} />

        <label className="label">Body</label>
        <textarea className="input font-mono text-xs leading-relaxed" rows={12} value={body} onChange={e => setBody(e.target.value)} />
        <p className="text-xs text-white/40 mt-2">Placeholders auto-filled: {`{{firstName}}`}, {`{{businessName}}`}, {`{{portalUrl}}`}</p>

        {history.length > 0 && (
          <div className="mt-6 pt-5 border-t border-border-subtle">
            <p className="eyebrow mb-2">Recent follow-ups</p>
            <ul className="space-y-1.5 text-xs text-white/60">
              {history.slice(0, 5).map(h => (
                <li key={h.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{h.subject}</span>
                  <span className="text-white/40 whitespace-nowrap">
                    {formatDistanceToNow(new Date(h.sentAt), { addSuffix: true })} · {h.mode}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-border-subtle">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={send} disabled={!contactEmail} className="btn-primary">
            <Send className="h-4 w-4" /> Send follow-up
          </button>
        </div>
      </div>
    </div>
  );
}
