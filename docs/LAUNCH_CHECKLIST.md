# Launch Checklist

Living list of what's left before first real client. Ticking items as they land.

---

## 🚨 Open blockers (must fix before first real client)

_None outstanding. Next batch waiting: verify current fixes by running a full end-to-end dry run._

---

## 🟢 Needs verification (you to test, not code changes)

### [ ] End-to-end dry run with a throwaway email
1. Admin → create a fake client, send invite to a real Gmail you own
2. Accept invite in incognito window
3. Fill at least 2 modules including at least one Drive-link URL field
4. Hit a required logo/brand-assets section
5. Watch the module auto-complete, confetti, progress bar
6. Log out, log back in, confirm state persisted
7. Confirm the team email lands in your inbox on module completion

### [ ] Run the site once more after current deploy
Vercel should be live with commits through `0b1ba0c`. Verify:
- Admin login lands on /admin (not /onboarding/X)
- Impersonation banner sits cleanly next to sidebar (no overlap)
- Client dashboard shows the "Portal status" pill with a hover tooltip
- Logo fields are now Drive/Dropbox URL inputs
- Toggling `business_profile` on/off on admin shows/hides the `website_logo` field

---

## 🟠 Remaining known issues (post-launch OK for first 1-2 clients)

- **Ex-admin role change** — demoted admin keeps admin UI for up to 1hr until JWT refresh. Low risk at 5 clients.
- **Autosave optimistic concurrency** — two tabs editing same field can last-write-wins. Unlikely at our scale.
- **Impersonation writes not tagged** — edits made while impersonating look like client edits in activity log. Session-level audit exists in `admin_impersonation_audit` so forensic path is there.
- **Supabase Pro upgrade + PITR** — $25/mo, gives 7-day point-in-time recovery. Needed before meaningful client data.
- **Stranded uploaded files** — clients who uploaded to the now-removed file fields have orphan files in Supabase Storage. Safe to delete manually.
- **3 `setState-in-effect` lint warnings** — not bugs, just non-ideal patterns. Can rewrite later.
- **5 `any` types in edge functions** — cosmetic, functions work fine.

---

## ✅ Done

### Security + infra
- Auth hardened (stub user from JWT, timeout, idle logout)
- Admin audit log + impersonation audit table
- Forgot password wired
- Password length unified at 10 chars everywhere
- CSP tightened, HSTS, robots.txt, noindex meta, OG/Twitter cards
- Branded sign-out-everywhere modal (no native confirm)
- Sentry wired with email alerts on every new issue
- UptimeRobot hitting /api/health every 5min
- No npm vulnerabilities

### Legal + compliance
- Privacy Policy: Serenium AI Inc., PIPEDA, PIPA, Alberta OIPC, CASL, subprocessors (Supabase/Vercel/Resend/Anthropic/Sentry/UptimeRobot/Fonts)
- Terms of Service: invitation-only, AI disclaimers, liability cap, Alberta governing law
- Email footers identify Serenium AI Inc. + Privacy/Terms/CASL

### Launch-prep fixes
- send-invitation error path no longer crashes
- Report files confirmed as JSON on monthly_reports (no separate table)
- Conditional hooks crash in ModulePage fixed
- Image thumbnails fixed (SignedImg component — still exists for admin uploads)
- Silent upload/autosave failures surface toasts + Sentry
- Autosave flushes pending writes on unmount
- Impersonation banner no longer duplicated
- "Available to enable" shown above enabled services
- Diagnostics "Re-run" button fixed
- Client-side system-health pill with live tooltip
- Admin direct-URL `/onboarding/X` bounces to `/admin/clients/X`
- Required file fields no longer block module completion

### Polish sweep 2
- Wizard rollback: createClient now deletes the org if any post-createOrg step fails. No more zombie orgs.
- Modals: shared `useModal` hook adds Esc-to-close + focus return on unmount + role=dialog + aria-modal on CompletionOverlay, FinalCelebration, WelcomeVideoModal, FollowupModal.
- Invitation email failure: toast + Sentry capture, admin told to copy the invite link.
- Contrast bumps for essential muted text (help text, footers, optional labels) past WCAG AA.
- Console cleanup: auth/sentry logs removed from production noise.
- 2 more conditional-hooks bugs caught by lint and fixed.

### UX reshapes
- All file upload fields replaced with Drive/Dropbox URL fields
- `business_profile.logo_files` module renamed "Logo"
- `website.brand_assets.website_logo` hidden when business_profile is enabled (no duplicate ask)
- Business Profile excluded from client's "Not in your plan" list
- Post-launch runbook at `docs/RUNBOOK.md`
