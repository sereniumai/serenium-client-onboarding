# Serenium Portal — Ops Runbook

**When something breaks, start here.** This is the "client emailed me, panic stations, what do I check first" document.

---

## 🔎 First 60 seconds of ANY issue

1. Open [admin diagnostics](https://clients.sereniumai.com/admin/diagnostics) — shows live status of health endpoint, Supabase, auth, Anthropic, Resend.
2. Check [Sentry Issues](https://sentry.io) — are there error spikes in the last 30 min?
3. Check [UptimeRobot](https://uptimerobot.com) — is the health endpoint green?
4. Check [Vercel dashboard](https://vercel.com) — most recent deploy green, or is there a failing build?

If 1-4 all look fine, the problem is probably client-side (their browser, their network) or they're doing something we didn't expect.

---

## 📛 Common issues

### "I can't log in"

Order of checks:
1. **Are they using the right email?** Most common cause. Ask them to double-check the email the invite was sent to.
2. **Did they finish registration?** Check in Supabase → Auth → Users — does the email exist? If not, they didn't complete the invite flow. Send them the original invite link from the admin UI.
3. **Is the invitation expired?** Check `/admin/clients/<their-org>` → Users tab. If invite is expired, delete the old one and create a fresh one.
4. **Password reset.** Have them use "Forgot password" on the login page. They'll get an email with a link. Link is valid for 1 hour.
5. **Profile row missing?** In Supabase SQL editor: `select count(*) from profiles where id in (select id from auth.users);` — if count mismatches auth.users, the auth trigger may have misfired. Run the backfill SQL from `supabase/migrations/20260501000003_auth_trigger.sql`.

### "I can't see my dashboard / the page is blank"

1. Ask them to hard-refresh (Cmd/Ctrl + Shift + R).
2. Check Sentry for their session — search by user email.
3. Common cause: they're not a member of any org. In Supabase SQL editor:
   ```sql
   select * from organization_members where user_id = '<their-user-id>';
   ```
   If empty, the invite wasn't fully accepted. Re-send.

### "My email invite never arrived"

1. Check [Resend dashboard](https://resend.com/emails) → search their address. Did it send?
2. If sent but not received: spam folder; Gmail promotions tab; check Resend for bounce/block.
3. If NOT sent: check `/api/send-invitation` logs in Vercel → Functions. Most common cause: `RESEND_API_KEY` missing from prod env.
4. Manual fallback: in admin UI, click "Copy invite link" and paste into a new email yourself.

### "The AI assistant says nothing / empty reply"

1. Check [Anthropic dashboard](https://console.anthropic.com) — spend cap hit?
2. Check Vercel Functions logs for `/api/ask-assistant` — look for 429 (rate limit), 401 (bad key), timeout.
3. Common cause: `ANTHROPIC_API_KEY` missing or invalid. Verify in Vercel env.

### "File upload fails"

1. Check file size — limit is 10 MB for uploads, 25 MB for report files.
2. Check file type — only images, PDFs, and common docs.
3. Check Supabase Storage → bucket exists + RLS policies attached?

### "The site is down"

1. UptimeRobot will email you before you see this. Check [status.vercel.com](https://www.vercel-status.com) — is Vercel down?
2. Check [status.supabase.com](https://status.supabase.com) — is Supabase down?
3. Recent deploy broke something? Vercel → Deployments → revert to last known good.

### "A client saw another client's data"

**STOP. Escalate immediately. Record everything.**
1. Screenshot what they saw.
2. Do NOT deploy anything until you've traced the leak.
3. Check RLS policies — is the RLS helper `is_org_member(org_id)` returning true when it shouldn't?
4. Check Sentry — any errors mentioning role bypass?
5. Breach notification: within 72 hours notify the OPC and affected clients per Privacy Policy §7. This is a legal obligation under PIPEDA.

---

## 🔧 Useful one-liners

### Check which migrations have been applied
In Supabase SQL editor:
```sql
select version, name, executed_at
from supabase_migrations.schema_migrations
order by executed_at desc limit 20;
```

### Resend a verification email to a user
In Supabase → Auth → Users → find user → "Send magic link" or "Send password reset."

### Force-sign-out a specific user (revoke all their tokens)
In Supabase SQL editor:
```sql
-- Revokes all refresh tokens for this user:
update auth.refresh_tokens set revoked = true where user_id = '<user-id>';
```

### See a client's recent activity
```sql
select al.*, p.full_name
from activity_log al
left join profiles p on p.id = al.user_id
where al.organization_id = '<org-id>'
order by al.created_at desc limit 50;
```

### Check invitation state
```sql
select email, accepted_at, expires_at, token
from invitations
where organization_id = '<org-id>'
order by created_at desc;
```

---

## 🛠 Where things live

| Thing | Where |
|---|---|
| Live portal | https://clients.sereniumai.com |
| Admin view | https://clients.sereniumai.com/admin |
| Diagnostics page | https://clients.sereniumai.com/admin/diagnostics |
| Supabase project | https://supabase.com/dashboard |
| Vercel project | https://vercel.com/dashboard |
| Resend dashboard | https://resend.com |
| Sentry | https://sentry.io |
| UptimeRobot | https://uptimerobot.com |
| Anthropic console | https://console.anthropic.com |
| GitHub repo | https://github.com/sereniumai/serenium-client-onboarding |

---

## 🆘 Nuclear options (only if necessary)

### Roll back a bad deploy
Vercel → Deployments → find last green deploy → "Promote to Production."

### Pause all email sending
In Vercel env vars → set `RESEND_API_KEY` to `disabled` → redeploy. All email functions return 503. Remember to revert.

### Lock everyone out (emergency)
In Supabase → Auth → Settings → disable signup + sign-ins. Only use if you suspect an active breach.

---

## 📞 If you're stuck

- **Paid support:** Supabase Pro ($25/mo when upgraded) includes email support with ~24h response.
- **Vercel:** Free tier has community support only. Paid plans get email support.
- **Last resort:** `contact@sereniumai.com` admin console access — keep this login in 1Password with 2FA.
