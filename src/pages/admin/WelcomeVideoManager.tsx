import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ChevronLeft, Upload as UploadIcon, X, Play, RotateCcw, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { db } from '../../lib/mockDb';
import { useDbVersion } from '../../hooks/useDb';
import { cn } from '../../lib/cn';
import { toast } from 'sonner';

export function WelcomeVideoManager() {
  useDbVersion();
  const current = db.getWelcomeVideo();
  const [uploading, setUploading] = useState(false);

  const onDrop = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setUploading(true);
    const dataUrl = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(f);
    });
    db.setWelcomeVideo({ fileName: f.name, fileUrl: dataUrl, mimeType: f.type });
    toast.success('Welcome video uploaded', { description: f.name });
    setUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false, accept: { 'video/*': [] },
  });

  const remove = () => db.setWelcomeVideo(null);
  const resetAllViews = () => {
    // Reset seen-state so every existing user sees the video again on next login
    localStorage.setItem('serenium.welcome.force-reset', String(Date.now()));
    alert('All existing clients will see the welcome video on their next dashboard visit.');
    // In mock: clear welcomedUsers
    const raw = localStorage.getItem('serenium.mockdb.v4');
    if (raw) {
      const d = JSON.parse(raw);
      d.welcomedUsers = [];
      localStorage.setItem('serenium.mockdb.v4', JSON.stringify(d));
      window.location.reload();
    }
  };

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-24">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Back to admin
          </Link>

          <p className="eyebrow mb-3">Library</p>
          <h1 className="font-display font-black text-[clamp(1.75rem,6vw,3rem)] leading-[1.05] tracking-[-0.03em] mb-3">Welcome video</h1>
          <p className="text-white/60 mb-8 md:mb-10 text-sm md:text-base">One video, played to every new client the first time they land on their dashboard. Upload an MP4 or MOV, we'll host it locally (Supabase Storage once wired up).</p>

          {current ? (
            <div className="card">
              <div className="flex items-center gap-3 mb-5">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="font-semibold">Current welcome video</p>
              </div>
              <div className="aspect-video rounded-lg overflow-hidden bg-black mb-4">
                <video src={current.fileUrl} controls className="w-full h-full" />
              </div>
              <div className="flex items-center justify-between text-sm text-white/60">
                <p className="truncate"><Play className="h-3.5 w-3.5 inline mr-1.5" />{current.fileName}</p>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button onClick={resetAllViews} className="text-white/60 hover:text-white inline-flex items-center gap-1 text-xs">
                    <RotateCcw className="h-3.5 w-3.5" /> Replay for all clients
                  </button>
                  <button onClick={remove} className="text-white/60 hover:text-error inline-flex items-center gap-1 text-xs">
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-border-subtle">
                <p className="text-xs text-white/40 mb-2">Replace with a new upload:</p>
                <div {...getRootProps()} className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis bg-bg-tertiary/50'
                )}>
                  <input {...getInputProps()} />
                  <p className="text-xs text-white/60">{uploading ? 'Uploading…' : 'Drop a new video here to replace'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div {...getRootProps()} className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis bg-bg-tertiary/30'
              )}>
                <input {...getInputProps()} />
                <UploadIcon className="h-8 w-8 text-white/40 mx-auto mb-3" />
                <p className="text-sm text-white/80 font-medium mb-1">
                  {isDragActive ? 'Drop to upload…' : uploading ? 'Uploading…' : 'Drag and drop your welcome video'}
                </p>
                <p className="text-xs text-white/40">MP4 or MOV, up to ~100MB in local mode</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
