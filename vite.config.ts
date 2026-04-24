import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel exposes VERCEL_GIT_COMMIT_SHA + VERCEL_ENV at build time. We
// forward both to the client bundle so Sentry can tag events with both
// the release (commit SHA) and environment (production vs preview),
// keeping preview-deploy noise out of the production issue feed.
const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.VITE_VERCEL_GIT_COMMIT_SHA ??
  'local';
const vercelEnv =
  process.env.VERCEL_ENV ??
  process.env.VITE_VERCEL_ENV ??
  'development';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA': JSON.stringify(commitSha),
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(vercelEnv),
  },
})
