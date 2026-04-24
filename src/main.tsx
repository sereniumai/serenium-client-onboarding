import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initTheme } from './lib/theme';

initTheme();

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
