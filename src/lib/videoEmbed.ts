import { loomEmbedUrl } from './loom';

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
  return loomEmbedUrl(input) ?? youtubeEmbedUrl(input);
}

export function isVideoUrl(input: string): boolean {
  return !!videoEmbedUrl(input);
}
