import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, Trash2, FileText, Image as ImageIcon, Film, Upload as UploadIcon, Video, ChevronDown, X, Save, Sparkles } from 'lucide-react';
import { db } from '../../lib/mockDb';
import { useDbVersion } from '../../hooks/useDb';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { toast } from 'sonner';
import type { MonthlyReport, ReportFile } from '../../types';
import { cn } from '../../lib/cn';
import { EmptyState } from '../../components/EmptyState';
import { format, parse } from 'date-fns';

interface Props {
  orgId: string;
}

export function ReportsAdmin({ orgId }: Props) {
  useDbVersion();
  const reports = db.listReportsForOrg(orgId);
  const [creating, setCreating] = useState(false);

  const nextPeriod = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  if (creating) {
    return <ReportEditor orgId={orgId} initial={{ period: nextPeriod, title: '' }} onDone={() => setCreating(false)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-white/60">{reports.length} {reports.length === 1 ? 'report' : 'reports'} published · newest first</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New report
        </button>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No reports yet"
          description="Publish the first monthly report for this client. They'll see it in their portal with your walkthrough video, highlights, and any documents you attach."
        />
      ) : (
        <div className="space-y-3">
          {reports.map(r => <ReportListItem key={r.id} orgId={orgId} report={r} />)}
        </div>
      )}
    </div>
  );
}

function ReportListItem({ orgId, report }: { orgId: string; report: MonthlyReport }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-bg-tertiary/40 transition-colors text-left"
      >
        <div className="h-10 w-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center font-display font-bold text-xs tabular-nums shrink-0">
          {report.period.slice(-2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold">{safeFormatPeriod(report.period)}</p>
          <p className="font-semibold truncate">{report.title || 'Untitled report'}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50 shrink-0">
          {report.loomUrl && <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> Loom</span>}
          {report.files.length > 0 && <span>{report.files.length} files</span>}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      {open && (
        <div className="border-t border-border-subtle">
          <ReportEditor orgId={orgId} initial={report} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

interface EditorInitial {
  id?: string;
  period: string;
  title: string;
  summary?: string;
  loomUrl?: string;
  highlights?: string[];
  files?: ReportFile[];
}

function ReportEditor({ orgId, initial, onDone }: { orgId: string; initial: EditorInitial; onDone: () => void }) {
  const [period, setPeriod] = useState(initial.period);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary ?? '');
  const [loomUrl, setLoomUrl] = useState(initial.loomUrl ?? '');
  const [highlights, setHighlights] = useState<string[]>(initial.highlights ?? ['']);
  const [files, setFiles] = useState<ReportFile[]>(initial.files ?? []);
  const [saving, setSaving] = useState(false);

  const embed = loomUrl ? videoEmbedUrl(loomUrl) : null;
  const loomInvalid = loomUrl.trim() && !embed;

  const onDrop = async (dropped: File[]) => {
    for (const f of dropped) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });
      setFiles(prev => [...prev, {
        id: crypto.randomUUID(),
        fileName: f.name, fileUrl: dataUrl, fileSize: f.size, mimeType: f.type,
      }]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const save = () => {
    setSaving(true);
    const trimmedHighlights = highlights.map(h => h.trim()).filter(Boolean);
    const payload = {
      period: period.trim(),
      title: title.trim() || `Report, ${safeFormatPeriod(period)}`,
      summary: summary.trim() || undefined,
      loomUrl: loomUrl.trim() || undefined,
      highlights: trimmedHighlights.length ? trimmedHighlights : undefined,
      files,
    };
    if (initial.id) {
      db.updateReport(initial.id, payload);
      toast.success('Report updated', { description: payload.title });
    } else {
      db.createReport({ organizationId: orgId, ...payload });
      toast.success('Report published', { description: `${safeFormatPeriod(payload.period)} · ${payload.title}` });
    }
    setSaving(false);
    onDone();
  };

  const remove = () => {
    if (!initial.id) return;
    if (!confirm('Delete this report? This cannot be undone.')) return;
    db.deleteReport(initial.id);
    toast.success('Report deleted');
    onDone();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="period">Month</label>
          <input id="period" type="month" value={period} onChange={e => setPeriod(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" value={title} onChange={e => setTitle(e.target.value)} className="input"
                 placeholder="e.g. Scaling past 80 qualified leads" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="loom">Walkthrough video (Loom or YouTube)</label>
        <input id="loom" value={loomUrl} onChange={e => setLoomUrl(e.target.value)} className={cn('input', loomInvalid && 'border-error')}
               placeholder="https://www.loom.com/share/... or https://youtube.com/watch?v=..." />
        {loomInvalid && <p className="mt-1.5 text-xs text-error">Not a recognised Loom or YouTube URL.</p>}
        {embed && (
          <div className="mt-3 aspect-video rounded-lg border border-border-subtle overflow-hidden bg-black">
            <iframe src={embed} allow="fullscreen" className="w-full h-full" title="Loom preview" />
          </div>
        )}
      </div>

      <div>
        <label className="label">Highlights</label>
        <p className="text-xs text-white/40 mb-2">Short wins or stats, shown as pills at the top of the report.</p>
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={h}
                onChange={e => setHighlights(arr => arr.map((x, j) => j === i ? e.target.value : x))}
                className="input flex-1"
                placeholder="e.g. 47 qualified leads · $32 CPL · 3.8x ROAS"
              />
              {highlights.length > 1 && (
                <button onClick={() => setHighlights(arr => arr.filter((_, j) => j !== i))}
                        className="px-3 rounded-lg border border-border-subtle text-white/50 hover:text-error hover:border-error/40">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setHighlights(h => [...h, ''])}
                  className="inline-flex items-center gap-1.5 text-sm text-orange hover:text-orange-hover font-medium">
            <Plus className="h-4 w-4" /> Add highlight
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="summary">Summary</label>
        <textarea id="summary" rows={5} value={summary} onChange={e => setSummary(e.target.value)} className="input"
                  placeholder="What happened this month? What's next?" />
      </div>

      <div>
        <label className="label">Documents</label>
        <div {...getRootProps()} className={cn(
          'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors mb-3',
          isDragActive ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis bg-bg-tertiary/50'
        )}>
          <input {...getInputProps()} />
          <UploadIcon className="h-5 w-5 text-white/40 mx-auto mb-1.5" />
          <p className="text-sm text-white/70">{isDragActive ? 'Drop to upload…' : 'Drop PDFs, screenshots, or any docs'}</p>
        </div>
        {files.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {files.map(f => {
              const Icon = f.mimeType.startsWith('image/') ? ImageIcon : f.mimeType.startsWith('video/') ? Film : FileText;
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-bg-tertiary">
                  <Icon className="h-5 w-5 text-orange shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.fileName}</p>
                    <p className="text-xs text-white/40">{formatBytes(f.fileSize)}</p>
                  </div>
                  <button onClick={() => setFiles(arr => arr.filter(x => x.id !== f.id))}
                          className="text-white/40 hover:text-error">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-border-subtle">
        <div>
          {initial.id && (
            <button onClick={remove} className="text-sm text-white/50 hover:text-error inline-flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Delete report
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onDone} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving || !period} className="btn-primary">
            <Save className="h-4 w-4" /> {initial.id ? 'Save changes' : 'Publish report'}
          </button>
        </div>
      </div>
    </div>
  );
}

function safeFormatPeriod(period: string): string {
  try { return format(parse(period, 'yyyy-MM', new Date()), 'MMMM yyyy'); }
  catch { return period; }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
