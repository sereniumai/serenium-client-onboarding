// Branded HTML email templates, Serenium dark + orange aesthetic.
// Rendered inline so every email client can display without external CSS.

const bg = '#0A0706';
const card = '#141010';
const orange = '#FF6B1F';
const border = 'rgba(255,255,255,0.08)';
const muted = 'rgba(255,255,255,0.65)';

function shell(innerHtml: string, preview: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <style>
      body { margin: 0; padding: 0; background: ${bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #fff; }
      a { color: ${orange}; text-decoration: none; }
      .preview { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; }
    </style>
  </head>
  <body>
    <span class="preview">${preview}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bg}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
            <tr>
              <td style="padding: 0 0 28px 0;">
                <div style="font-weight: 900; font-size: 20px; letter-spacing: -0.03em; color: #fff;">
                  SEREN<span style="color: ${orange};">I</span>UM
                </div>
              </td>
            </tr>
            <tr>
              <td style="background: ${card}; border: 1px solid ${border}; border-radius: 16px; padding: 32px;">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 0; color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; line-height: 1.6;">
                Sent by <strong style="color: rgba(255,255,255,0.6);">Serenium AI Inc.</strong> · Cochrane, Alberta, Canada<br />
                <a href="mailto:contact@sereniumai.com" style="color: rgba(255,255,255,0.5);">contact@sereniumai.com</a> · <a href="https://clients.sereniumai.com/privacy" style="color: rgba(255,255,255,0.5);">Privacy</a> · <a href="https://clients.sereniumai.com/terms" style="color: rgba(255,255,255,0.5);">Terms</a><br />
                <span style="color: rgba(255,255,255,0.3);">You're receiving this as part of your Serenium client onboarding.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr><td>
      <a href="${href}" style="display: inline-block; background: ${orange}; color: #fff; font-weight: 600; font-size: 14px; padding: 14px 28px; border-radius: 10px; text-decoration: none;">${label}</a>
    </td></tr>
  </table>`;
}

export function invitationEmail({
  fullName, businessName, inviterName, acceptUrl,
}: { fullName?: string; businessName: string; inviterName?: string; acceptUrl: string }): { subject: string; html: string } {
  const subject = `${inviterName ? `${inviterName.split(' ')[0]} from Serenium` : 'Serenium'} just invited you to start your onboarding 🚀`;
  const hello = fullName ? fullName.split(' ')[0] : 'there';
  const inviter = inviterName ? `${inviterName.split(' ')[0]} from Serenium` : 'Your Serenium team';
  const html = shell(`
    <p style="font-size: 13px; color: ${orange}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; margin: 0 0 12px;">Welcome aboard</p>
    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 16px;">Let's go, ${hello}.</h1>
    <p style="color: ${muted}; line-height: 1.6; margin: 0 0 12px;">${inviter} just set up your private client portal. This is where the work happens, and where everything we build for ${businessName} comes together.</p>
    <p style="color: ${muted}; line-height: 1.6; margin: 0 0 12px;">Log in any time, save as you go, pick up exactly where you left off.</p>
    <p style="color: ${muted}; line-height: 1.6; margin: 0 0 16px;">We're genuinely excited to get started. Click below to set your password and dive in.</p>
    ${button(acceptUrl, 'Open your portal')}
    <p style="color: rgba(255,255,255,0.45); font-size: 13px; line-height: 1.6; margin: 24px 0 0;">Stuck or have a question before you start? Just reply to this email, a real human reads it.</p>
    <p style="color: rgba(255,255,255,0.35); font-size: 12px; margin: 16px 0 0;">Link valid for 14 days. Or paste this into your browser:<br /><span style="color: ${muted}; word-break: break-all;">${acceptUrl}</span></p>
  `, `Your Serenium client portal for ${businessName} is ready`);
  return { subject, html };
}

export function passwordResetEmail({ resetUrl }: { resetUrl: string }): { subject: string; html: string } {
  const subject = 'Reset your Serenium password';
  const html = shell(`
    <p style="font-size: 13px; color: ${orange}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; margin: 0 0 12px;">Password reset</p>
    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 16px;">Reset your password.</h1>
    <p style="color: ${muted}; line-height: 1.6; margin: 0 0 4px;">Click the button below to choose a new password. This link is valid for 1 hour and can only be used once.</p>
    ${button(resetUrl, 'Choose new password')}
    <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 24px 0 0;">If you didn't ask for this, you can ignore this email, your password stays the same.</p>
  `, 'Reset your Serenium password');
  return { subject, html };
}

export function milestoneEmail({
  fullName, businessName, percent, dashboardUrl,
}: { fullName?: string; businessName: string; percent: number; dashboardUrl: string }): { subject: string; html: string } {
  const hello = fullName ? fullName.split(' ')[0] : 'there';
  let headline: string;
  if (percent >= 100) headline = "You're all set.";
  else if (percent >= 75) headline = `${percent}% there, the final stretch.`;
  else if (percent >= 50) headline = `Halfway there.`;
  else headline = `You're off to a solid start.`;

  const subject = percent >= 100 ? `${businessName} is live on Serenium` : `${percent}% through onboarding`;
  const html = shell(`
    <p style="font-size: 13px; color: ${orange}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; margin: 0 0 12px;">${percent >= 100 ? 'Onboarding complete' : 'Milestone'}</p>
    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 16px;">${percent >= 100 ? `Nice work, ${hello}.` : headline}</h1>
    <p style="color: ${muted}; line-height: 1.6; margin: 0 0 4px;">${percent >= 100
      ? `We've got everything we need to launch ${businessName}. From here you'll get a monthly report walking you through performance, wins, and what's next.`
      : `${businessName} is <strong style="color: #fff;">${percent}%</strong> through onboarding. Keep the momentum going.`}</p>
    ${button(dashboardUrl, percent >= 100 ? 'View your dashboard' : 'Continue where you left off')}
  `, percent >= 100 ? `${businessName} is live on Serenium` : `${percent}% through onboarding`);
  return { subject, html };
}

export function stalledNudgeEmail({
  fullName, businessName, daysSinceActivity, dashboardUrl,
}: { fullName?: string; businessName: string; daysSinceActivity: number; dashboardUrl: string }): { subject: string; html: string } {
  const hello = fullName ? fullName.split(' ')[0] : 'there';
  const subject = `Your Serenium onboarding for ${businessName}`;
  const html = shell(`
    <p style="font-size: 13px; color: ${orange}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; margin: 0 0 12px;">Quick nudge</p>
    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 16px;">Hey ${hello}, still with us?</h1>
    <p style="color: ${muted}; line-height: 1.6; margin: 0 0 4px;">It's been ${daysSinceActivity} days since we saw you in the ${businessName} portal. The sooner we have everything, the sooner your campaigns go live.</p>
    <p style="color: ${muted}; line-height: 1.6; margin: 16px 0;">If anything's blocking you, hit reply, we'll jump on a call.</p>
    ${button(dashboardUrl, 'Pick up where you left off')}
  `, `Pick up your ${businessName} onboarding`);
  return { subject, html };
}
