// Parses a Loom share URL and returns the embed URL.
// Accepts:
//   https://www.loom.com/share/{id}
//   https://www.loom.com/share/{id}?sid=...
//   https://loom.com/share/{id}
//   https://www.loom.com/embed/{id}         (already embed)
//   {id}                                    (raw ID, 32+ hex chars)

const ID_RE = /[a-f0-9]{16,}/i;

export function loomIdFromUrl(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  try {
    if (/^https?:\/\//.test(s)) {
      const u = new URL(s);
      if (!u.hostname.includes('loom.com')) return null;
      const m = u.pathname.match(/\/(share|embed)\/([a-f0-9]{16,})/i);
      return m?.[2] ?? null;
    }
  } catch { /* fall through */ }
  const raw = s.match(ID_RE);
  return raw?.[0] ?? null;
}

export function loomEmbedUrl(input: string): string | null {
  const id = loomIdFromUrl(input);
  return id ? `https://www.loom.com/embed/${id}?hideEmbedTopBar=true` : null;
}
