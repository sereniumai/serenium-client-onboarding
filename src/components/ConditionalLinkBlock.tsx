import { videoEmbedUrl } from '../lib/videoEmbed';
import type { Submission } from '../types';

/**
 * Renders a conditional walkthrough (video embed or doc link) when the client
 * has picked a value on a field in this module whose label matches a key in
 * `links`. Used to show GoDaddy / Namecheap / Cloudflare walkthroughs once the
 * client selects their registrar, etc.
 */
export function ConditionalLinkBlock({ submissions, svcKey, modKey, links }: {
  submissions: Submission[];
  svcKey: string;
  modKey: string;
  links: Record<string, string>;
}) {
  const moduleSubs = submissions.filter(s => s.fieldKey.startsWith(`${svcKey}.${modKey}.`));
  const match = moduleSubs.find(s => typeof s.value === 'string' && links[s.value as string]);
  if (!match) return null;
  const label = match.value as string;
  const href = links[label];
  const embed = videoEmbedUrl(href);
  if (embed) {
    return (
      <div className="mt-4">
        <p className="text-xs text-white/60 mb-2">How to do this in {label}:</p>
        <div className="aspect-video rounded-xl border border-border-subtle overflow-hidden bg-black">
          <iframe
            src={embed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full"
            title={`Walkthrough: ${label}`}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 p-3 rounded-lg border border-orange/30 bg-orange/5">
      <p className="text-xs text-white/60 mb-1">How to do this in {label}:</p>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-orange hover:text-orange-hover">
        → Official guide for {label}
      </a>
    </div>
  );
}
