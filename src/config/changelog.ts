/**
 * "What's new" for the admin team. Add entries to the top.
 *
 * Format:
 *   { date: 'YYYY-MM-DD', title: 'Short headline', body: 'One or two sentences.' }
 *
 * The bell icon in the admin nav shows a dot until the latest entry's date
 * matches `lastSeenChangelog` in localStorage. Clients never see this.
 */
export interface ChangelogEntry {
  date: string;
  title: string;
  body: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-04-23',
    title: 'Autosave indicator + per-module confetti',
    body: 'The save indicator now shows "All changes saved" as a resting state. Every module submission fires a small confetti burst so clients feel progress.',
  },
  {
    date: '2026-04-23',
    title: 'Three-phase dashboard',
    body: 'Clients now see their onboarding grouped under three phases (Business → Presence → AI team) with rollup progress. Phases auto-hide if their services are disabled.',
  },
  {
    date: '2026-04-23',
    title: '"What does this mean?" tooltips',
    body: 'Added a ? tooltip next to field labels for high-value fields (emergency service, warranty, financing, Google Ads, receptionist routing).',
  },
  {
    date: '2026-04-23',
    title: 'AI rate limiting',
    body: 'Ask-assistant endpoint now caps at 20 messages per 5 minutes per IP. Friendly 429 message, no hard block.',
  },
  {
    date: '2026-04-20',
    title: 'Business Profile tightened',
    body: 'Removed duplicate/low-value fields (years_in_business, primary contact, preferred comms). Merged certifications + awards + warranty + insurance into a single "Credentials and trust" module.',
  },
];

export const LATEST_CHANGELOG_DATE = CHANGELOG[0]?.date ?? '';
