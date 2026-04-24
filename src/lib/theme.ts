/**
 * Theme switching. Applies [data-theme="light"] on <html> (default is dark).
 * Persists to localStorage. Respects the user's OS preference the very first
 * time the app runs if they haven't picked yet.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'serenium.theme';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  // First visit, honour OS preference.
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');
  root.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage blocked */ }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('serenium:theme-change', { detail: theme }));
}

export function initTheme() {
  applyTheme(getTheme());
}
