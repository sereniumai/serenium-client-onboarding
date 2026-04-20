# Supabase setup

## One-time setup

Once the Supabase project is created, run these migrations **in order** in the Supabase SQL Editor (Dashboard → SQL Editor → New query, paste, Run):

1. `migrations/001_initial_schema.sql` — tables, indexes, auto-profile trigger
2. `migrations/002_rls_policies.sql` — row-level security for all tables
3. `migrations/003_storage_buckets.sql` — storage buckets + RLS

## Seed your first admin

After running migrations, create your first admin user via Supabase Dashboard → Authentication → Users → Add user.

Then in SQL Editor, elevate the profile to admin:

```sql
update profiles set role = 'admin' where email = 'contact@sereniumai.com';
```

## Environment variables

Copy the URL + keys from **Project Settings → API** into:

- **Local** — create `.env.local` in the project root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Vercel** — Project Settings → Environment Variables, add the same two (plus `SUPABASE_SERVICE_ROLE_KEY` for Edge Functions)

## Storage buckets

- `org-assets` (private) — client uploads under `{org_id}/{category}/`
- `report-files` (private) — monthly report attachments under `{org_id}/{report_id}/`
- `welcome-video` (private) — global singleton under `welcome/`
- `logos` (public) — client logos under `{org_id}/`
