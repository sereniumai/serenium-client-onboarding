import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Video, Check, X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { LoadingState } from '../../components/LoadingState';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { SERVICES, type ServiceDef, type ModuleDef } from '../../config/modules';
import { SERVICE_ICON } from '../../config/serviceIcons';
import { listStepVideos, setStepVideo, removeStepVideo, type StepVideo } from '../../lib/db/videos';
import { videoEmbedUrl } from '../../lib/videoEmbed';
import { cn } from '../../lib/cn';
import type { ServiceKey } from '../../types';

const QK_VIDEOS = ['step_videos'] as const;

export function VideosManager() {
  const { data: videos = [], isLoading } = useQuery({ queryKey: QK_VIDEOS, queryFn: listStepVideos });
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const videosByKey = new Map(videos.map(v => [`${v.serviceKey}.${v.moduleKey}`, v]));

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-5xl px-4 md:px-6 pt-10 md:pt-14 pb-16">
          <div className="mb-8">
            <p className="eyebrow mb-2">Content</p>
            <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">Step videos</h1>
            <p className="text-white/60 text-sm max-w-2xl">Paste a Loom or YouTube URL for any step. Clients see it embedded on that module's page. Leave a step empty and a "coming soon" placeholder shows instead.</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search service or module…"
              className="input !pl-9 w-full max-w-md"
            />
          </div>

          {isLoading && (
            <LoadingState />
          )}

          <div className="space-y-3">
            {SERVICES.map(svc => {
              const modules = svc.modules.filter(m =>
                !q || svc.label.toLowerCase().includes(q) || m.title.toLowerCase().includes(q)
              );
              if (modules.length === 0) return null;
              return (
                <ServiceBlock key={svc.key} service={svc} modules={modules} videosByKey={videosByKey} defaultOpen={!!q} />
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ServiceBlock({ service, modules, videosByKey, defaultOpen }: {
  service: ServiceDef;
  modules: ModuleDef[];
  videosByKey: Map<string, StepVideo>;
  defaultOpen?: boolean;
}) {
  const Icon = SERVICE_ICON[service.key];
  const setCount = modules.filter(m => videosByKey.has(`${service.key}.${m.key}`)).length;
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-bg-tertiary/30 transition-colors"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange/10 text-orange"><Icon className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg">{service.label}</h2>
          <p className="text-xs text-white/50">{modules.length} module{modules.length === 1 ? '' : 's'}</p>
        </div>
        <span className="text-xs text-white/50 tabular-nums shrink-0">{setCount}/{modules.length} set</span>
        {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
      </button>
      {open && (
        <div className="divide-y divide-border-subtle border-t border-border-subtle">
          {modules.map(m => (
            <VideoRow key={m.key} serviceKey={service.key} module={m} current={videosByKey.get(`${service.key}.${m.key}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoRow({ serviceKey, module: m, current }: { serviceKey: ServiceKey; module: ModuleDef; current?: StepVideo }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current?.url ?? '');

  const save = useMutation({
    mutationFn: (url: string) => setStepVideo(serviceKey, m.key, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_VIDEOS });
      setEditing(false);
      toast.success('Video saved');
    },
    onError: (err: Error) => toast.error('Save failed', { description: err.message }),
  });
  const remove = useMutation({
    mutationFn: () => removeStepVideo(serviceKey, m.key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_VIDEOS });
      setValue('');
      setEditing(false);
      toast.success('Video cleared');
    },
  });

  const embedUrl = current?.url ? videoEmbedUrl(current.url) : null;
  const configUrl = m.videoUrl ? videoEmbedUrl(m.videoUrl) : null;
  const effective = embedUrl || configUrl;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5',
          current ? 'bg-success/15 text-success' : configUrl ? 'bg-orange/10 text-orange' : 'bg-white/5 text-white/40',
        )}>
          <Video className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-sm">{m.title}</p>
              <p className="text-xs text-white/40">
                {current ? 'Override set'
                  : configUrl ? 'Using config default'
                  : 'No video'}
                {m.estimatedMinutes && <span className="ml-2">· ~{m.estimatedMinutes} min</span>}
              </p>
            </div>
            {!editing && (
              <button onClick={() => { setValue(current?.url ?? ''); setEditing(true); }} className="text-xs text-orange hover:text-orange-hover font-medium">
                {current ? 'Edit' : configUrl ? 'Override' : 'Add video'} →
              </button>
            )}
          </div>

          {editing && (
            <div className="mt-3 space-y-2">
              <input
                type="url"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="https://www.loom.com/share/... or https://youtu.be/..."
                className="input text-sm"
              />
              <div className="flex gap-2">
                <button onClick={() => save.mutate(value.trim())} disabled={!value.trim() || save.isPending} className="btn-primary !py-1.5 !px-3 text-xs">
                  <Check className="h-3.5 w-3.5" /> {save.isPending ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary !py-1.5 !px-3 text-xs">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                {current && (
                  <button onClick={() => remove.mutate()} disabled={remove.isPending} className="ml-auto text-xs text-error hover:underline">
                    Remove override
                  </button>
                )}
              </div>
            </div>
          )}

          {effective && !editing && (
            <div className="mt-3 aspect-video rounded-lg border border-border-subtle overflow-hidden bg-black max-w-md">
              <iframe src={effective} className="w-full h-full" title={m.title} allow="fullscreen" />
            </div>
          )}

          {/* Extra walkthroughs wired via module.links + module.conditionalLinks */}
          {(m.links && Object.keys(m.links).length > 0) || (m.conditionalLinks && Object.keys(m.conditionalLinks).length > 0) ? (
            <div className="mt-3 space-y-1.5">
              {m.links && Object.entries(m.links).map(([label, href]) => (
                <ExtraWalkthrough key={`link-${label}`} label={label} href={href} trigger="Always shown" />
              ))}
              {m.conditionalLinks && Object.entries(m.conditionalLinks).map(([value, href]) => (
                <ExtraWalkthrough key={`cond-${value}`} label={value} href={href} trigger={`When field value = "${value}"`} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ExtraWalkthrough({ label, href, trigger }: { label: string; href: string; trigger: string }) {
  const embed = videoEmbedUrl(href);
  const isVideo = !!embed;
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-bg-tertiary/40 border border-border-subtle text-xs">
      <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded shrink-0', isVideo ? 'bg-orange/15 text-orange' : 'bg-white/5 text-white/50')}>
        {isVideo ? '▶' : '↗'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white/80 truncate">{label}</p>
        <p className="text-[10px] text-white/40 truncate">{trigger}</p>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[11px] text-orange hover:text-orange-hover shrink-0">
        Open →
      </a>
    </div>
  );
}
