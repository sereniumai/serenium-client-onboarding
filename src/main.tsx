import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initTheme } from './lib/theme';

initTheme();

// Error tracking. Only active in production, disabled in dev so local
// crashes don't spam the prod project.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn && import.meta.env.PROD) {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    release: (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined)?.slice(0, 7) ?? 'local',
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
  console.log('[sentry] initialized');
} else if (!sentryDsn && import.meta.env.PROD) {
  console.warn('[sentry] DSN missing, error reporting disabled');
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
