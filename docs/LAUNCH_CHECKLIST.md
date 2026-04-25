# Serenium Onboarding Portal — Launch Checklist

Last updated: 2026-04-24
Owner: Rob (founder)
Goal: ship to the first 5 paying clients with confidence.

How to use this doc: work top-to-bottom. Each section is a single sitting. Anything checked is verified, working, on prod. We test together — Rob clicks, Claude watches for issues.

---

## 1. Launch-blockers — must be done before any real client gets an invite

### 1.1 Email infrastructure (Resend)
Status: wired and tested with a real signup.

- [x] `RESEND_API_KEY` set in Vercel
- [x] Sender domain `sereniumai.com` verified in Resend
- [x] `send-invitation` deployed and sends real emails
- [x] `send-team-notification` deployed
- [x] `log-aria-escalation` deployed (new — Aria flag-to-team button)
- [x] Invite link works on first click, lands on register
- [ ] Test: re-sending an invite invalidates the old link
- [ ] Test: invitation email "From" name shows "Rob from Serenium" (Rob's profile.full_name set to "Rob Page" in Account)

### 1.2 Aria escalation flow (just shipped — needs full test)
- [ ] Sign in as a test client
- [ ] Ask Aria something Serenium-internal: "What's my AI receptionist phone number?"
- [ ] Confirm she answers + a "Flag this to the Serenium team" button appears below her message
- [ ] Click button → toast confirms "Flagged. The team will email you."
- [ ] Check team inbox: email arrives with question + Reply-by-email + Open-in-admin buttons
- [ ] Open `/admin` → orange banner shows the open flag
- [ ] Click Resolve → banner clears
- [ ] On `/admin/clients/[slug]?tab=flagged` → resolved item visible in Resolved section, can be reopened
- [ ] Negative test: ask Aria a normal question ("how do I add Serenium to GBP") → NO button appears, NO email
- [ ] Negative test: send a confused single message ("I don't get it") → NO button (she tries another angle)
- [ ] Repeat-stuck test: 4+ back-and-forth on same blocker, each saying "still not working" → button eventually appears

### 1.3 Concurrent edit safety
Two people on the same client account today step on each other. Last-write-wins on autosave, no warning.

- [ ] Decide approach: simplest is a Supabase Realtime presence indicator on the module page ("Sarah is also editing this section")
- [ ] Add presence channel keyed by `org:module`
- [ ] Subtle banner top-right when 2+ users open same module
- [ ] Test: two browsers, two users, same module → banner appears within ~1s

### 1.4 Final content sweep
- [ ] Re-read every service `description` and `marketingDescription`
- [ ] Re-read every module `whyWeAsk` (all 38 written, but read end-to-end as a real client would)
- [ ] Re-read every module `instructions` for tone consistency
- [x] No em dashes in `src/config/modules.ts`

---

## 2. Step-by-step smoke test (do together, top to bottom, on prod)

Use a clean Chrome profile. Open `clients.sereniumai.com`. Rob drives, Claude verifies as we go.

### 2.1 Admin path (sign in as contact@sereniumai.com)

1. [ ] Sign in → lands on `/admin`
2. [ ] Click "New client" → wizard opens
3. [ ] Fill business name → slug auto-generates
4. [ ] Pick services (toggle each, Business Profile no longer mandatory)
5. [ ] Per-service: toggle modules off
6. [ ] Step 3: primary contact auto-shown as locked owner card
7. [ ] Add 1 extra user to test extras list
8. [ ] Save → client appears with status "onboarding"
9. [ ] Open the new client → Overview tab loads
10. [ ] Click each tab in turn: Services, Submitted info, Progress, Reports, Activity, AI chats, Flagged, Users — every tab loads without error
11. [ ] Users tab: generate invite link, copy it
12. [ ] Open invite link in incognito window → register page, email pre-filled
13. [ ] Click "Send invite email" instead → real email lands within 30s
14. [ ] Impersonation: click "View as client" → enters portal as them, banner shows
15. [ ] Stop impersonating → returns to admin
16. [ ] Send follow-up email → arrives correctly
17. [ ] System status pill is green; click → diagnostics page loads, all checks green
18. [ ] Sign out → cannot reach `/admin` without re-auth

### 2.2 Client path (use the real invite from step 13 above, in a fresh incognito window)

19. [ ] Click invite link → register page
20. [ ] Set password + name → lands on portal
21. [ ] Welcome video modal plays automatically
22. [ ] Close it → does NOT reappear on subsequent loads
23. [ ] Welcome video reachable from sidebar afterwards
24. [ ] Dashboard greeting uses first name + correct time of day
25. [ ] Portal status pill above business name in hero
26. [ ] Resume button shows "Continue · [first module]"
27. [ ] Service cards show icon, name, "what we need" copy, progress count
28. [ ] More from Serenium shows ONLY services not in plan, with marketing copy
29. [ ] "Ask about adding one" mailto opens correctly

### 2.3 Sidebar + theme

30. [ ] All enabled services visible with X/Y badges
31. [ ] Active page is orange-highlighted; inactive items are not
32. [ ] Click "Ask Aria" → chat opens, no orange active state on the menu item
33. [ ] Account row shows User icon + name + chevron
34. [ ] Theme toggle button switches dark↔light, persists across reload
35. [ ] Light mode: logo flips black, all text readable, info panels readable
36. [ ] Dark mode: same checks
37. [ ] Sign out button works

### 2.4 Onboarding flow

38. [ ] Click into Business Profile → service page loads
39. [ ] Curriculum sidebar (left) only shows ONE service expanded at a time
40. [ ] Click a different service in curriculum → previous collapses
41. [ ] Open a module → "Why we ask this" panel renders
42. [ ] Module video embeds (if set)
43. [ ] Instructions render markdown correctly
44. [ ] Conditional links appear only when their field matches
45. [ ] Tasks tickable, persist across reload
46. [ ] Fill every required field across every field type:
    - text, textarea, email, phone, number, url
    - select, multiselect, color, checkbox
    - file, file_multiple
    - repeatable, weekly_availability, info
47. [ ] Required-but-empty shows error
48. [ ] Invalid email / phone / URL shows error
49. [ ] Autosave indicator shows "Saving" → "All changes saved"
50. [ ] Complete a module → no confetti yet (only at service complete)
51. [ ] Edit a field on the completed module → no confetti, no overlay, no bounce
52. [ ] Bottom CTA on service page: disabled "X of Y sections done" until ready, then orange "Complete [Service]"
53. [ ] Click Complete → confetti fires, returns to dashboard

### 2.5 Conditional logic

54. [ ] `business_profile.emergency_service` = Yes → unlocks AI SMS + AI Receptionist emergency modules
55. [ ] = No → hides them
56. [ ] `google_business_profile.profile_state` = Yes verified → unlocks ownership + manager_access
57. [ ] = Yes unverified → ownership only
58. [ ] = No / Not sure → help message only

### 2.6 File uploads

59. [ ] Single file: drag-drop works
60. [ ] Single file: click-to-pick works
61. [ ] Multi-file: thumbnails / names show
62. [ ] Wrong file type rejected
63. [ ] Max size (10 MB) enforced
64. [ ] Uploaded file persists across reload
65. [ ] Delete uploaded file works

### 2.7 Aria chat (full pass)

66. [ ] Floating "Ask Aria" pill visible bottom-right
67. [ ] Click → welcome bubble greets by first name
68. [ ] Suggestion chips are service-specific
69. [ ] Send normal question → reply within ~5s, NO flag button
70. [ ] Send "I want to talk to someone" → flag button appears
71. [ ] Click flag button → toast + email + admin banner (verify all three)
72. [ ] `+` button reuses empty thread if one exists
73. [ ] Threads list opens, grouped by Today / Yesterday / This week / Older
74. [ ] Search threads (5+ threads required to show)
75. [ ] Active thread has orange left accent
76. [ ] Delete thread → confirm dialog → removed
77. [ ] Switch threads → messages load
78. [ ] Minimize → re-open → state preserved

### 2.8 Onboarding completion

79. [ ] Complete every module across every enabled service
80. [ ] Final celebration overlay fires once everything is 100%
81. [ ] Status auto-flips appropriately
82. [ ] Admin can flip to "live"
83. [ ] Client logs in next time → sees reports view (post-onboarding mode)

### 2.9 Mobile (real iPhone + Android, not devtools)

84. [ ] iPhone Safari: all pages render, no horizontal scroll
85. [ ] Android Chrome: same
86. [ ] Sidebar collapses to hamburger
87. [ ] Aria chat fits within viewport
88. [ ] File upload works from camera roll
89. [ ] Forms fillable on small screens

### 2.10 Edge cases

90. [ ] Sign out mid-form → re-login → form values preserved
91. [ ] Two tabs open, edit in one, refresh other → second tab catches up
92. [ ] Throttle to 3G → autosave doesn't double-save
93. [ ] Browser back button works without losing data
94. [ ] Direct-link to a locked module redirects sensibly

---

## 3. Nice-to-have polish (post-launch is fine, log here so we don't lose them)

- [ ] Per-module Adam intro videos (Step Videos admin page already exists)
- [ ] Live "what we're working on" feed in the portal
- [ ] Refer-a-friend prompt after first monthly report
- [ ] Export-all-data button on client account page (PIPEDA portability)
- [ ] **Service-added notification email** — when admin enables a new service on an existing client, fire email "Adam added [Service] to your plan, log in to give us what we need". New Resend template + trigger on `organization_services` insert post-creation.
- [ ] Two-way human chat in Aria thread (currently: team replies by email; consider in-portal once we see how often clients want it)

---

## 4. Sign-off

Once everything in sections 1 and 2 is checked:

- [ ] All five real client orgs created in admin
- [ ] All five primary contacts have received working invites
- [ ] All five have logged in at least once
- [ ] Status of `clients.sereniumai.com` is green
- [ ] Rob: I'm comfortable launching publicly
