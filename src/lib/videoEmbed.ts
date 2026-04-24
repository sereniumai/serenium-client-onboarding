import { loomEmbedUrl } from './loom';

export function vimeoIdFromUrl(input: string): string | null {
  if (!input) return null;
  try {
    const u = new URL(input.trim());
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
    // vimeo.com/123456789, vimeo.com/123/hash, player.vimeo.com/video/123
    const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
    return m?.[1] ?? null;
  } catch { return null; }
}

export function vimeoEmbedUrl(input: string): string | null {
  const id = vimeoIdFromUrl(input);
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

export function youtubeIdFromUrl(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1) || null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(embed|shorts)\/([^/?#]+)/);
      return m?.[2] ?? null;
    }
  } catch { /* not a url */ }
  return null;
}

export function youtubeEmbedUrl(input: string): string | null {
  const id = youtubeIdFromUrl(input);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

export function videoEmbedUrl(input: string): string | null {
  if (!input) return null;
  return loomEmbedUrl(input) ?? youtubeEmbedUrl(input) ?? vimeoEmbedUrl(input);
}

export function isVideoUrl(input: string): boolean {
  return !!videoEmbedUrl(input);
}
