import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Film, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import {
  getWelcomeVideo, uploadWelcomeVideo, clearWelcomeVideo, getWelcomeVideoSignedUrl,
} from '../../lib/db/welcomeVideo';
import { cn } from '../../lib/cn';

const QK = ['welcome_video'] as const;

export function WelcomeVideoManager() {
  const qc = useQueryClient();
  const { data: video, isLoading } = useQuery({ queryKey: QK, queryFn: getWelcomeVideo });
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (video?.storagePath) {
      getWelcomeVideoSignedUrl(video.storagePath).then(setSignedUrl).catch(() => setSignedUrl(null));
    } else {
      setSignedUrl(null);
    }
  }, [video?.storagePath]);

  const upload = useMutation({
    mutationFn: (file: File) => uploadWelcomeVideo(file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); toast.success('Welcome video saved'); },
    onError: (err: Error) => toast.error('Upload failed', { description: err.message }),
  });
  const clear = useMutation({
    mutationFn: clearWelcomeVideo,
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); toast.success('Welcome video removed'); },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 1,
    onDrop: files => { if (files[0]) upload.mutate(files[0]); },
  });

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="mb-8">
            <p className="eyebrow mb-2">Content</p>
            <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">Welcome video</h1>
            <p className="text-white/60 text-sm max-w-xl">Upload a short video played in a modal the first time a client logs in. They can dismiss it and never see it again.</p>
          </div>

          {isLoading ? (
            <div className="card text-center py-12 text-white/50"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading…</div>
          ) : video?.storagePath ? (
            <div className="card space-y-4">
              <p className="eyebrow">Current</p>
              {signedUrl ? (
                <video src={signedUrl} controls className="w-full rounded-lg border border-border-subtle bg-black" />
              ) : (
                <div className="aspect-video rounded-lg border border-border-subtle bg-bg-tertiary flex items-center justify-center text-white/40">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Preparing preview…
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-white/50">
                  <p className="truncate"><Film className="h-3.5 w-3.5 inline-block mr-1.5" />{video.fileName}</p>
                </div>
                <button onClick={() => clear.mutate()} disabled={clear.isPending} className="inline-flex items-center gap-2 text-sm text-error hover:underline disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> {clear.isPending ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                'card border-2 border-dashed cursor-pointer text-center py-14 transition-colors',
                isDragActive ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis',
                upload.isPending && 'opacity-60 cursor-wait',
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-orange mx-auto mb-3" />
              <p className="font-semibold mb-1">{upload.isPending ? 'Uploading…' : 'Drop a video here'}</p>
              <p className="text-xs text-white/50">MP4, MOV, WebM · max ~50 MB</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
