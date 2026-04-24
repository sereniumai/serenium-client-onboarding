import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Mail, Save, Plus, Trash2, Bell } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { db, type FollowupTemplate } from '../../lib/mockDb';
import { useDbVersion } from '../../hooks/useDb';
import { toast } from 'sonner';
import { cn } from '../../lib/cn';

export function FollowupSettingsPage() {
  useDbVersion();
  const [settings, setSettings] = useState(db.getFollowupSettings());
  const [recipientDraft, setRecipientDraft] = useState('');

  const persist = (next: typeof settings) => {
    setSettings(next);
    db.saveFollowupSettings(next);
  };

  const updateTemplate = (key: string, patch: Partial<FollowupTemplate>) => {
    persist({
      ...settings,
      templates: settings.templates.map(t => (t.key === key ? { ...t, ...patch } : t)),
    });
  };

  const removeTemplate = (key: string) => {
    if (['gentle', 'stronger', 'final'].includes(key)) {
      toast.error("Can't remove a default template — toggle it off instead.");
      return;
    }
    const tpl = settings.templates.find(t => t.key === key);
    if (!window.confirm(`Remove template "${tpl?.label ?? key}"? This can’t be undone.`)) return;
    persist({ ...settings, templates: settings.templates.filter(t => t.key !== key) });
    toast.success('Template removed');
  };

  const addTemplate = () => {
    const key = `custom-${Date.now()}`;
    persist({
      ...settings,
      templates: [...settings.templates, {
        key, label: 'New template', subject: '',
        body: 'Hi {{firstName}},\n\n',
        autoSendAfterDays: null, autoSendEnabled: false,
      }],
    });
  };

  const addRecipient = () => {
    const email = recipientDraft.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (settings.notifyAdmins.includes(email)) { setRecipientDraft(''); return; }
    persist({ ...settings, notifyAdmins: [...settings.notifyAdmins, email] });
    setRecipientDraft('');
  };

  const removeRecipient = (email: string) => {
    persist({ ...settings, notifyAdmins: settings.notifyAdmins.filter(e => e !== email) });
  };

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-4xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-5">
            <ChevronLeft className="h-4 w-4" /> Admin
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow">Settings</p>
              <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight">Follow-up emails</h1>
            </div>
          </div>
          <p className="text-white/60 text-sm md:text-base mb-10 max-w-2xl">
            Automatically chase clients who go quiet. Templates below are sent based on days-since-last-activity. You can also send any template manually from a client page.
          </p>

          {/* GLOBAL TOGGLE + RECIPIENTS */}
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-semibold">Auto follow-ups</p>
                <p className="text-sm text-white/60 mt-0.5">Master switch. Turn off to pause all automatic sends (manual sends still work).</p>
              </div>
              <Toggle checked={settings.enabled} onChange={v => persist({ ...settings, enabled: v })} />
            </div>

            <div className="border-t border-border-subtle pt-5">
              <p className="font-semibold mb-1 flex items-center gap-2"><Bell className="h-4 w-4 text-orange" /> CC admins on every send</p>
              <p className="text-sm text-white/60 mb-3">They'll get a copy so the team sees what clients are receiving.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {settings.notifyAdmins.length === 0 && <span className="text-xs text-white/40">No admins added yet.</span>}
                {settings.notifyAdmins.map(email => (
                  <span key={email} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-orange/10 text-orange border border-orange/20 text-xs">
                    {email}
                    <button onClick={() => removeRecipient(email)} className="hover:text-white"><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="admin@sereniumai.com"
                  value={recipientDraft}
                  onChange={e => setRecipientDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
                  className="input flex-1"
                />
                <button onClick={addRecipient} className="btn-secondary whitespace-nowrap"><Plus className="h-4 w-4" /> Add</button>
              </div>
            </div>
          </div>

          {/* TEMPLATES */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl">Templates</h2>
            <button onClick={addTemplate} className="btn-secondary text-sm"><Plus className="h-4 w-4" /> Add template</button>
          </div>

          <div className="space-y-5">
            {settings.templates.map((t, i) => (
              <TemplateCard
                key={t.key}
                index={i + 1}
                template={t}
                onUpdate={patch => updateTemplate(t.key, patch)}
                onRemove={() => removeTemplate(t.key)}
                masterOn={settings.enabled}
              />
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl border border-orange/20 bg-orange/5 text-sm text-white/70">
            <p className="font-semibold text-white mb-1">Available placeholders</p>
            <ul className="text-xs space-y-0.5">
              <li><code className="font-mono text-orange">{'{{firstName}}'}</code> — primary contact's first name</li>
              <li><code className="font-mono text-orange">{'{{businessName}}'}</code> — client business name</li>
              <li><code className="font-mono text-orange">{'{{portalUrl}}'}</code> — link back to their onboarding portal</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TemplateCard({
  index, template, onUpdate, onRemove, masterOn,
}: {
  index: number;
  template: FollowupTemplate;
  onUpdate: (patch: Partial<FollowupTemplate>) => void;
  onRemove: () => void;
  masterOn: boolean;
}) {
  const isDefault = ['gentle', 'stronger', 'final'].includes(template.key);
  const autoActive = masterOn && template.autoSendEnabled && template.autoSendAfterDays != null;

  return (
    <div className={cn('card', autoActive && 'border-orange/40')}>
      <div className="flex items-start gap-4 mb-4">
        <div className="h-8 w-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center font-semibold text-sm shrink-0">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={template.label}
            onChange={e => onUpdate({ label: e.target.value })}
            className="font-semibold text-lg bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-orange/40 rounded px-1 -mx-1"
          />
          <p className="text-xs text-white/40 mt-0.5">Template key: <code className="font-mono">{template.key}</code></p>
        </div>
        {!isDefault && (
          <button onClick={onRemove} className="text-white/40 hover:text-warning" title="Remove template">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <label className="label">Subject</label>
      <input value={template.subject} onChange={e => onUpdate({ subject: e.target.value })} className="input mb-4" placeholder="Email subject line" />

      <label className="label">Body</label>
      <textarea
        value={template.body}
        onChange={e => onUpdate({ body: e.target.value })}
        rows={8}
        className="input font-mono text-xs leading-relaxed"
      />

      <div className="border-t border-border-subtle pt-4 mt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Auto-send</p>
            <p className="text-xs text-white/50 mt-0.5">Send this automatically after N days of client inactivity.</p>
          </div>
          <Toggle checked={template.autoSendEnabled} onChange={v => onUpdate({ autoSendEnabled: v })} />
        </div>
        {template.autoSendEnabled && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-white/60">Send after</span>
            <input
              type="number"
              min={1}
              max={60}
              value={template.autoSendAfterDays ?? 0}
              onChange={e => onUpdate({ autoSendAfterDays: Math.max(1, parseInt(e.target.value || '0', 10)) })}
              className="input !w-20 !py-1.5 text-center"
            />
            <span className="text-white/60">days of inactivity</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
        <Save className="h-3 w-3" /> Changes save automatically
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
        checked ? 'bg-orange' : 'bg-bg-tertiary border border-border-subtle'
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}
