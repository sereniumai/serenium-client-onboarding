import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel exposes VERCEL_GIT_COMMIT_SHA in the build environment.
// We expose it to the client bundle as VITE_VERCEL_GIT_COMMIT_SHA so
// Sentry can tag errors with the release they occurred in. Falls back
// to a literal 'local' string when building outside Vercel.
const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.VITE_VERCEL_GIT_COMMIT_SHA ??
  'local';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA': JSON.stringify(commitSha),
  },
})
