import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initTheme } from './lib/theme';
import { env } from './lib/env';

initTheme();

const sentryDsn = env.sentryDsn;
const vercelEnv = env.vercelEnv;
// Only send to Sentry from real production deploys. Preview + dev are noisy
// and would pollute the production issue feed.
if (sentryDsn && vercelEnv === 'production') {
  Sentry.init({
    dsn: sentryDsn,
    environment: vercelEnv,
    release: env.vercelGitCommitSha?.slice(0, 7) ?? 'local',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.globalHandlersIntegration({ onerror: true, onunhandledrejection: true }),
      Sentry.replayIntegration(),
    ],
    // Scrub common PII fields before sending events.
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user?.ip_address) delete event.user.ip_address;
      return event;
    },
    ignoreErrors: [
      // Browser extensions / random script errors
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      // Known chunk-reload flow, we handle it ourselves
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
    ],
  });
  // Expose for manual testing from the console: window.Sentry.captureMessage('...')
  (window as unknown as { Sentry: typeof Sentry }).Sentry = Sentry;
} else if (!sentryDsn && vercelEnv === 'production') {
  console.warn('[sentry] DSN missing in production, error reporting disabled');
}

// After a new deploy, code-split chunks the browser remembers may no longer
// exist. Vite surfaces this as "Failed to fetch dynamically imported module".
// Reload once to pick up the new index.html + fresh chunk names, then stop
// (stored in sessionStorage so we never loop).
const CHUNK_RELOAD_KEY = 'serenium.chunkReload';
const isChunkError = (msg: string) =>
  msg.includes('Failed to fetch dynamically imported module') ||
  msg.includes('Importing a module script failed') ||
  msg.includes('error loading dynamically imported module');

window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
});
window.addEventListener('error', (e) => {
  if (!e.message || !isChunkError(e.message)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
});

// Stale HTML referencing a stylesheet hash that no longer exists on the CDN.
// Same recovery as a missing JS chunk: reload once to fetch fresh index.html.
// Resource-load errors only fire in capture phase, hence the `true`.
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement | null;
  if (!target || target.tagName !== 'LINK') return;
  const link = target as HTMLLinkElement;
  if (link.rel !== 'stylesheet') return;
  if (!link.href || !link.href.includes('/assets/')) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
