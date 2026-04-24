import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Save, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { LoadingState } from '../../components/LoadingState';
import { getWelcomeVideo, setWelcomeVideoUrl, clearWelcomeVideo } from '../../lib/db/welcomeVideo';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { useModal } from '../../hooks/useModal';

const QK = ['welcome_video'] as const;

export function WelcomeVideoManager() {
  const qc = useQueryClient();
  const { data: video, isLoading } = useQuery({ queryKey: QK, queryFn: getWelcomeVideo });

  const [url, setUrl] = useState('');
  useEffect(() => { if (video?.videoUrl) setUrl(video.videoUrl); }, [video?.videoUrl]);

  const save = useMutation({
    mutationFn: (next: string) => setWelcomeVideoUrl(next),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); toast.success('Welcome video saved'); },
    onError: (err: Error) => toast.error('Save failed', { description: err.message }),
  });
  const clear = useMutation({
    mutationFn: clearWelcomeVideo,
    onSuccess: () => { setUrl(''); qc.invalidateQueries({ queryKey: QK }); toast.success('Welcome video removed'); },
  });

  const trimmed = url.trim();
  const embed = trimmed ? videoEmbedUrl(trimmed) : null;
  const dirty = trimmed !== (video?.videoUrl ?? '');
  const canSave = dirty && trimmed.length > 0;

  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="mb-8">
            <p className="eyebrow mb-2">Content</p>
            <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">Welcome video</h1>
            <p className="text-white/60 text-sm max-w-xl">
              Paste a Vimeo, Loom, or YouTube link. The video plays in a modal the first time a client logs in. Clients can dismiss and never see it again.
            </p>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : (
            <div className="card space-y-4">
              <div>
                <label className="label" htmlFor="welcome-video-url">Video URL</label>
                <input
                  id="welcome-video-url"
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
                      title="Welcome video preview"
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
            </div>
          )}

          {previewOpen && embed && (
            <ClientPreviewModal embed={embed} onClose={() => setPreviewOpen(false)} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ClientPreviewModal({ embed, onClose }: { embed: string; onClose: () => void }) {
  const ref = useModal(true, onClose);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome video preview"
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
            title="Welcome"
            allow="fullscreen; clipboard-write; autoplay"
            allowFullScreen
          />
        </div>
        <p className="text-center text-xs text-white/55 mt-3">
          This is how clients see it on first login. In the real view, there's a "You'll only see this once" line beneath.
        </p>
      </div>
    </div>
  );
}
