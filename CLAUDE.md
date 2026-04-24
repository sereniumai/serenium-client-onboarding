# Serenium Onboarding Portal — Project Guide

This file is loaded into every Claude session. Read it first. It tells you what we're building, what decisions are already made, and what NOT to break.

---

## What this project is

A **multi-tenant client onboarding portal** for **Serenium AI**, a Canadian marketing agency serving roofing companies. Clients log in, complete a series of onboarding modules (Business Profile, Facebook Ads, AI SMS, AI Receptionist, Website), and the collected info is handed off to the Serenium team to build out their services.

After onboarding, the portal becomes the client's **monthly reports dashboard** — they log in to see their monthly ad video and performance summary.

**Live URL (when deployed):** `https://clients.sereniumai.com`
**Primary user (admin):** contact@sereniumai.com (Serenium team)
**Secondary users (clients):** roofing business owners invited by Serenium

---

## Current status (READ THIS BEFORE SUGGESTING CHANGES)

- **Backend:** Supabase **not yet connected**. Everything runs on a mock DB in localStorage (see `src/lib/mockDb.ts`). All data lives in one key: `serenium.mockdb.v6`.
- **Hosting:** Vercel, connected to GitHub `main` branch. Auto-deploys on push.
- **Domain:** `clients.sereniumai.com` wired via Namecheap CNAME → Vercel.
- **Email:** Resend edge functions are scaffolded but not deployed. Invites don't actually send emails yet.
- **First real launch:** 5 client businesses. Going live soon.
- **Mode:** Still iterating on the content (which questions to ask, which videos to show). Expect field additions/removals during active development.

---

## Tech stack

- **Frontend:** React 19 + TypeScript, Vite, React Router, Tailwind CSS, Zustand, React Hook Form + Zod
- **Backend (planned):** Supabase (Postgres + Auth + Edge Functions + Storage)
- **Email (planned):** Resend
- **Hosting:** Vercel
- **Animations:** Framer Motion, canvas-confetti for celebrations

---

## Architecture — the three things you must understand

### 1. Service → Module → Field hierarchy
Everything the client fills in is organized as:
```
Service (e.g. "Website")
  └── Module (e.g. "Domain access")
        └── Field (e.g. "registrar")
```
All of this is defined in **`src/config/modules.ts`** — the single source of truth for what questions get asked.

### 2. The mockDb pattern
`src/lib/mockDb.ts` exposes a `db` object with methods like `db.upsertSubmission(...)`, `db.listSubmissionsForOrg(...)`, `db.setModuleStatus(...)`. **Every component in the app talks to `db`, never to localStorage or Supabase directly.** When we migrate to Supabase, we only rewrite `mockDb.ts` — every component stays untouched.

### 3. Field keys are the contract
Submissions are stored keyed as `<serviceKey>.<moduleKey>.<fieldKey>` (e.g. `website.domain_access.registrar`). This key is the contract with the database. **Never rename a field key once clients have started using it.** Change labels freely; keep keys stable.

---

## Golden rules (read before making changes)

### Data & schema
1. **Never rename a field key** in `src/config/modules.ts` once real clients have submitted data under it. Change `label` freely; keep `key` stable.
2. **Never reuse a deleted field key** for a different purpose later — old client data will pollute the new field.
3. **Additive changes are safe.** Adding new fields/modules/services mid-flight won't break existing clients.
4. **Soft-delete via admin toggles, don't rip out.** If a question is no longer needed, use the per-field/per-module admin toggle rather than deleting from config. Clients who already answered keep their data.
5. **Schema changes must go through migration files** once Supabase is live. No editing the Supabase dashboard by hand.

### Design & UX
6. **Brand:** dark background (`#0A0A0A` ish), warm orange (`#FF6B1F`) accent. See Tailwind config for exact palette.
7. **Source of truth for look/feel:** Serenium marketing site. Match the aesthetic.
8. **Keep UX snappy.** Autosave on every field change. No "save" buttons unless we really mean it.
9. **Mobile matters.** A good chunk of clients will fill this in on their phone.
10. **Only use emojis if the user asks for them.** Don't sprinkle them into code or UI.

### Engineering
11. **Prefer editing existing files over creating new ones.** No scratch docs, no README-fluff.
12. **Don't add error handling for scenarios that can't happen.** Trust framework guarantees. Only validate at real system boundaries.
13. **No premature abstraction.** Three similar lines > one clever helper.
14. **Don't add comments explaining *what* the code does** — well-named code speaks for itself. Only comment *why* something non-obvious is there.
15. **Never skip git hooks** (`--no-verify`) or commit secrets. If a hook fails, fix the underlying issue.

### Process
16. **Small, focused commits.** Don't bundle unrelated changes.
17. **Test in the local dev server** (`npm run dev` on :5173) before declaring anything done — especially UI changes.
18. **`npx tsc -b --noEmit`** must pass before considering a change complete.
19. **Never force-push to `main`.** Never delete branches/tags without asking.

---

## File map — where things live

| What | Where |
|---|---|
| Module/field definitions (source of truth for content) | `src/config/modules.ts` |
| Type definitions | `src/types/index.ts` |
| Mock database (to be replaced by Supabase) | `src/lib/mockDb.ts` |
| Supabase client (stub for now) | `src/lib/supabase.ts` |
| Auth context | `src/auth/AuthContext.tsx` |
| Main router | `src/App.tsx` |
| Client-facing pages | `src/pages/client/` |
| Admin pages | `src/pages/admin/` |
| Form renderer (handles every field type) | `src/components/FieldRenderer.tsx` |
| Video embed helper (Loom + YouTube) | `src/lib/videoEmbed.ts` |
| Conditional logic engine | `src/lib/condition.ts` |
| Progress calculation | `src/lib/progress.ts` |
| Client health (fresh/healthy/stalled) | `src/lib/clientHealth.ts` |
| Edge functions (email) | `supabase/functions/` |
| Email templates | `supabase/functions/_shared/templates.ts` |

---

## Services & modules — current content

Five services. All defined in `src/config/modules.ts`:

1. **Business Profile** (13 modules) — core business info used across every other service
2. **Facebook Ads** (1 placeholder module) — being redesigned
3. **AI SMS** (5 modules) — GoHighLevel + Appointwise AI for SMS lead qualification
4. **AI Receptionist** (5 modules) — Retell voice AI for inbound calls
5. **Website** (7 modules) — full site build with SEO + analytics

Cross-service dependencies:
- `business_profile.emergency_service.emergency_offered = Yes` unlocks Emergency Handling modules in AI SMS + AI Receptionist.
- `ai_receptionist.call_forwarding_setup` is locked until admin flips the `ai_receptionist_ready_for_connection` flag.

---

## Field types supported

Defined in `src/config/modules.ts` as `FieldType`:
- `text`, `textarea`, `email`, `phone`, `number`, `url`
- `select`, `multiselect`, `color`, `checkbox`
- `file`, `file_multiple`
- `repeatable` — add-one-at-a-time list
- `weekly_availability` — Mon–Fri schedule grid (open/close + optional break window)
- `info` — static guidance panel, no input

To add a new field type: extend the `FieldType` union AND the `FieldInput` switch in `src/components/FieldRenderer.tsx`.

---

## Conditional logic

Fields and modules can be conditionally shown using the `conditional` property:
- **Same-module condition:** `{ field: 'emergency_offered', op: 'eq', value: 'Yes' }`
- **Cross-module condition:** `{ path: 'business_profile.emergency_service.emergency_offered', op: 'eq', value: 'Yes' }`
- **Nested:** `{ all: [...] }` (AND) or `{ any: [...] }` (OR)
- **Operators:** `eq`, `neq`, `includes` (for multiselect arrays)

See `src/lib/condition.ts`.

---

## Videos & external links

Links in module config live in three places:
- `videoUrl` on a ModuleDef — shows the video in the module header.
- `links: Record<string, string>` — shown under instructions. Auto-detects YouTube/Loom URLs and embeds them inline; everything else renders as a text link.
- `conditionalLinks: Record<string, string>` — shown when a select field in the same module matches the key. Same auto-detect.

Helper: `src/lib/videoEmbed.ts` — supports Loom (`loom.com/share/...` or `loom.com/embed/...`) and YouTube (`youtube.com/watch?v=...` or `youtu.be/...`).

---

## Admin capabilities (already built)

- **New client wizard:** Create org, pick enabled services + modules, add users.
- **Per-client toggles:** enable/disable any service, module, or individual field.
- **Impersonation:** "View as client" — experience the portal as that client without logging out.
- **Users tab:** add team members, generate invite links (manual copy for now — email not yet wired).
- **Notes:** internal admin notes per org.
- **Reports:** create/edit/delete monthly reports shown to clients post-onboarding.
- **Videos manager:** set Loom/YouTube URLs per module, override config.
- **Welcome video manager:** upload a global welcome video that plays on first login.

---

## Team notifications (to wire up during Resend step)

Recipient list via env var (e.g. `TEAM_NOTIFICATION_EMAILS=adam@sereniumai.com,ops@sereniumai.com`). One Resend template per event, deep-link to admin view.

**Triggers:**

1. **Client signs up / first login** — confirms invite worked.
2. **Service completed — whole section finished:**
   - Business Profile complete
   - Facebook Ads complete
   - AI SMS complete
   - AI Receptionist complete
   - Website complete
3. **Immediate module-level (access granted — time-sensitive, team must act fast):**
   - Website → Domain access complete *(registrar delegation)*
   - Website → CMS access complete *(WordPress admin granted)*
   - Website → Analytics and tracking access complete *(GA/GSC/GBP)*
   - AI Receptionist → Call forwarding setup complete *(live phone now routes to AI — test immediately)*
   - Facebook Ads → access step complete *(once that module is built — currently placeholder)*

**Implementation notes:**
- Trigger point: `db.setModuleStatus('complete')` in `mockDb.ts` → Supabase version fires to an edge function.
- Edge function `send-team-notification` mirrors `send-invitation` structure.
- Templates added to `supabase/functions/_shared/templates.ts`.
- Guard against duplicates — each event fires at most once per (org, event) pair. Store sent notifications in a `team_notifications_sent` table.

---

## Roadmap — what's next (in order)

1. ✅ Finish content (all field changes, videos, wording) — **active**
2. ⏳ Create Supabase project (Pro plan for 5-client production)
3. ⏳ Write SQL migrations translating `src/types/index.ts` into tables with RLS policies
4. ⏳ Create Storage bucket for file uploads; set max file size (~10 MB)
5. ⏳ Port `mockDb.ts` methods to Supabase calls (one table at a time)
6. ⏳ Wire Supabase Auth (signup via invite token, login, password reset)
7. ⏳ Deploy email edge functions + Resend API key for invitation emails
8. ⏳ Set up staging environment (second Supabase project + Vercel preview)
9. ⏳ End-to-end smoke test with a dummy client
10. ⏳ Onboard the first 5 real clients

---

## About the user

Founder of Serenium AI (Cochrane, Alberta). Marketing agency serving Canadian roofers. **Self-describes as a beginner at engineering** — be explicit, give step-by-step guidance for anything involving infrastructure, terminal commands, or git. Explain the "why" behind technical decisions. Don't assume prior knowledge of Supabase, RLS, migrations, DNS, OAuth, etc.

When suggesting a change:
- Be concrete. Name the file, the line, the exact change.
- If an action is risky or affects shared infra (DNS, DB migrations, prod deploys), **pause and confirm first** — don't just do it.
- Prefer showing the plan first, then executing after the user agrees.

---

## Things that are NOT this project's scope

- Multi-language / i18n (English only for now)
- Mobile native app (web-responsive only)
- Billing / payments (handled elsewhere)
- Public marketing site (that's a separate Framer site)
- Anything outside the Serenium AI onboarding + reporting flow

---

## Quick reference — common commands

```bash
# Start local dev
npm run dev                    # :5173

# Typecheck
npx tsc -b --noEmit

# Build for production
npm run build

# Lint
npm run lint
```

---

**When in doubt, ask before doing.** This portal is about to serve real paying clients. Measure twice, cut once.
