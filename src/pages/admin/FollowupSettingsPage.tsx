import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, Loader2, Mail } from 'lucide-react';
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

  useEffect(() => { if (loaded) setSettings(loaded); }, [loaded]);

  const save = useMutation({
    mutationFn: (s: FollowupSettings) => saveFollowupSettings(s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); toast.success('Follow-up settings saved'); },
    onError: (err: Error) => toast.error('Save failed', { description: err.message }),
  });

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <p className="eyebrow mb-2">Communication</p>
          <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">Follow-up emails</h1>
          <p className="text-white/60 text-sm max-w-2xl mb-8">Chase emails you can send clients who've gone quiet. Use <code className="px-1 py-0.5 rounded bg-bg-tertiary text-xs">{'{{firstName}}'}</code>, <code className="px-1 py-0.5 rounded bg-bg-tertiary text-xs">{'{{businessName}}'}</code>, or <code className="px-1 py-0.5 rounded bg-bg-tertiary text-xs">{'{{portalUrl}}'}</code> in subject + body.</p>

          {(isLoading || !settings) ? (
            <div className="text-white/50 text-sm"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading…</div>
          ) : (
            <Editor
              settings={settings}
              onChange={setSettings}
              onSave={() => save.mutate(settings)}
              saving={save.isPending}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Editor({ settings, onChange, onSave, saving }: {
  settings: FollowupSettings;
  onChange: (s: FollowupSettings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const addTemplate = () => {
    onChange({
      ...settings,
      templates: [...settings.templates, {
        key: `template_${Date.now()}`,
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

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <p className="eyebrow">Master switch</p>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-orange" checked={settings.enabled} onChange={e => onChange({ ...settings, enabled: e.target.checked })} />
          <span>Follow-up emails are {settings.enabled ? 'enabled' : 'disabled'}. Toggle off to instantly pause every template + auto-send.</span>
        </label>
      </div>

      {settings.templates.map((t, i) => (
        <div key={i} className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <input
              className="input !py-2 font-semibold text-base"
              value={t.label}
              onChange={e => updateTemplate(i, { label: e.target.value })}
              placeholder="Template label (internal)"
            />
            <button onClick={() => removeTemplate(i)} className="text-error/60 hover:text-error p-2"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" value={t.subject} onChange={e => updateTemplate(i, { subject: e.target.value })} placeholder="Just checking in on your onboarding" />
          </div>
          <div>
            <label className="label">Body</label>
            <textarea className="input min-h-[140px]" value={t.body} onChange={e => updateTemplate(i, { body: e.target.value })} placeholder="Hi {{firstName}}, just checking in on {{businessName}}'s onboarding..." />
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border-subtle">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-orange" checked={t.autoSendEnabled} onChange={e => updateTemplate(i, { autoSendEnabled: e.target.checked })} />
              Auto-send after
            </label>
            <input
              type="number" min={1} max={90}
              className="input !py-1.5 !w-20 text-sm"
              value={t.autoSendAfterDays ?? 0}
              onChange={e => updateTemplate(i, { autoSendAfterDays: Number(e.target.value) || 0 })}
              disabled={!t.autoSendEnabled}
            />
            <span className={cn('text-sm', t.autoSendEnabled ? 'text-white/70' : 'text-white/30')}>days of inactivity</span>
          </div>
        </div>
      ))}

      <button onClick={addTemplate} className="btn-secondary">
        <Plus className="h-4 w-4" /> Add template
      </button>

      <div className="flex justify-end pt-6 border-t border-border-subtle">
        <button onClick={onSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <div className="mt-4 text-xs text-white/40 inline-flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5" /> Templates are ready to send manually from any client's detail page. Auto-send fires when a client has had zero activity for the configured days.
      </div>
    </div>
  );
}
