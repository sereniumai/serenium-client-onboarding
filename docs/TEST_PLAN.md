# Pre-Launch Test Plan

A structured dry run to surface prod-only breakage before inviting a real client. Work through top-to-bottom. Tick items as you verify. Anything that fails, note and stop — don't keep going through a broken flow.

**Setup:** you'll need two browsers (or one normal + one incognito) and a real email you can check (Gmail recommended). Expect this to take 30–45 min.

---

## Phase 1: Admin-side setup (5 min)

- [ ] Open https://clients.sereniumai.com in a normal browser, log in as admin
- [ ] You land on `/admin` (not `/onboarding/X`)
- [ ] Open DevTools Console. Confirm NO red errors, no CSP violations
- [ ] Hover the "Portal status" pill — see the custom tooltip (not a browser tooltip with 2s delay)
- [ ] Sidebar build SHA at bottom matches the latest commit (check `git log -1 --format=%h`)
- [ ] Open `/admin/diagnostics` — all 6 checks green, "Re-run" button fits on one line
- [ ] Open `/admin/clients/new` — create a fake client with:
  - Business name: `Test Roofing Co`
  - Primary email: use a throwaway Gmail you own (e.g. `yourname+serenium-test@gmail.com`)
  - Primary name + phone, pick 2–3 services
- [ ] Submit the wizard. Verify:
  - Client lands in the list
  - No zombie org duplicates if you click back + resubmit
  - Email arrives in your Gmail within 1 min (check spam if missing)
  - Email shows "Serenium AI Inc." footer with Privacy/Terms/CASL links

---

## Phase 2: Client registration (5 min)

Switch to an **incognito window**.

- [ ] Click the invite link from your email
- [ ] Registration page loads with the invited email locked
- [ ] Try password `short` — see "at least 10 characters" error
- [ ] Try password `password123` — see "common password" error
- [ ] Set a valid password + full name + create account
- [ ] You land on `/onboarding/test-roofing-co`
- [ ] Welcome video modal appears (if you've uploaded one), or NOT if none uploaded
- [ ] If modal appears: press **Esc** — modal closes, focus returns
- [ ] Header shows Business name + "Portal status" pill next to it
- [ ] Sidebar shows enabled services + "Disabled services" grayed at bottom

---

## Phase 3: Fill a module (10 min)

Pick the shortest module the client has (Business Profile → Logo is a 1-field URL module).

- [ ] Click "Start" on a module
- [ ] Type into a field. **Watch the "Saved" indicator** — should show saving → saved
- [ ] Type fast (mash keys) — no lag, no scroll jump
- [ ] Click a different module mid-typing — NO lost keystrokes (autosave should flush)
- [ ] Return to the first module — your value is there
- [ ] Paste in a Drive URL for the Logo field (`https://drive.google.com/anything`)
- [ ] Module auto-completes → confetti fires, "complete" toast, "Up next" appears
- [ ] Click "Edit again" — module re-opens in in-progress state
- [ ] Open DevTools Console — NO red errors during any of this

---

## Phase 4: Upload something, then break it (5 min)

- [ ] Navigate to any field that accepts a URL (website links, social handles)
- [ ] Pass garbage into it (e.g. `not-a-url`) — browser's HTML5 validation catches it
- [ ] Pass a valid URL — saves cleanly

- [ ] Go **offline** (DevTools → Network → Offline)
- [ ] Type into a field — see "saving" → "error"
- [ ] Toast appears: "Couldn't save your changes"
- [ ] Go back online — next edit saves
- [ ] Sentry should have a captured error for the offline save failure (check admin Sentry later)

---

## Phase 5: Admin view-as-client flow (5 min)

Switch back to the **admin browser**.

- [ ] Open `/admin/clients/test-roofing-co`
- [ ] Click **View as client** (opens `/onboarding/X?impersonate=1`)
- [ ] Orange impersonation banner appears, sits cleanly alongside the sidebar (NOT overlapping the logo)
- [ ] Fill in or edit a field while impersonating
- [ ] Click "Back to admin" — returns you to the admin client page
- [ ] In Supabase SQL editor, run:
  ```sql
  select action, metadata, created_at from activity_log
  where organization_id = '<test-org-id>'
  order by created_at desc limit 10;
  ```
  Verify the latest entry has `metadata->>'impersonating' = 'true'`

---

## Phase 6: Dangerous admin actions (5 min)

Still in the admin browser.

- [ ] On the test client's Overview tab, scroll to "Danger zone"
- [ ] Click "Delete client" — branded modal appears (NOT native browser confirm)
- [ ] Press **Esc** — modal closes, nothing deleted
- [ ] Click "Delete" again — confirm
- [ ] Client is gone from the list, no zombie data
- [ ] In Supabase SQL editor, confirm no `invitations` / `organization_services` / `submissions` rows remain for that org ID

---

## Phase 7: Error pipeline (2 min)

- [ ] In the admin, open DevTools Console
- [ ] Run `setTimeout(() => { throw new Error('Pre-launch test ' + Date.now()); }, 0);`
- [ ] Within 1 min, new Sentry issue appears at sentry.io
- [ ] Within 2 min, email arrives at `contact@sereniumai.com`

---

## Phase 8: Mobile smoke test (5 min)

Open DevTools → toggle device toolbar → choose iPhone SE (375×667).

- [ ] Login page renders cleanly, no horizontal scroll
- [ ] Client dashboard renders, service cards stack vertically
- [ ] Open a module → form inputs full width, readable
- [ ] Any horizontal scroll on any page? **Note the page + what overflows.**

---

## Stop-the-line items

Halt and report to me if any of these fail:
- Any page white-screens on load
- Any **Refused to execute inline script** CSP error in Console
- Any client sees another client's data (even briefly)
- Password reset email doesn't arrive
- Saving a form field loses data on refresh
- Sentry doesn't fire for deliberate errors

---

## Green light criteria

✅ All Phase 1–7 boxes checked
✅ No stop-the-line items triggered
✅ Phase 8 mobile has no horizontal scroll on primary flows

If all ✅ — you're ready to invite your first real client.
