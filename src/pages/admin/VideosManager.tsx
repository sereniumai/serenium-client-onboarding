import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Megaphone, MessageSquare, Globe, Building2, Headphones, CheckCircle2, Video, X } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { db } from '../../lib/mockDb';
import { SERVICES } from '../../config/modules';
import { loomEmbedUrl } from '../../lib/loom';
import { useDbVersion } from '../../hooks/useDb';
import type { ServiceKey } from '../../types';
import { cn } from '../../lib/cn';

const SERVICE_ICON: Record<ServiceKey, typeof Megaphone> = {
  business_profile: Building2, facebook_ads: Megaphone, ai_sms: MessageSquare, ai_receptionist: Headphones, website: Globe,
};

export function VideosManager() {
  useDbVersion();
  const videos = db.listAllVideos();

  const total = SERVICES.reduce((s, svc) => s + svc.modules.length, 0);
  const wired = Object.keys(videos).length;

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-4xl px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-24">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Back to admin
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
            <div>
              <p className="eyebrow mb-3">Library</p>
              <h1 className="font-display font-black text-[clamp(1.75rem,6vw,3rem)] leading-[1.05] tracking-[-0.03em]">Step videos</h1>
              <p className="text-white/60 mt-2 text-sm md:text-base">Paste a Loom URL for each step. Clients see the embed at the top of the step page.</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs uppercase tracking-wider text-white/40">Wired</p>
              <p className="font-display font-black text-3xl tabular-nums">{wired}<span className="text-white/30 text-lg">/{total}</span></p>
            </div>
          </div>

          <div className="space-y-8">
            {SERVICES.map(svc => {
              const Icon = SERVICE_ICON[svc.key];
              return (
                <div key={svc.key}>
                  <div className="flex items-center gap-3 mb-3 px-1">
                    <div className="h-8 w-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-display font-bold text-xl">{svc.label}</h2>
                  </div>
                  <div className="card p-0 divide-y divide-border-subtle overflow-hidden">
                    {svc.modules.map((m, i) => (
                      <VideoRow key={m.key} serviceKey={svc.key} moduleKey={m.key} title={m.title} index={i + 1} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function VideoRow({ serviceKey, moduleKey, title, index }: { serviceKey: ServiceKey; moduleKey: string; title: string; index: number }) {
  const stored = db.getVideoUrl(serviceKey, moduleKey) ?? '';
  const [url, setUrl] = useState(stored);
  const [showPreview, setShowPreview] = useState(false);
  const embed = loomEmbedUrl(url);
  const invalid = url.trim() && !embed;

  useEffect(() => {
    setUrl(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const save = () => {
    db.setVideoUrl(serviceKey, moduleKey, url);
  };

  const clear = () => {
    setUrl('');
    db.setVideoUrl(serviceKey, moduleKey, '');
  };

  const saved = embed && url === stored && stored !== '';

  return (
    <div className="p-5">
      <div className="flex items-center gap-4 mb-2.5">
        <div className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums shrink-0',
          saved ? 'bg-success text-white' : 'bg-bg-tertiary text-white/60'
        )}>
          {saved ? <CheckCircle2 className="h-4 w-4" /> : String(index).padStart(2, '0')}
        </div>
        <p className="font-medium text-sm flex-1 min-w-0 truncate">{title}</p>
        {embed && (
          <button
            onClick={() => setShowPreview(s => !s)}
            className="text-xs text-orange hover:text-orange-hover font-medium inline-flex items-center gap-1"
          >
            <Video className="h-3.5 w-3.5" /> {showPreview ? 'Hide' : 'Preview'}
          </button>
        )}
      </div>

      <div className="flex gap-2 md:ml-12">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onBlur={save}
          placeholder="https://www.loom.com/share/..."
          className={cn('input flex-1', invalid && 'border-error focus:ring-error/30')}
        />
        {url && (
          <button onClick={clear} className="px-3 rounded-lg border border-border-subtle text-white/50 hover:text-error hover:border-error/40" title="Remove video">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {invalid && <p className="mt-1.5 md:ml-12 text-xs text-error">Not a valid Loom URL.</p>}

      {showPreview && embed && (
        <div className="mt-3 md:ml-12 aspect-video rounded-lg border border-border-subtle overflow-hidden">
          <iframe src={embed} allow="fullscreen" className="w-full h-full" title={`Preview: ${title}`} />
        </div>
      )}
    </div>
  );
}
