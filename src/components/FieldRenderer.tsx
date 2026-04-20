import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, Trash2, Upload as UploadIcon, X } from 'lucide-react';
import { useAutosave } from '../hooks/useAutosave';
import { db } from '../lib/mockDb';
import type { Field } from '../config/modules';
import { cn } from '../lib/cn';

interface Props {
  field: Field;
  organizationId: string;
  fieldKey: string;
  userId?: string;
  onStatusChange?: (s: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export function FieldRenderer({ field, organizationId, fieldKey, userId, onStatusChange }: Props) {
  return (
    <div>
      <label className="label" htmlFor={fieldKey}>
        {field.label}
        {field.required && <span className="text-orange ml-1">*</span>}
      </label>
      <FieldInput field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />
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
  return <SimpleField field={field} organizationId={organizationId} fieldKey={fieldKey} userId={userId} onStatusChange={onStatusChange} />;
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
