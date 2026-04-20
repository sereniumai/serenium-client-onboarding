# Serenium Onboarding Portal

Multi-tenant client onboarding portal for Serenium AI. Clients work through a guided, course-like experience to submit everything we need to launch their campaigns. Once onboarding is complete, the same login becomes their monthly reporting dashboard.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS v3 (custom Serenium dark/orange theme)
- React Router v6
- React Hook Form + Zod
- Framer Motion + canvas-confetti
- cmdk (command palette) + Sonner (toasts)
- Supabase (auth, Postgres with RLS, Storage, Realtime) — planned
- Resend via Supabase Edge Functions — planned
- Deployed on Vercel to `clients.sereniumai.com`

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173. Dev accounts (any password works in local/mock mode):

- Admin: `adam@sereniumai.com`
- Client: `craig@surewest.ca`

## Environment

Copy `.env.example` to `.env.local` and fill in values once Supabase/Resend are provisioned.
