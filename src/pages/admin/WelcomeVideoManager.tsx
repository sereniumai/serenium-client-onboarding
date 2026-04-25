import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Save, Trash2, Eye, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { LoadingState } from '../../components/LoadingState';
import {
  getWelcomeVideo, setWelcomeVideoUrl, clearWelcomeVideo, resetAllWelcomeSeen,
  getReportsVideo, setReportsVideoUrl, clearReportsVideo,
} from '../../lib/db/welcomeVideo';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { useModal } from '../../hooks/useModal';

const WELCOME_QK = ['welcome_video'] as const;
const REPORTS_QK = ['reports_video'] as const;

export function WelcomeVideoManager() {
  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="mb-8">
            <p className="eyebrow mb-2">Content</p>
            <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">Client videos</h1>
            <p className="text-white/60 text-sm max-w-xl">
              Two videos clients see in the portal. Both auto-play once on the right page, are dismissable, and can be re-watched from the sidebar at any time.
            </p>
          </div>

          <VideoSlot
            kind="welcome"
            title="Welcome video"
            description="Plays the first time a client logs into onboarding."
            queryKey={WELCOME_QK}
            getter={getWelcomeVideo}
            setter={setWelcomeVideoUrl}
            clearer={clearWelcomeVideo}
          />

          <div className="mt-6">
            <VideoSlot
              kind="reports"
              title="Reports walkthrough"
              description="Plays the first time a live client lands on their reports dashboard."
              queryKey={REPORTS_QK}
              getter={getReportsVideo}
              setter={setReportsVideoUrl}
              clearer={clearReportsVideo}
            />
          </div>

          <ResetWelcomeSeen />
        </div>
      </div>
    </AppShell>
  );
}

function VideoSlot({ kind, title, description, queryKey, getter, setter, clearer }: {
  kind: 'welcome' | 'reports';
  title: string;
  description: string;
  queryKey: readonly string[];
  getter: () => Promise<{ videoUrl: string | null; updatedAt: string } | null>;
  setter: (url: string) => Promise<{ videoUrl: string | null; updatedAt: string }>;
  clearer: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const { data: video, isLoading } = useQuery({ queryKey, queryFn: getter });

  const [url, setUrl] = useState('');
  useEffect(() => { if (video?.videoUrl) setUrl(video.videoUrl); }, [video?.videoUrl]);

  const save = useMutation({
    mutationFn: (next: string) => setter(next),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success(`${title} saved`); },
    onError: (err: Error) => toast.error('Save failed', { description: err.message }),
  });
  const clear = useMutation({
    mutationFn: clearer,
    onSuccess: () => { setUrl(''); qc.invalidateQueries({ queryKey }); toast.success(`${title} removed`); },
  });

  const trimmed = url.trim();
  const embed = trimmed ? videoEmbedUrl(trimmed) : null;
  const dirty = trimmed !== (video?.videoUrl ?? '');
  const canSave = dirty && trimmed.length > 0;

  const [previewOpen, setPreviewOpen] = useState(false);

  if (isLoading) return <div className="card"><LoadingState variant="inline" /></div>;

  return (
    <div className="card space-y-4">
      <div>
        <p className="eyebrow mb-1">{title}</p>
        <p className="text-sm text-white/55 mb-3">{description}</p>
        <label className="label" htmlFor={`${kind}-video-url`}>Video URL</label>
        <input
          id={`${kind}-video-url`}
          type="url"
          className="input"
          placeholder="https://vimeo.com/…  ·  https://loom.com/share/…  ·  https://youtu.be/…"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <p className="text-xs text-white/55 mt-1.5">Make sure the link is publicly viewable (no login required).</p>
      </div>

      {trimmed && !embed && (
        <p className="text-xs text-error">This doesn't look like a Vimeo, Loom, or YouTube URL. Double-check and try again.</p>
      )}

      {embed && (
        <div>
          <p className="eyebrow mb-2">Preview</p>
          <div className="aspect-video rounded-lg overflow-hidden border border-border-subtle bg-black">
            <iframe
              src={embed}
              className="w-full h-full"
              title={`${title} preview`}
              allow="fullscreen; clipboard-write; autoplay"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
        <div className="text-xs text-white/50">
          {video?.videoUrl ? (
            <span className="inline-flex items-center gap-1.5"><Film className="h-3.5 w-3.5" /> Live</span>
          ) : (
            <span>Not set</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {embed && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
            >
              <Eye className="h-4 w-4" /> Preview as client
            </button>
          )}
          {video?.videoUrl && (
            <button onClick={() => clear.mutate()} disabled={clear.isPending} className="inline-flex items-center gap-2 text-sm text-error hover:underline disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> {clear.isPending ? 'Removing…' : 'Remove'}
            </button>
          )}
          <button
            onClick={() => save.mutate(trimmed)}
            disabled={!canSave || save.isPending}
            className="btn-primary"
          >
            <Save className="h-4 w-4" /> {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {previewOpen && embed && (
        <ClientPreviewModal embed={embed} title={title} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}

function ResetWelcomeSeen() {
  const [open, setOpen] = useState(false);
  const reset = useMutation({
    mutationFn: resetAllWelcomeSeen,
    onSuccess: (n) => {
      setOpen(false);
      toast.success(n === 0 ? 'No clients had seen it yet' : `Reset for ${n} user${n === 1 ? '' : 's'}`);
    },
    onError: (err: Error) => { setOpen(false); toast.error('Reset failed', { description: err.message }); },
  });
  return (
    <div className="card mt-6">
      <p className="eyebrow mb-2">Testing</p>
      <p className="text-sm text-white/60 mb-4">
        Wipe the "already seen" flag for the welcome video so every client sees it again on next login. Use while iterating on the copy.
      </p>
      <button
        onClick={() => setOpen(true)}
        disabled={reset.isPending}
        className="btn-secondary"
      >
        <RefreshCw className={reset.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        {reset.isPending ? 'Resetting…' : 'Reset welcome-seen for all clients'}
      </button>
      <ConfirmDialog
        open={open}
        title="Reset welcome video for all clients?"
        body="Every client logs in and sees the welcome modal again on their next page load. Safe to run anytime."
        confirmLabel="Yes, reset everyone"
        cancelLabel="Cancel"
        onConfirm={() => reset.mutate()}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

function ClientPreviewModal({ embed, title, onClose }: { embed: string; title: string; onClose: () => void }) {
  const ref = useModal(true, onClose);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} preview`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div ref={ref} className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white inline-flex items-center gap-1.5 text-sm"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" /> Close
        </button>
        <div className="rounded-2xl overflow-hidden border border-border-subtle bg-black shadow-2xl">
          <iframe
            src={embed}
            className="w-full aspect-video"
            title={title}
            allow="fullscreen; clipboard-write; autoplay"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
