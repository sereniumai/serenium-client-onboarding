import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, Mail, Zap, MessageSquareText, AlertCircle, Copy, Check } from 'lucide-react';
import { LoadingState } from '../../components/LoadingState';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { getFollowupSettings, saveFollowupSettings } from '../../lib/db/followups';
import type { FollowupTemplate, FollowupSettings } from '../../types';
import { cn } from '../../lib/cn';

const QK = ['followup_settings'] as const;

export function FollowupSettingsPage() {
  const qc = useQueryClient();
  const { data: loaded, isLoading } = useQuery({ queryKey: QK, queryFn: getFollowupSettings });
  const [settings, setSettings] = useState<FollowupSettings | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { if (loaded) { setSettings(loaded); setDirty(false); } }, [loaded]);

  // Warn before the browser unloads with unsaved changes. This covers refresh,
  // tab close, and external navigation. Doesn't cover in-app <Link> clicks
  // (React Router needs its own blocker for that — not added here since most
  // admin work happens in this tab at a time).
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const save = useMutation({
    mutationFn: (s: FollowupSettings) => saveFollowupSettings(s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); setDirty(false); toast.success('Follow-up settings saved'); },
    onError: (err: Error) => toast.error('Save failed', { description: err.message }),
  });

  const update = (next: FollowupSettings) => { setSettings(next); setDirty(true); };

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-4xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="eyebrow mb-2">Communication</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.05] tracking-[-0.025em]">Follow-up emails</h1>
              <p className="text-white/60 text-sm mt-2 max-w-2xl">Chase emails that nudge quiet clients back into the portal. Set the cadence here, then send them manually from a client's page or let auto-send fire after days of inactivity.</p>
            </div>
            <div className="shrink-0 hidden md:block">
              <div className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
                settings?.enabled ? 'bg-success/10 text-success border-success/30' : 'bg-white/5 text-white/50 border-border-subtle',
              )}>
                <span className={cn('h-2 w-2 rounded-full', settings?.enabled ? 'bg-success animate-pulse' : 'bg-white/30')} />
                {settings?.enabled ? 'Live' : 'Paused'}
              </div>
            </div>
          </div>

          {(isLoading || !settings) ? (
            <LoadingState label="Loading follow-up settings…" />
          ) : (
            <Editor
              settings={settings}
              onChange={update}
              onSave={() => save.mutate(settings)}
              saving={save.isPending}
              dirty={dirty}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

const PLACEHOLDERS: Record<string, string> = {
  '{{firstName}}':    'Craig',
  '{{businessName}}': 'Sure West Roofing',
  '{{portalUrl}}':    'https://clients.sereniumai.com',
};

function Editor({ settings, onChange, onSave, saving, dirty }: {
  settings: FollowupSettings;
  onChange: (s: FollowupSettings) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  const addTemplate = () => {
    onChange({
      ...settings,
      templates: [...settings.templates, {
        key: `template_${crypto.randomUUID().slice(0, 8)}`,
        label: 'New template',
        subject: '',
        body: '',
        autoSendAfterDays: 7,
        autoSendEnabled: false,
      }],
    });
  };

  const updateTemplate = (i: number, patch: Partial<FollowupTemplate>) => {
    onChange({
      ...settings,
      templates: settings.templates.map((t, idx) => idx === i ? { ...t, ...patch } : t),
    });
  };

  const removeTemplate = (i: number) => {
    onChange({ ...settings, templates: settings.templates.filter((_, idx) => idx !== i) });
  };

  const autoTemplates = settings.templates.filter(t => t.autoSendEnabled);
  const hasCadence = autoTemplates.length > 0;

  return (
    <div className="space-y-8">
      {/* Master switch */}
      <div className={cn(
        'card relative overflow-hidden',
        settings.enabled ? 'border-orange/30' : 'border-border-subtle',
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
            settings.enabled ? 'bg-orange/15 text-orange' : 'bg-white/5 text-white/40',
          )}>
            <Zap className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Master switch</p>
            <p className="text-xs text-white/55 mt-0.5">
              {settings.enabled
                ? 'All templates are active. Manual sends work, auto-send fires where configured.'
                : 'Everything is paused. Nothing sends until this is turned back on.'}
            </p>
          </div>
          <button
            onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0',
              settings.enabled ? 'bg-orange' : 'bg-bg-tertiary',
            )}
            aria-label={settings.enabled ? 'Disable follow-ups' : 'Enable follow-ups'}
          >
            <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white transition-transform', settings.enabled ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
      </div>

      {/* Auto-send cadence timeline */}
      {hasCadence && (
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <p className="eyebrow">Auto-send cadence</p>
            <span className="text-xs text-white/40">{autoTemplates.length} active</span>
          </div>
          <div className="relative pb-20">
            <div className="absolute left-4 right-4 top-2 h-px bg-gradient-to-r from-orange/50 via-orange/30 to-transparent" />
            <div className="relative flex items-start justify-between px-4">
              <CadenceDot label="Last active" day={0} muted />
              {autoTemplates
                .slice()
                .sort((a, b) => (a.autoSendAfterDays ?? 0) - (b.autoSendAfterDays ?? 0))
                .map(t => (
                  <CadenceDot key={t.key} label={t.label} day={t.autoSendAfterDays ?? 0} />
                ))}
            </div>
          </div>
          <p className="text-[11px] text-white/40">Days since a client's last meaningful activity in the portal.</p>
        </div>
      )}

      {/* Test email sender */}
      <TestEmailCard templates={settings.templates} />

      {/* Templates */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="eyebrow">Templates</p>
            <p className="text-xs text-white/50">{settings.templates.length} total</p>
          </div>
          <button onClick={addTemplate} className="btn-secondary !py-1.5 !px-3 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add template
          </button>
        </div>

        {settings.templates.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquareText className="h-8 w-8 text-white/30 mx-auto mb-3" />
            <p className="text-sm text-white/50 mb-4">No templates yet.</p>
            <button onClick={addTemplate} className="btn-primary"><Plus className="h-4 w-4" /> Create your first</button>
          </div>
        ) : (
          <div className="space-y-4">
            {settings.templates.map((t, i) => (
              <TemplateCard
                key={t.key || i}
                template={t}
                index={i}
                total={settings.templates.length}
                onChange={patch => updateTemplate(i, patch)}
                onRemove={() => removeTemplate(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <div className={cn(
        'sticky bottom-4 z-10 card flex items-center justify-between transition-all',
        dirty ? 'border-orange/60 shadow-lg' : 'border-border-subtle',
      )}>
        <div className="flex items-center gap-3 text-sm">
          {dirty ? (
            <><AlertCircle className="h-4 w-4 text-orange" /> <span className="text-white/80">Unsaved changes</span></>
          ) : (
            <><Check className="h-4 w-4 text-success" /> <span className="text-white/50">All changes saved</span></>
          )}
        </div>
        <button onClick={onSave} disabled={saving || !dirty} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-white/40">
        <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>Manually send any template from a client detail page. Auto-send runs on a daily schedule and fires when a client has had zero activity for the configured days.</p>
      </div>
    </div>
  );
}

function TestEmailCard({ templates }: { templates: FollowupTemplate[] }) {
  const [to, setTo] = useState('');
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? '');
  const [sending, setSending] = useState(false);

  const t = templates.find(x => x.key === templateKey);

  const send = async () => {
    if (!to.includes('@') || !t) { toast.error('Pick a template and enter a valid email'); return; }
    setSending(true);
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ to, subject: t.subject, body: t.body }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      toast.success(`Test email sent to ${to}`);
    } catch (err) {
      toast.error('Send failed', { description: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <p className="eyebrow mb-3">Send test email</p>
      <p className="text-xs text-white/55 mb-4">Preview any template by sending it to yourself or a teammate. Placeholders render with sample values.</p>
      <div className="grid md:grid-cols-[1fr,1fr,auto] gap-2">
        <input
          type="email"
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder="you@sereniumai.com"
          className="input"
        />
        <select value={templateKey} onChange={e => setTemplateKey(e.target.value)} className="input">
          {templates.length === 0 && <option value="">No templates</option>}
          {templates.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
        <button onClick={send} disabled={sending || !to.trim() || !templateKey} className="btn-primary shrink-0">
          <Mail className="h-4 w-4" /> {sending ? 'Sending…' : 'Send test'}
        </button>
      </div>
    </div>
  );
}

function CadenceDot({ label, day, muted }: { label: string; day: number; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 relative w-[100px]">
      <div className={cn(
        'h-3 w-3 rounded-full z-10',
        muted ? 'bg-white/60' : 'bg-orange shadow-[0_0_12px_rgba(255,107,31,0.6)]',
      )} />
      <div className="pt-2 text-center">
        <p className={cn('text-[10px] font-semibold uppercase tracking-wider tabular-nums', muted ? 'text-white/50' : 'text-orange')}>
          {day === 0 ? 'Day 0' : `Day ${day}`}
        </p>
        <p className="text-[10px] text-white/50 mt-1 leading-tight break-words">{label}</p>
      </div>
    </div>
  );
}

function TemplateCard({ template: t, index, total, onChange, onRemove }: {
  template: FollowupTemplate;
  index: number;
  total: number;
  onChange: (patch: Partial<FollowupTemplate>) => void;
  onRemove: () => void;
}) {
  const [previewing, setPreviewing] = useState<'raw' | 'preview'>('raw');
  return (
    <div className="card !p-0 overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle bg-bg-tertiary/20">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange/15 text-orange font-bold text-xs tabular-nums shrink-0">{index + 1}</span>
        <input
          className="bg-transparent border-none outline-none font-semibold text-base flex-1 min-w-0 focus:text-orange"
          value={t.label}
          onChange={e => onChange({ label: e.target.value })}
          placeholder="Template label (internal)"
        />
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0',
          t.autoSendEnabled
            ? 'bg-orange/10 text-orange border-orange/30'
            : 'bg-white/5 text-white/50 border-border-subtle',
        )}>
          {t.autoSendEnabled ? <><Zap className="h-2.5 w-2.5" /> Auto · day {t.autoSendAfterDays}</> : 'Manual only'}
        </div>
        {total > 1 && (
          <button onClick={onRemove} className="text-white/40 hover:text-error p-1 shrink-0" title="Delete template">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label !mb-0">Subject</label>
            <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-bg-tertiary">
              <button
                onClick={() => setPreviewing('raw')}
                className={cn('px-2 py-0.5 rounded text-[10px] font-medium', previewing === 'raw' ? 'bg-orange/15 text-orange' : 'text-white/50 hover:text-white')}
              >Edit</button>
              <button
                onClick={() => setPreviewing('preview')}
                className={cn('px-2 py-0.5 rounded text-[10px] font-medium', previewing === 'preview' ? 'bg-orange/15 text-orange' : 'text-white/50 hover:text-white')}
              >Preview</button>
            </div>
          </div>
          {previewing === 'raw' ? (
            <input className="input" value={t.subject} onChange={e => onChange({ subject: e.target.value })} placeholder="Just checking in on your onboarding" />
          ) : (
            <div className="input !cursor-default select-all">{interpolate(t.subject) || <span className="text-white/30">No subject yet.</span>}</div>
          )}
        </div>

        <div>
          <label className="label">Body</label>
          {previewing === 'raw' ? (
            <textarea className="input min-h-[140px]" value={t.body} onChange={e => onChange({ body: e.target.value })} placeholder="Hi {{firstName}}, just checking in on {{businessName}}'s onboarding..." />
          ) : (
            <div className="input min-h-[140px] !cursor-default whitespace-pre-wrap select-all">{interpolate(t.body) || <span className="text-white/30">No body yet.</span>}</div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {Object.keys(PLACEHOLDERS).map(p => (
              <button
                key={p}
                onClick={() => navigator.clipboard.writeText(p).then(() => toast.success('Copied ' + p))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-bg-tertiary text-white/60 hover:text-white border border-border-subtle hover:border-border-emphasis transition-colors"
                title="Click to copy"
              >
                <Copy className="h-2.5 w-2.5" /> {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border-subtle">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-orange"
              checked={t.autoSendEnabled}
              onChange={e => onChange({ autoSendEnabled: e.target.checked })}
            />
            <span className="font-medium">Auto-send after</span>
          </label>
          <input
            type="number" min={1} max={90}
            className="input !py-1.5 !w-20 text-sm"
            value={t.autoSendAfterDays ?? 0}
            onChange={e => onChange({ autoSendAfterDays: Number(e.target.value) || 0 })}
            disabled={!t.autoSendEnabled}
          />
          <span className={cn('text-sm', t.autoSendEnabled ? 'text-white/70' : 'text-white/30')}>days of inactivity</span>
        </div>
      </div>
    </div>
  );
}

function interpolate(s: string): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => PLACEHOLDERS[`{{${k}}}`] ?? `{{${k}}}`);
}
