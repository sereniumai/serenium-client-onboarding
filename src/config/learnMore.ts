import type { ServiceKey } from '../types';

export interface LearnMoreStat {
  /** Big number, kept tight (e.g. "5x", "<60s", "24/7"). */
  value: string;
  /** One-line context for the stat. */
  label: string;
}

export interface LearnMoreStep {
  title: string;
  body: string;
}

export interface LearnMorePortfolioItem {
  name: string;
  url: string;
  description: string;
}

export interface LearnMoreContent {
  /** Eyebrow line above the hero. Short, punchy. */
  eyebrow: string;
  /** Big headline. Aim for 6-12 words. */
  headline: string;
  /** Sub-headline that drives the FOMO. 1-2 sentences. */
  subhead: string;
  /** Three or four punchy stats shown right under the hero. */
  stats: LearnMoreStat[];
  /** Bullet-point outcomes. Specific, concrete, roofer-flavoured. */
  outcomes: string[];
  /** Three-step "how it works" cadence. */
  process: LearnMoreStep[];
  /** A single quote-style proof block. */
  proof: { headline: string; body: string };
  /** Optional Loom URL. Leave undefined for placeholder. */
  videoUrl?: string;
  /** One-line CTA copy under the video. */
  videoCaption: string;
  /** Final pitch paragraph above the CTA. */
  closer: string;
  /** Optional portfolio of real Serenium-built work (currently Website only). */
  portfolio?: LearnMorePortfolioItem[];
}

const COMING_SOON_CAPTION = 'Quick walkthrough coming soon. Want it sooner? Hit the button below and we will send a personal one.';

export const LEARN_MORE: Partial<Record<ServiceKey, LearnMoreContent>> = {
  facebook_ads: {
    eyebrow: 'Facebook & Instagram Ads',
    headline: 'Fill your calendar with roofs, on demand.',
    subhead: 'Most roofers either burn money on bad ads or skip them entirely. We run the kind of Meta campaigns that actually book jobs, built around your service area, your offer, and the AI that follows up the second a lead lands.',
    stats: [
      { value: '<60s',    label: 'Lead replied to, every time, day or night' },
      { value: '4-7x',    label: 'Average return on ad spend across our clients' },
      { value: '$28-45',  label: 'Cost per qualified roofing lead' },
      { value: '24/7',    label: 'Campaigns optimized while you sleep' },
    ],
    outcomes: [
      'Creative built specifically for roofing, storm season, insurance work, full re-roofs, financing offers',
      'Geo-targeted to your real service zone, no wasted spend on out-of-area clicks',
      'Lead form that hands straight off to your AI SMS so the lead is contacted in under 60 seconds',
      'Weekly creative + audience tweaks based on which ads are actually producing booked appointments, not just clicks',
      'Monthly video report breaking down spend, leads, booked jobs, and what we changed',
      'Transparent ad account access, your data, your pixel, your audience, you keep it all',
    ],
    process: [
      { title: '1. Strategy + creative', body: 'We map your offer, service zone, and best-margin jobs. Then we build the ad creative, hooks, and lead form copy that match each.' },
      { title: '2. Launch + AI handoff', body: 'Campaigns go live, every form fill flows straight into your AI SMS and onto your calendar. You start fielding booked appointments inside 14 days.' },
      { title: '3. Optimize weekly', body: 'We watch which ads are converting to booked jobs (not vanity clicks) and reallocate spend accordingly. Monthly video report tells you exactly what moved.' },
    ],
    proof: {
      headline: 'A dollar in the right ad set buys you a roof. A dollar in the wrong one buys you a click.',
      body: 'Most roofers we talk to have spent thousands on ads that produced clicks and zero jobs. We exist because the gap between those two outcomes is mostly creative, targeting, and speed-to-lead, all of which are fixable.',
    },
    videoCaption: COMING_SOON_CAPTION,
    closer: 'Most of our clients see their first booked appointment within the first 10 days of launch. The longer you wait through storm season, the more roofs your competitors put on.',
  },

  google_ads: {
    eyebrow: 'Google Ads',
    headline: 'Be the first roofer they call.',
    subhead: 'When someone in your area Googles "roof leak repair near me", you should own that moment. Google Ads done right means showing up at the top, only when it counts, with copy that converts to a phone call, not a curious tab they close.',
    stats: [
      { value: '5x',    label: 'Higher conversion vs. social, search beats scroll' },
      { value: 'Top 3', label: 'Where 75% of clicks happen on the results page' },
      { value: '$0',    label: 'Wasted on tire-kicker keywords, we block them' },
      { value: '14d',   label: 'From kickoff to first booked job' },
    ],
    outcomes: [
      'Search campaigns built around the buying-intent keywords, not vanity terms',
      'Negative keyword lists that block tire-kickers, DIY searchers, and adjacent trades',
      'Call-tracking on every ad so you know which keyword booked which job',
      'Landing pages that load fast on a phone and show your phone number above the fold',
      'Competitor-conquest where it makes sense, show up when people search for the other guys',
      'Monthly report tying ad spend directly to booked revenue, not just clicks',
    ],
    process: [
      { title: '1. Keyword audit', body: 'We pull your local market data, find the high-intent terms (and the dead-ends), and build a campaign structure around what actually buys jobs.' },
      { title: '2. Build + launch', body: 'Ad copy, extensions, landing pages, call tracking. All wired up so every booked call is attributed back to a keyword we can double down on.' },
      { title: '3. Refine monthly', body: 'We cut what is not converting, scale what is. You see exactly which terms are paying for themselves in the monthly report.' },
    ],
    proof: {
      headline: 'A Google search lead is already pulling out their wallet.',
      body: 'They are not being interrupted, they are looking for you. That is why search converts at 5x social. Get the right ad in front of them at the right moment, and you do not have to do much else.',
    },
    videoCaption: COMING_SOON_CAPTION,
    closer: 'A roofing lead from Google search is worth 5x a cold lead from social. We build campaigns that grab the people already pulling out their wallet.',
  },

  google_business_profile: {
    eyebrow: 'Google Business Profile',
    headline: 'Win the map. Win the call.',
    subhead: 'Three out of four people who Google "roofer near me" never click past the map. If you are not in the top three, you are invisible. We get you there and keep you there.',
    stats: [
      { value: '76%',  label: 'Of "near me" searches turn into a call within 24h' },
      { value: 'Top 3', label: 'Map-pack ranking we target inside 60 days' },
      { value: '5x',   label: 'More direction requests vs. an unmanaged profile' },
      { value: '$0',   label: 'Ad spend, this is the biggest free-lead source going' },
    ],
    outcomes: [
      'Full profile build-out, services, photos, hours, service areas, every signal Google looks at',
      'Review-generation system that asks every happy customer at the right moment',
      'Photo strategy: before/afters, crews on roofs, drone shots, the visuals that make people pick you',
      'Posts pushed weekly so the profile looks active (Google favours active profiles)',
      'Q&A management so you control the answers, not random commenters',
      'Local search ranking reports that show how you stack up against the other roofers in town',
    ],
    process: [
      { title: '1. Profile audit', body: 'We score your profile against the top 5 roofers in your zone. You see exactly what they are doing that you are not, and what to fix first.' },
      { title: '2. Optimize + photo run', body: 'Services, categories, descriptions, photos, hours, service areas. Plus a review-request flow that runs in the background.' },
      { title: '3. Maintain weekly', body: 'Posts, photos, Q&A responses, review replies. The profile keeps climbing because we keep feeding it the signals Google rewards.' },
    ],
    proof: {
      headline: 'The map pack is the most under-rated free advertising on the planet.',
      body: 'Almost every roofer we audit has a half-finished profile, no photos past 2019, zero recent posts. Twenty hours of work and a system that maintains it puts you ahead of 90% of your local market.',
    },
    videoCaption: COMING_SOON_CAPTION,
    closer: 'Most of our clients land in the top 3-pack within 60 days. That is the single biggest free-lead source for roofers, and almost no one is doing it properly.',
  },

  ai_sms: {
    eyebrow: 'AI SMS',
    headline: 'Every lead replied to in under a minute.',
    subhead: 'Studies put 5-minute response times at 100x higher conversion than 30-minute ones. Most roofers do not even hit 30 minutes. Our AI replies in seconds, qualifies the lead, and books the appointment, while you are still on the roof.',
    stats: [
      { value: '<60s',   label: 'Reply time on every form fill, day or night' },
      { value: '100x',   label: 'Conversion lift vs. a 30-minute reply' },
      { value: '24/7',   label: 'Coverage, including weekends + holidays' },
      { value: '0 missed',label: 'Leads, ever' },
    ],
    outcomes: [
      'Replies to every form submission in under 60 seconds, 24/7, including weekends and holidays',
      'Qualifies the lead the way you want, service type, address, urgency, insurance vs cash',
      'Books straight onto your calendar, no double-booking, no back-and-forth',
      'Hands off to a real human the moment the conversation needs one',
      'Trained on your specific FAQs, pricing stance, and the things you never want said',
      'Every conversation logged so you can see exactly how leads are being treated',
    ],
    process: [
      { title: '1. Train it on you', body: 'We grab your FAQs, pricing stance, qualification flow, and tone in a single onboarding session. The AI now sounds like you, not like a chatbot.' },
      { title: '2. Plug in your channels', body: 'Form fills, missed calls, ad leads, manual entries. Every channel that produces a lead gets routed through the AI.' },
      { title: '3. Watch leads get booked', body: 'You see appointments hit your calendar without lifting a finger. We send weekly recaps of what was booked and where the AI handed off.' },
    ],
    proof: {
      headline: 'The leads you are losing right now are not bad leads.',
      body: 'They are leads you did not reply to fast enough. The Harvard Business Review study on this is brutal: at 5 minutes you convert at 100x the rate you do at 30 minutes. Most roofers are not even close to 5.',
    },
    videoCaption: COMING_SOON_CAPTION,
    closer: 'The leads you are losing right now are not bad leads, they are just leads you did not reply to fast enough. This fixes it overnight.',
  },

  ai_receptionist: {
    eyebrow: 'AI Receptionist',
    headline: 'Never miss a call. Never miss a job.',
    subhead: 'Roofers miss calls. It is the nature of the job, you are on a ladder, in an attic, driving between estimates. Every missed call is a roof going to a competitor. Our AI receptionist answers every one, qualifies the caller, and drops a hot summary in your inbox.',
    stats: [
      { value: '85%',   label: 'Of callers do not leave voicemail when they hit one' },
      { value: '1-2',   label: 'Rings before the AI picks up, every time' },
      { value: '24/7',  label: 'Coverage, weekends, holidays, after-hours' },
      { value: '100%',  label: 'Of calls captured with full transcript + summary' },
    ],
    outcomes: [
      'Picks up every call in 1-2 rings, 24/7, in your voice with your script',
      'Qualifies callers, name, address, service, urgency, insurance, before you ever look at it',
      'Books appointments straight onto your calendar during the call',
      'Handles emergencies on its own logic, route urgent calls to your phone, take messages on the rest',
      'Sends an email summary the moment the call ends, with full transcript',
      'Captures the caller phone number even if they hang up, no lead lost to a missed ring',
    ],
    process: [
      { title: '1. Build your script', body: 'Greeting, qualification questions, FAQs, pricing stance, the things you never want said. We build the AI in your voice during onboarding.' },
      { title: '2. Forward your line', body: 'Three-minute setup with your phone provider. Calls now route to the AI when you are busy or after hours. Your existing number does not change.' },
      { title: '3. Get hot leads in your inbox', body: 'Every call ends with a summary email and a fresh appointment on your calendar. You wake up to a list of qualified jobs, not voicemail roulette.' },
    ],
    proof: {
      headline: 'You will wonder how you ran the business without it.',
      body: 'The first few weeks of running an AI receptionist are jarring, in a good way. Calls you would have missed entirely are landing on your calendar with full context. The first roof it books pays for it for the year.',
    },
    videoCaption: COMING_SOON_CAPTION,
    closer: 'You will wonder how you ran the business without it. The first roof it books pays for it for the year.',
  },

  website: {
    eyebrow: 'Website Build',
    headline: 'A roofing site that actually sells.',
    subhead: 'Most roofing websites look like brochures. Yours should look like a sales engine, fast, mobile-first, with a phone number above the fold and a lead form that converts. We build it, host it, and tune it monthly.',
    stats: [
      { value: '<2s',   label: 'Page load time, mobile, on a 4G connection' },
      { value: '70%+',  label: 'Of your traffic is on a phone, we design for that first' },
      { value: '7%',    label: 'Conversion drop per second slower than 2s, we do not lose any' },
      { value: '∞',     label: 'Yours forever, hosted by us, owned by you' },
    ],
    outcomes: [
      'Custom-designed site built specifically for roofing buyers, not a generic template',
      'Mobile-first, most of your traffic is on a phone, the site loads in under 2 seconds',
      'Lead form that hands directly off to AI SMS for instant follow-up',
      'SEO foundation: technical setup, schema, sitemap, indexed properly from day one',
      'Photography direction, what to shoot, what to send us, how to make the work look great',
      'Monthly content + technical SEO so the site keeps climbing in search',
    ],
    process: [
      { title: '1. Design + content', body: 'We map every page, write the copy in your voice, and design with your brand. You approve before a single line of code gets written.' },
      { title: '2. Build + launch', body: 'Custom-coded, fast, secure. Lead form wired to AI SMS, analytics + Search Console live from day one. We handle DNS so there is zero downtime on cutover.' },
      { title: '3. Tune monthly', body: 'New content, technical SEO, page speed audits, conversion tweaks. The site you launch is the worst version of the site you will ever have.' },
    ],
    proof: {
      headline: 'A great site is a 24/7 salesperson. A bad one is a leak in your marketing budget.',
      body: 'You can run the best ads in your market, but if they land on a slow, ugly, untrustworthy site you are just paying to lose leads. We rebuild the engine, then point traffic at it.',
    },
    videoCaption: COMING_SOON_CAPTION,
    closer: 'A great site is a 24/7 salesperson. A bad one is a leak in your marketing budget. We turn yours into the former.',
    portfolio: [
      {
        name: 'Pure Renovation and Design',
        url: 'https://purerenovationanddesign.com/',
        description: 'High-end residential renovation site, fast, photo-led, mobile-first, with a single conversion focus on the booking form.',
      },
      {
        name: 'Wild Mountain Immigration',
        url: 'https://wildmountainimmigration.com/',
        description: 'Service-business site built for trust, calm typography, clear pathways for each service, and a lead form that converts.',
      },
    ],
  },
};
