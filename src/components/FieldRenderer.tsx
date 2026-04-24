import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Plus, Trash2, Upload as UploadIcon, X, Check } from 'lucide-react';
import { useAutosave } from '../hooks/useAutosave';
import { db } from '../lib/mockDb';
import type { Field } from '../config/modules';
import { evaluate } from '../lib/condition';
import { Markdown } from './Markdown';
import { cn } from '../lib/cn';

interface Props {
  field: Field;
  organizationId: string;
  fieldKey: string;
  userId?: string;
  onStatusChange?: (s: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export function FieldRenderer({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const prefix = fieldKey.split('.').slice(0, 2).join('.');

  if (field.conditional && !evaluate(field.conditional, organizationId, prefix)) {
    return null;
  }

  if (field.type === 'info') {
    const retell = db.getRetellNumber(organizationId);
    const interpolated = field.content
      ? field.content.replace(/\[forwarding number\]/g, retell ?? '[your Serenium forwarding number]')
      : '';
    return (
      <div className="rounded-lg border border-orange/30 bg-orange/5 p-4 text-sm text-white/80">
        {field.label && <p className="font-semibold text-white mb-2">{field.label}</p>}
        {interpolated && <Markdown>{interpolated}</Markdown>}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return <CheckboxField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
  }

  return (
    <div>
      {field.label && (
        <label className="label" htmlFor={fieldKey}>
          {field.label}
          {field.required && <span className="text-orange ml-1">*</span>}
        </label>
      )}
      <FieldInput field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />
      <FieldValidationMessage field={field} organizationId={organizationId} fieldKey={fieldKey} />
      {field.helpText && <p className="mt-1.5 text-xs text-white/40">{field.helpText}</p>}
    </div>
  );
}

function FieldInput({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { type } = field;
  if (type === 'file' || type === 'file_multiple') {
    return <FileField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} />;
  }
  if (type === 'repeatable') {
    return <RepeatableField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
  }
  if (type === 'multiselect') {
    return <MultiselectField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
  }
  if (type === 'weekly_availability') {
    return <WeeklyAvailabilityField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
  }
  if (type === 'structured') {
    return <StructuredField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
  }
  if (type === 'slider') {
    return <SliderField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
  }
  if (type === 'logo_picker') {
    return <LogoPickerField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
  }
  return <SimpleField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
}

type DaySchedule = { closed?: boolean; open?: string; close?: string; breakStart?: string; breakEnd?: string };
type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type WeekSchedule = Partial<Record<WeekdayKey, DaySchedule>>;
const DAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const DEFAULT_DAYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

function WeeklyAvailabilityField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { value, setValue, status } = useAutosave<WeekSchedule>(organizationId, fieldKey, userId);
  const days = field.weekDays ?? DEFAULT_DAYS;
  const defaults: WeekSchedule = Object.fromEntries(days.map(d => [d, { open: '09:00', close: '17:00' }]));
  const week = value ?? defaults;
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const updateDay = (day: WeekdayKey, patch: Partial<DaySchedule>) => {
    setValue({ ...week, [day]: { ...week[day], ...patch } });
  };

  return (
    <div className="space-y-2">
      {days.map(key => {
        const label = DAY_LABELS[key];
        const d = week[key] ?? {};
        const closed = !!d.closed;
        return (
          <div key={key} className="p-3 rounded-lg border border-border-subtle bg-bg-tertiary/40">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-medium text-white/90 w-24 shrink-0">{label}</span>
              <button
                type="button"
                onClick={() => updateDay(key, { closed: !closed })}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border transition-colors',
                  closed ? 'bg-white/5 text-white/50 border-border-subtle' : 'bg-orange/10 text-orange border-orange/30'
                )}
              >
                {closed ? 'Closed' : 'Open'}
              </button>
            </div>
            {!closed && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="text-xs text-white/60">
                  Open
                  <input type="time" value={d.open ?? ''} onChange={e => updateDay(key, { open: e.target.value })} className="input mt-1" />
                </label>
                <label className="text-xs text-white/60">
                  Close
                  <input type="time" value={d.close ?? ''} onChange={e => updateDay(key, { close: e.target.value })} className="input mt-1" />
                </label>
                <label className="text-xs text-white/60">
                  Break start <span className="text-white/30">(optional)</span>
                  <input type="time" value={d.breakStart ?? ''} onChange={e => updateDay(key, { breakStart: e.target.value })} className="input mt-1" />
                </label>
                <label className="text-xs text-white/60">
                  Break end <span className="text-white/30">(optional)</span>
                  <input type="time" value={d.breakEnd ?? ''} onChange={e => updateDay(key, { breakEnd: e.target.value })} className="input mt-1" />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SimpleField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { value, setValue, status } = useAutosave<string>(organizationId, fieldKey, userId);
  const v = value ?? '';

  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const common = {
    id: fieldKey,
    value: v,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValue(e.target.value),
    className: 'input',
    placeholder: field.placeholder,
  };

  if (field.type === 'textarea') {
    return <textarea {...common} rows={4} />;
  }
  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">Select…</option>
        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-3">
        <input type="color" value={v || '#FF6B1F'} onChange={e => setValue(e.target.value)} className="h-12 w-12 rounded-lg bg-bg-tertiary border border-border-subtle cursor-pointer" />
        <input {...common} type="text" placeholder="#FF6B1F" className="input flex-1" />
      </div>
    );
  }
  return <input {...common} type={field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : field.type} />;
}

function CheckboxField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { value, setValue, status } = useAutosave<boolean>(organizationId, fieldKey, userId);
  const checked = value === true;
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);
  const toggle = () => setValue(!checked);

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none',
        checked ? 'bg-orange/5 border-orange/30' : 'border-border-subtle hover:border-border-emphasis',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
      )}
    >
      <div className={cn(
        'mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all',
        checked ? 'bg-orange border-orange' : 'border-white/30 group-hover:border-white/50'
      )} aria-hidden>
        {checked && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </motion.span>
        )}
      </div>
      <span className={cn('text-sm leading-relaxed', checked ? 'text-white/90' : 'text-white/80')}>
        {field.label}
        {field.required && <span className="text-orange ml-1">*</span>}
      </span>
    </div>
  );
}

function MultiselectField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { value, setValue, status } = useAutosave<string[]>(organizationId, fieldKey, userId);
  const selected = value ?? [];
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const toggle = (opt: string) => {
    setValue(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {field.options?.map(opt => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              on ? 'bg-orange text-white border-orange' : 'bg-bg-tertiary text-white/70 border-border-subtle hover:border-border-emphasis'
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RepeatableField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { value, setValue, status } = useAutosave<string[]>(organizationId, fieldKey, userId);
  const items = value ?? [''];
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    setValue(next);
  };
  const add = () => setValue([...items, '']);
  const remove = (i: number) => setValue(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            onChange={e => update(i, e.target.value)}
            placeholder={field.placeholder || 'Add an item…'}
            className="input flex-1"
          />
          {items.length > 1 && (
            <button type="button" onClick={() => remove(i)} className="px-3 rounded-lg border border-border-subtle text-white/50 hover:text-error hover:border-error/40">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm text-orange hover:text-orange-hover font-medium">
        <Plus className="h-4 w-4" /> Add another
      </button>
    </div>
  );
}

function FileField({ field, organizationId, fieldKey, userId }: Props) {
  const category = fieldKey;
  const [, bump] = useState(0);
  const existing = db.listUploads(organizationId, category);

  const onDrop = async (files: File[]) => {
    for (const f of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });
      db.addUpload({
        organizationId, category,
        fileName: f.name, fileUrl: dataUrl, fileSize: f.size, mimeType: f.type,
        uploadedBy: userId,
      });
    }
    bump(n => n + 1);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: field.type === 'file_multiple',
    accept: field.accept ? { [field.accept]: [] } : undefined,
  });

  const remove = (id: string) => { db.removeUpload(id); bump(n => n + 1); };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis bg-bg-tertiary/50'
        )}
      >
        <input {...getInputProps()} />
        <UploadIcon className="h-6 w-6 text-white/40 mx-auto mb-2" />
        <p className="text-sm text-white/70">
          {isDragActive ? 'Drop to upload…' : <>Drag and drop, or <span className="text-orange">browse</span></>}
        </p>
        <p className="text-xs text-white/40 mt-1">{field.accept || 'any file'}</p>
      </div>

      {existing.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {existing.map(u => (
            <div key={u.id} className="relative group rounded-lg border border-border-subtle bg-bg-tertiary overflow-hidden">
              {u.mimeType.startsWith('image/') ? (
                <img src={u.fileUrl} alt={u.fileName} className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video w-full flex items-center justify-center text-xs text-white/50 px-2 text-center">{u.fileName}</div>
              )}
              <div className="px-2 py-1.5 text-[11px] text-white/60 truncate">{u.fileName}</div>
              <button onClick={() => remove(u.id)} className="absolute top-1 right-1 h-6 w-6 rounded-md bg-bg/80 text-white/70 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3 mx-auto" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StructuredField, groups sub-fields (e.g. business_address = street/city/postal)
// into one field key. Stores as a nested object keyed by sub-field key.
// ─────────────────────────────────────────────────────────────────────────────
function StructuredField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { value, setValue, status } = useAutosave<Record<string, string>>(organizationId, fieldKey, userId);
  const data = value ?? {};
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const update = (subKey: string, subValue: string) => {
    setValue({ ...data, [subKey]: subValue });
  };

  const schema = field.schema ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border border-border-subtle bg-bg-tertiary/30">
      {schema.map(sub => {
        const subId = `${fieldKey}.${sub.key}`;
        const subVal = data[sub.key] ?? '';
        return (
          <div key={sub.key}>
            <label className="text-xs text-white/60 block mb-1" htmlFor={subId}>
              {sub.label}{sub.required && <span className="text-orange ml-1">*</span>}
            </label>
            {sub.type === 'select' ? (
              <select id={subId} value={subVal} onChange={e => update(sub.key, e.target.value)} className="input">
                <option value="">Select…</option>
                {sub.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input
                id={subId}
                type={sub.type === 'email' ? 'email' : sub.type === 'phone' ? 'tel' : sub.type === 'url' ? 'url' : 'text'}
                value={subVal}
                onChange={e => update(sub.key, e.target.value)}
                placeholder={sub.placeholder}
                className="input"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SliderField, draggable numeric range with snap-to-step. Stores as number.
// ─────────────────────────────────────────────────────────────────────────────
function SliderField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const cfg = field.slider ?? { min: 0, max: 100, step: 1, default: 0 };
  const { value, setValue, status } = useAutosave<number>(organizationId, fieldKey, userId);
  const current = typeof value === 'number' ? value : cfg.default;
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  // If nothing is persisted yet, write the default so the visible state matches storage.
  // Without this, required-field completion silently fails: UI shows "10s" but submission
  // value is still undefined.
  useEffect(() => {
    if (typeof value !== 'number') setValue(cfg.default);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">{cfg.min}{cfg.suffix ?? ''}</span>
        <span className="font-display font-bold text-xl tabular-nums">{current}<span className="text-sm text-white/50 font-normal">{cfg.suffix ?? ''}</span></span>
        <span className="text-xs text-white/50">{cfg.max}{cfg.suffix ?? ''}</span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={current}
        onChange={e => setValue(Number(e.target.value))}
        className="w-full h-2 appearance-none bg-bg-tertiary rounded-full cursor-pointer accent-orange"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LogoPickerField, 3-tab picker: reuse Business Profile / upload / external URL
// ─────────────────────────────────────────────────────────────────────────────
type LogoPickerValue = { mode: 'reuse' | 'upload' | 'url'; url?: string };

function LogoPickerField({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  const { value, setValue, status } = useAutosave<LogoPickerValue>(organizationId, fieldKey, userId);
  const current = value ?? { mode: 'reuse' };
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const reuseKey = field.logoReuseFieldKey ?? 'business_profile.logo_files.logo_files';
  const reuseUploads = db.listUploads(organizationId, reuseKey);
  const uploads = db.listUploads(organizationId, fieldKey);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'application/pdf': [], 'application/postscript': [] },
    onDrop: async (files) => {
      for (const f of files) {
        const dataUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(f);
        });
        db.addUpload({
          organizationId, category: fieldKey,
          fileName: f.name, fileUrl: dataUrl, fileSize: f.size, mimeType: f.type,
          uploadedBy: userId,
        });
      }
      setValue({ mode: 'upload' });
    },
  });

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-tertiary/30 overflow-hidden">
      <div className="flex border-b border-border-subtle text-sm">
        {(['reuse', 'upload', 'url'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setValue({ ...current, mode: m })}
            className={cn(
              'flex-1 px-3 py-2.5 font-medium transition-colors',
              current.mode === m ? 'bg-orange/10 text-orange border-b-2 border-orange -mb-px' : 'text-white/60 hover:text-white',
            )}
          >
            {m === 'reuse' ? 'Use from Business Profile' : m === 'upload' ? 'Upload new' : 'Drive / Dropbox link'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {current.mode === 'reuse' && (
          reuseUploads.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {reuseUploads.map(u => (
                <div key={u.id} className="h-20 w-20 rounded-lg border border-border-subtle bg-bg overflow-hidden flex items-center justify-center">
                  {u.mimeType.startsWith('image/')
                    ? <img src={u.fileUrl} alt={u.fileName} className="max-h-full max-w-full object-contain" />
                    : <span className="text-[10px] text-white/50 p-1 text-center break-words">{u.fileName}</span>}
                </div>
              ))}
              <p className="text-xs text-white/50 w-full mt-1">We'll reuse these from your Business Profile.</p>
            </div>
          ) : (
            <p className="text-sm text-white/50">No logos uploaded yet in Business Profile. Upload in Business Profile → Logo files, or use one of the other options here.</p>
          )
        )}

        {current.mode === 'upload' && (
          <div>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis',
              )}
            >
              <input {...getInputProps()} />
              <UploadIcon className="h-6 w-6 text-white/40 mx-auto mb-2" />
              <p className="text-sm text-white/70">
                {isDragActive ? 'Drop to upload…' : 'Drop a logo here, or click to browse'}
              </p>
              <p className="text-[10px] text-white/40 mt-1">PNG, SVG, PDF, AI, EPS, vector preferred</p>
            </div>
            {uploads.length > 0 && (
              <div className="mt-3 space-y-1">
                {uploads.map(u => (
                  <div key={u.id} className="flex items-center justify-between text-xs text-white/70 bg-bg/60 rounded px-2 py-1.5">
                    <span className="truncate">{u.fileName}</span>
                    <button type="button" onClick={() => db.removeUpload(u.id)} className="text-white/40 hover:text-error ml-2">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {current.mode === 'url' && (
          <input
            type="url"
            value={current.url ?? ''}
            onChange={e => setValue({ mode: 'url', url: e.target.value })}
            placeholder="https://drive.google.com/... or https://www.dropbox.com/..."
            className="input"
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldValidationMessage, runs field.validate on current value, shows error.
// ─────────────────────────────────────────────────────────────────────────────
function FieldValidationMessage({ field, organizationId, fieldKey }: { field: Field; organizationId: string; fieldKey: string }) {
  if (!field.validate) return null;
  const submission = db.getSubmission(organizationId, fieldKey);
  const value = submission?.value;
  if (value == null || value === '') return null;
  const err = field.validate(value);
  if (!err) return null;
  return <p className="mt-1.5 text-xs text-error">{err}</p>;
}
