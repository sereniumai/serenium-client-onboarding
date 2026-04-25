# Serenium Onboarding Portal — Launch Checklist

Last updated: 2026-04-24
Owner: Adam (founder)
Goal: ship to the first 5 paying clients with confidence.

---

## 1. Launch-blocking (do these first, in order)

### 1.1 Resend / email invites
Invitation links are currently copy-paste. The Resend edge functions are scaffolded but not deployed. Without this, you can't onboard a client without manually sending them a link.

- [ ] Confirm Resend API key set in Supabase secrets (`RESEND_API_KEY`)
- [ ] Confirm sender domain (`sereniumai.com`) verified in Resend dashboard
- [ ] Deploy `send-invitation` edge function (`supabase functions deploy send-invitation`)
- [ ] Deploy `send-team-notification` edge function
- [ ] Wire `db.createInvitation` to actually call the deployed function (not just store the row)
- [ ] Test: create a dummy client → invite → check inbox in 30s
- [ ] Test: invite link works on first click and expires correctly after use
- [ ] Test: re-sending an invite invalidates the old link

### 1.2 Concurrent edit safety (presence indicator)
Multiple people on the same client account can step on each other today. Last-write-wins on autosave, no warning.

- [ ] Add Supabase Realtime presence to module pages
- [ ] Show subtle "Someone else is editing this section" banner when 2+ users open the same module/service
- [ ] Test by opening the same module in 2 browsers as 2 different users on the same org

### 1.3 End-to-end smoke test
Walk-through with no shortcuts, on production (`clients.sereniumai.com`).

See full test plans in sections 4 (Admin) and 5 (Client) below.

### 1.4 Final content sweep
- [ ] Re-read every service's `description` and `marketingDescription` after the work this session
- [ ] Re-read every module's `whyWeAsk` (when written, see section 2.1)
- [ ] Re-read every module's `instructions` for tone consistency
- [x] No em dashes anywhere (`grep -r "—" src/config/modules.ts` should return nothing)

---

## 2. Content debt (the differentiator)

### 2.1 "Why we ask this" — remaining ~45 modules
Infrastructure is built; copy is what's missing. 6 modules already seeded as voice examples. Pattern: one-sentence answer to *"why does Serenium need this?"* — outcome-focused, never just "for our records."

Modules still needing copy:
- [x] business_profile.services_offered
- [x] business_profile.unique_selling_points
- [x] business_profile.financing
- [x] business_profile.team_members
- [x] business_profile.main_business_email
- [x] business_profile.physical_address
- [x] business_profile.business_hours_module
- [x] business_profile.legal_business_name
- [x] business_profile.social_profiles
- [x] business_profile.year_founded
- [x] business_profile.tagline
- [x] facebook_ads.prerequisites
- [x] facebook_ads.grant_access
- [x] google_ads.account_state
- [x] google_ads.customer_id
- [x] google_ads.mcc_link
- [x] google_business_profile.profile_state
- [x] google_business_profile.ownership
- [x] google_business_profile.manager_access
- [x] ai_sms.purpose_goal
- [x] ai_sms.operational
- [x] ai_sms.emergency_handling
- [x] ai_sms.casl
- [x] ai_sms.booking
- [x] ai_sms.booking_notifications
- [x] ai_sms.ghl_calendar_setup
- [x] ai_receptionist.purpose_goal
- [x] ai_receptionist.email_summaries
- [x] ai_receptionist.human_transfer
- [x] ai_receptionist.emergency_handling
- [x] ai_receptionist.phone_number_setup
- [x] website.purpose_goal
- [x] website.brand_and_design
- [x] website.brand_assets
- [x] website.lead_form_and_routing
- [x] website.domain_and_hosting
- [x] website.cms_access
- [x] website.analytics_and_search_console

### 2.2 Service description sweep
- [ ] Walk every service description for tone alignment with the "FOMO outcome" voice
- [ ] Walk every module's `description` (the short one) for "what we need" voice

---

## 3. Nice-to-have polish (post-launch is fine)

- [ ] Per-module Adam intro videos (slot into existing Step Videos admin page)
- [ ] Live "what we're working on" feed in the portal (admin posts updates, client sees them on dashboard)
- [ ] Refer-a-friend prompt after first monthly report
- [ ] Export-all-data button on client account page (PIPEDA right-of-portability)
- [ ] **Service-added notification email** — when admin enables a new service on an existing client, fire an email to the client: "Adam added [Service] to your plan. Log in to give us the info we need to launch it." Should include a deep-link to the new service. New Resend template + trigger when `organization_services` row is inserted post-creation.

---

## 4. ADMIN testing checklist

Do every step on production (`clients.sereniumai.com`) signed in as `contact@sereniumai.com`. Use a clean Chrome profile to avoid stale state.

### 4.1 Auth + dashboard
- [ ] Log out, log back in. Lands on `/admin` (not `/admin/clients/test`)
- [ ] Admin home shows correct counts (All / In onboarding / Live)
- [ ] Search by business name returns hits
- [ ] Search by primary contact email returns hits
- [ ] Search by phone returns hits
- [ ] Sort by Business / Contact / Status all work in both directions
- [ ] Clicking a stat card filters the table
- [ ] Clicking a row's "View →" opens the client detail
- [ ] System status pill (top-right) is green; clicking goes to diagnostics

### 4.2 New client wizard
- [ ] Click "New client". Wizard opens.
- [ ] Fill business name → slug auto-generates
- [ ] Pick services (toggle each on/off). Business Profile is mandatory.
- [ ] Per-service: toggle individual modules on/off
- [ ] Add primary user (full name + email)
- [ ] Save. Client appears in list with status "onboarding"

### 4.3 Client detail — Overview
- [ ] Overview tab shows correct progress
- [ ] Hidden/disabled modules don't appear in counts
- [ ] Health pill (fresh/healthy/stalled) reflects last-touched accurately
- [ ] Activity log shows recent actions
- [ ] Notes can be added, edited, deleted

### 4.4 Client detail — Services tab
- [ ] Disabled service is greyed out, can be re-enabled
- [ ] Disabling a service reflects on client portal in <30s (refetch on toggle)
- [ ] Per-module toggles disable individual modules without killing the whole service
- [ ] Per-field toggles disable specific fields without breaking conditional logic
- [ ] Toggle Business Profile off → client sees no Business Profile module

### 4.5 Client detail — Users tab
- [ ] Add user (full name + email + role)
- [ ] Generate invite link → copy
- [ ] Open invite link in incognito → lands on register page
- [ ] Resending an invite kills the old link
- [ ] Remove user → can no longer log in

### 4.6 Impersonation
- [ ] Click "View as client" → enter client's portal as them
- [ ] Banner shows "Impersonating [client]"
- [ ] All client data shows correctly
- [ ] Click "Stop impersonating" → returns to admin

### 4.7 Reports manager
- [ ] Create monthly report (month, video URL, summary, file uploads)
- [ ] Edit report
- [ ] Delete report (confirms first)
- [ ] Client sees the report once status flips to "live"

### 4.8 Welcome video manager
- [ ] Paste Vimeo / Loom / YouTube URL → live preview
- [ ] "Preview as client" opens the modal
- [ ] "Reset for all clients" wipes welcomed_users (use during testing only)
- [ ] Save → next client login plays it once
- [ ] Clear video → sidebar "Welcome video" entry disappears

### 4.9 Step videos manager
- [ ] Add a video URL for a specific module
- [ ] Confirm video shows on that module page (not on others)
- [ ] Delete video → module falls back to default `videoUrl` from config

### 4.10 Follow-ups settings
- [ ] Configure each trigger (signup, first-login, stalled, completion)
- [ ] Toggle CASL-compliant copy (mandatory in CA)
- [ ] Test trigger sends a real email (use staging or your own email)

### 4.11 AI conversations admin view
- [ ] See all clients' Aria conversations
- [ ] Click into a thread → read messages
- [ ] Filter by client / date

### 4.12 Diagnostics
- [ ] Page loads, all checks green
- [ ] Failing check displays the underlying error clearly

### 4.13 Sign-out
- [ ] Sign out from sidebar → redirects to login
- [ ] Cannot access `/admin` after sign-out without re-auth

---

## 5. CLIENT testing checklist

Run as a real client. Create a test org via admin, copy the invite link, open in a fresh incognito window.

### 5.1 First-login experience
- [ ] Invite link → register page, email pre-filled
- [ ] Set password, name → lands on portal
- [ ] Welcome video modal plays automatically (premium framing, founder note)
- [ ] Close welcome video → it doesn't reappear on subsequent logins
- [ ] Welcome video reachable from sidebar afterwards

### 5.2 Dashboard
- [ ] Greeting uses first name + time of day (Good morning/afternoon/evening)
- [ ] Org name + status pill display correctly
- [ ] Resume button shows "Continue · [last touched module]"
- [ ] Resume button click goes straight to that module
- [ ] Service cards show: icon, name, "what we need" description, progress count
- [ ] Service card hover lifts subtly
- [ ] More from Serenium shows ONLY services not in plan (no Business Profile)
- [ ] Each upsell row uses the marketing description
- [ ] "Ask about adding one" mailto opens with pre-filled subject

### 5.3 Sidebar (client during onboarding)
- [ ] Logo readable (black in light mode, white in dark)
- [ ] Each enabled service in sidebar with X/Y badge
- [ ] Active page is orange-highlighted
- [ ] Ask Aria opens chat, no orange "active" state
- [ ] Welcome video opens modal
- [ ] Account row shows User icon + name
- [ ] Theme toggle button switches dark↔light, persists across reload
- [ ] Sign out works
- [ ] Build hash visible at bottom

### 5.4 Light mode pass
- [ ] Toggle to light mode
- [ ] Logo flips to black
- [ ] All headings still readable
- [ ] All body text still readable (especially info panels with orange tint)
- [ ] Welcome modal looks right (white card, not black)
- [ ] More from Serenium row visible
- [ ] Aria threads list visible
- [ ] Module page Why-we-ask panel readable

### 5.5 Service page
- [ ] Hero shows service label + description
- [ ] Autosave banner is `text-sm`, matches info-panel size
- [ ] Each module rendered as a section with index, title, fields
- [ ] Required fields marked with orange asterisk
- [ ] Field labels are `text-sm` size, readable
- [ ] Help text under fields is readable
- [ ] Bottom CTA: disabled "X of Y sections done" until ready, then orange "Complete [Service]" button
- [ ] Clicking Complete fires confetti and returns to dashboard

### 5.6 Module page
- [ ] Loads via direct deep link (`/onboarding/[slug]/services/[svc]/[mod]`)
- [ ] Curriculum sidebar (left) only shows ONE service expanded at a time
- [ ] Clicking another service in curriculum collapses the previous
- [ ] Step number + title + estimated minutes correct
- [ ] "Why we ask this" panel renders when content is set
- [ ] Module video (if set) embeds and plays
- [ ] Instructions render markdown correctly (bold, lists, links)
- [ ] Conditional links appear only when their field matches
- [ ] Tasks: tickable, persist across reload
- [ ] All field types render: text, textarea, email, phone, number, url, select, multiselect, color, checkbox, file, file_multiple, repeatable, weekly_availability, info
- [ ] Field validation: required-but-empty shows error, invalid email shows error, etc.
- [ ] Autosave indicator shows "Saving" → "All changes saved"

### 5.7 Field-level edit safety (we just fixed this)
- [ ] Complete a module by filling every required field
- [ ] No confetti fires (only at full-service complete)
- [ ] Edit a field on the completed module
- [ ] No confetti, no overlay, no nav bounce
- [ ] Field saves, banner remains "Module complete"

### 5.8 Conditional logic
- [x] business_profile.emergency_service → "Yes" unlocks AI SMS / AI Receptionist emergency handling modules
- [x] business_profile.emergency_service → "No" hides those
- [x] google_business_profile.profile_state → "Yes verified" unlocks ownership + manager_access
- [ ] "Yes unverified" → ownership only (manager_access stays hidden)
- [ ] "No" / "Not sure" → just shows the help message, no further modules

### 5.9 File uploads
- [ ] Single file: drag-drop and click-to-pick both work
- [ ] Multi-file: shows thumbnails / file names
- [ ] Max size enforced (10 MB)
- [ ] Wrong file type rejected
- [ ] Uploaded file persists across reload
- [ ] Delete uploaded file works

### 5.10 Aria chat
- [ ] Floating "Ask Aria" pill button visible bottom-right
- [ ] Click → chat opens with Aria's welcome bubble greeting by first name
- [ ] Suggestion chips are service-specific (based on enabled services)
- [ ] Send a message → reply within ~5s
- [ ] Markdown renders correctly in replies
- [ ] Click `+` (new chat) → reuses any empty thread, otherwise creates one
- [ ] Click MessagesSquare icon → threads list opens
- [ ] Threads grouped by Today / Yesterday / This week / Older
- [ ] Search threads (when 5+ exist)
- [ ] Active thread has orange left accent bar
- [ ] Delete thread → confirmation dialog → removed
- [ ] Switch threads → messages load instantly
- [ ] Minimize → re-open → conversation persists

### 5.11 Onboarding completion path
- [ ] Complete every module across every enabled service
- [ ] Final celebration overlay fires once everything is 100%
- [ ] Status flips to "pending review"
- [ ] Admin sees status change
- [ ] Admin flips to "live" → client sees reports view next login

### 5.12 Reports view (post-onboarding)
- [ ] Sidebar collapses to: Dashboard, Monthly reports, Ask Aria
- [ ] Latest report hero on dashboard
- [ ] Reports list page shows all months
- [ ] Click report → video plays, summary visible, file downloads work
- [ ] Aria chat still available

### 5.13 Mobile (real device, not just devtools)
- [ ] iPhone Safari: all pages render, no horizontal scroll
- [ ] Android Chrome: same
- [ ] Sidebar collapses to hamburger
- [ ] Aria chat fits within viewport
- [ ] File upload works from camera roll
- [ ] Forms fillable on small screens

### 5.14 Edge cases
- [ ] Sign out mid-form → re-login → form values preserved
- [ ] Two tabs open, edit in one, refresh other → second tab catches up
- [ ] Slow network: throttle to 3G, confirm autosave doesn't double-save
- [ ] Large file upload doesn't crash
- [ ] Browser back button works without losing data
- [ ] Direct-link to a locked module redirects sensibly

---

## 6. Sign-off

Once everything in sections 1, 4, and 5 is checked:

- [ ] All five real client orgs created in admin
- [ ] All five primary contacts have received working invites
- [ ] All five have logged in at least once
- [ ] Status of `clients.sereniumai.com` page is green
- [ ] Adam: I'm comfortable launching publicly
