/**
 * Context-aware suggested questions for Aria. Maps the location context
 * (derived from the route) to 3 relevant questions the client might ask.
 *
 * Context format:
 *   "dashboard"                              general portal questions
 *   "<serviceKey>"                           browsing a service page
 *   "<serviceKey>.<moduleKey>"               inside a specific module
 *   "reports" / "admin" / null               fallbacks
 */

const DEFAULT_SUGGESTIONS = [
  "What do I need to give Serenium to get started?",
  "Can I come back and finish later?",
  "What happens once I'm done with onboarding?",
];

/**
 * Per-service "how do I give you access" prompts. Surfaced on the dashboard so
 * clients can jump straight to the access question that's blocking their next
 * service, instead of digging through modules.
 */
const SERVICE_ACCESS_PROMPTS: Record<string, string> = {
  website: 'How do I give you access to my domain?',
  facebook_ads: 'How do I share my Facebook ad account with you?',
  google_ads: 'How do I accept the Google Ads MCC link request?',
  google_business_profile: 'How do I add you as a Manager on my Google Business Profile?',
  ai_receptionist: 'How do I forward my existing number to the AI receptionist?',
  ai_sms: 'How do I connect my calendar to the AI SMS?',
  business_profile: 'What info do you need for my Business Profile?',
};

const SERVICE_SUGGESTIONS: Record<string, string[]> = {
  business_profile: [
    "What should I put for my 'unique selling points'?",
    "Do I have to upload a logo in more than one format?",
    "What if I don't offer emergency service?",
  ],
  facebook_ads: [
    "How do I create a Meta Business Manager?",
    "What does sharing my Pixel / Dataset do?",
    "Can I share access from my phone?",
  ],
  google_ads: [
    "Where do I find my 10-digit Google Ads Customer ID?",
    "I don't have a Google Ads account yet, what should I do?",
    "What happens after I accept the MCC link request?",
  ],
  google_business_profile: [
    "How do I add Serenium as a Manager on my Google Business Profile?",
    "What if my Google Business Profile isn't verified yet?",
    "Will adding you as a Manager give you ownership?",
  ],
  ai_sms: [
    "What are good opening-message examples for my AI SMS?",
    "How should I handle pricing questions?",
    "What does 'booking notification' mean for my AI SMS?",
  ],
  ai_receptionist: [
    "What's the difference between Option A and Option B phone setup?",
    "How do I forward my existing number to the AI?",
    "What voice should I pick for the AI?",
  ],
  website: [
    "How do I add Serenium to my Google Analytics?",
    "What does DNS delegation actually do?",
    "What if my WordPress login isn't working?",
  ],
};

const MODULE_SUGGESTIONS: Record<string, string[]> = {
  // Website
  'website.registrar_delegation': [
    "Walk me through adding a user on GoDaddy",
    "My domain registrar isn't listed, what do I do?",
    "What permissions do you actually need on my registrar?",
  ],
  'website.cms_access': [
    "How do I add an Administrator to WordPress?",
    "What if I don't remember my WordPress admin login?",
    "Does giving you access mean you can delete my site?",
  ],
  'website.analytics_and_search_console': [
    "I've never set up Google Analytics, can you still help?",
    "What's the difference between Analytics and Search Console?",
    "Why do you need Owner access on Search Console?",
  ],
  // AI SMS
  'ai_sms.ghl_calendar_setup': [
    "Walk me through connecting Google Calendar to GHL",
    "What calendar events does the AI create?",
    "Can I block specific time windows?",
  ],
  'ai_sms.scripts_behaviour': [
    "What should the AI never say?",
    "How many FAQs do I actually need?",
    "What's a good opening message for a roofing lead?",
  ],
  'ai_sms.emergency_handling': [
    "How do I define 'emergency' clearly for the AI?",
    "Who should get emergency notifications?",
    "Should the AI call me or just text me?",
  ],
  // AI Receptionist
  'ai_receptionist.phone_number_setup': [
    "How do I set up call forwarding on my iPhone?",
    "How do I set up call forwarding on my Samsung?",
    "What's the carrier forwarding code for Canada?",
  ],
  'ai_receptionist.scripts_behaviour': [
    "What's a good greeting for a roofing business?",
    "Should I pick a male or female voice?",
    "How many questions should the AI ask on a call?",
  ],
  // GBP
  'google_business_profile.manager_access': [
    "How do I add contact@sereniumai.com as a Manager on GBP?",
    "What if I don't have access to the Google Business Profile?",
    "Will this transfer ownership to Serenium?",
  ],
  'google_business_profile.ownership': [
    "What if the profile was set up by a previous agency?",
    "How can I tell if my GBP is verified?",
    "What happens if my GBP is unverified?",
  ],
  // Facebook
  'facebook_ads.grant_access': [
    "Walk me through adding Serenium as a partner on Meta",
    "How do I share my Pixel / Dataset?",
    "What's the difference between sharing a Page and an Ad Account?",
  ],
  'facebook_ads.prerequisites': [
    "How do I check if I have a Meta Business Manager?",
    "Can I create a Business Manager on mobile?",
    "Do I need a Facebook Page before anything else?",
  ],
  // Business Profile
  'business_profile.emergency_service': [
    "What counts as an emergency for a roofer?",
    "What are typical response times to tell you?",
    "Should I include after-hours charges here?",
  ],
  'business_profile.service_areas': [
    "How many cities should I list?",
    "Does the order of my service areas matter?",
    "What if I serve a region, not specific cities?",
  ],
  'business_profile.credentials_and_trust': [
    "What counts as a 'credential'?",
    "Should I include my insurance details?",
    "How should I word my warranty?",
  ],
};

const REPORTS_SUGGESTIONS = [
  "When is my next monthly report?",
  "How do I read a performance report?",
  "Can I compare this month to last?",
];

export function suggestionsForContext(
  context: string | null,
  opts: { enabledServices?: string[] } = {},
): string[] {
  if (context === 'reports') return REPORTS_SUGGESTIONS;
  if (context === 'admin') return [];

  // On the dashboard (or no specific context): show access prompts for the
  // services the client actually has, so they can get unblocked fast.
  if (!context || context === 'dashboard') {
    const services = opts.enabledServices ?? [];
    const accessPrompts = services
      .map(s => SERVICE_ACCESS_PROMPTS[s])
      .filter((s): s is string => !!s)
      .slice(0, 2);
    if (accessPrompts.length === 0) return DEFAULT_SUGGESTIONS;
    return [accessPrompts[0], ...(accessPrompts[1] ? [accessPrompts[1]] : []), DEFAULT_SUGGESTIONS[0]];
  }

  // Module-level context, most specific first.
  if (MODULE_SUGGESTIONS[context]) return MODULE_SUGGESTIONS[context];

  // Fall back to service-level if we're on a module we haven't got tailored prompts for.
  const [svcKey] = context.split('.');
  return SERVICE_SUGGESTIONS[svcKey] ?? DEFAULT_SUGGESTIONS;
}
