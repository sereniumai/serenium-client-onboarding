# Launch Checklist

Running list of what's left before first real client. Tick items as they land. Keep this short — archive anything that's done for more than a week.

---

## 🚨 Open blockers (fix before first real client)

### [ ] Logo / file submit bug — reported by Rob 2026-04-24
Adding info + logo on Website → Brand assets doesn't let the module submit. Needs repro:
- Which field specifically? (logo_picker? file_multiple?)
- Does the autosave indicator show "saved" after typing, or "error"?
- Does the module show as ready-to-complete but the confetti never fires?
- Any toast error?
- What does the browser Console show when you click submit / move on?

### [x] Admin login lands on /onboarding/test instead of /admin — FIXED
OnboardingDashboard now redirects admin users to /admin/clients/:slug unless `?impersonate=1` is present. Commit pending.

---

## 🟠 Known issues (post-launch OK for first 1-2 clients)

- **Wizard rollback** — if client creation fails mid-way, zombie org exists. Admin notices and can delete.
- **Ex-admin role change** — demoted admin keeps admin UI for up to 1hr until token refresh. Low risk at 5 clients.
- **Invitation email send failure** — client-side `.catch(console.warn)` with no toast. Admin UX improvement.
- **Modal focus trap + Esc handling** — keyboard-only users can't close CompletionOverlay / FinalCelebration / WelcomeVideoModal with keyboard.
- **Autosave optimistic concurrency** — two tabs editing same field can last-write-wins. Unlikely at our scale.
- **Impersonation writes not tagged** — edits made while impersonating look like client edits in activity log. Auditing gap, not a bug.

---

## ✅ Done (recent, for reference)

- Forgot password wired
- send-invitation error-path crash fixed
- Password length unified at 10
- CSP tightened, headers solid
- Branded sign-out-everywhere modal
- Report files — confirmed JSON-on-monthly_reports, no separate table needed
- Conditional hooks bug in ModulePage
- Legal (Privacy + Terms) complete with Serenium AI Inc., CASL + Alberta OIPC, wide layout
- Sentry + email alerts firing
- UptimeRobot monitoring
- Runbook at docs/RUNBOOK.md
- Robots.txt + noindex meta + OG/Twitter cards
- Image thumbnails fixed (SignedImg component)
- Silent upload + autosave failures now surface toasts + Sentry
- Autosave flushes pending writes on unmount
- Impersonation banner no longer duplicated over sidebar logo
- "Available to enable" shown above enabled services on client detail
- Client-side system-health pill on onboarding dashboard
- Diagnostics Re-run button on one line
- Admin direct-URL to /onboarding/X bounces to /admin/clients/X
