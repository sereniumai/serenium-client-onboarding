import type { ServiceKey } from '../types';
import type { Condition } from '../lib/condition';

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'number'
  | 'select' | 'multiselect' | 'url' | 'color' | 'checkbox' | 'info'
  | 'file' | 'file_multiple' | 'repeatable' | 'weekly_availability'
  | 'structured' | 'slider' | 'logo_picker';

/** Sub-field definition for `structured` fields. */
export interface StructuredSubField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'url';
  required?: boolean;
  options?: string[];           // for select
  placeholder?: string;
}

/** Simple synchronous validator. Returns an error message or null. */
export type FieldValidator = (value: unknown) => string | null;

// ─── Common validators ──────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-().]{6,}$/;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const GOOGLE_ADS_ID_RE = /^\d{3}-?\d{3}-?\d{4}$/;

export const validateEmail: FieldValidator = v =>
  typeof v === 'string' && v && !EMAIL_RE.test(v) ? 'Enter a valid email address.' : null;

export const validatePhone: FieldValidator = v =>
  typeof v === 'string' && v && !PHONE_RE.test(v) ? 'Enter a valid phone number.' : null;

export const validateDomain: FieldValidator = v => {
  if (typeof v !== 'string' || !v) return null;
  const stripped = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  return DOMAIN_RE.test(stripped) ? null : 'Enter a valid domain (e.g. surewestroofing.ca).';
};

export const validateGoogleAdsId: FieldValidator = v =>
  typeof v === 'string' && v && !GOOGLE_ADS_ID_RE.test(v)
    ? 'Google Ads ID must be 10 digits, like 123-456-7890.'
    : null;

export interface Task {
  key: string;
  label: string;
  required?: boolean;
}

export interface Field {
  key: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  /** Short "What does this mean?" explanation shown in a ? tooltip next to the label. Keep it under ~140 chars. */
  tooltip?: string;
  accept?: string;
  conditional?: Condition;
  /** For type='info', static content shown as guidance */
  content?: string;
  /** For type='info', optional YouTube / Loom URL embedded below the content. */
  videoUrl?: string;
  /** For type='info', optional list of external doc links rendered as link cards. */
  docLinks?: Array<{ label: string; url: string }>;
  /** For repeatable fields, minimum entries required */
  minItems?: number;
  /** For type='structured', sub-field schema (e.g. street/city/postal). */
  schema?: StructuredSubField[];
  /** For type='slider', numeric range config. */
  slider?: { min: number; max: number; step: number; default: number; suffix?: string };
  /** For type='logo_picker', which Business Profile field to offer as "reuse" option. */
  logoReuseFieldKey?: string;
  /** For type='weekly_availability', which days to render. Defaults to Mon–Fri. */
  weekDays?: Array<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>;
  /** Synchronous validation. Returns error message or null. */
  validate?: FieldValidator;
}

export interface ModuleDef {
  key: string;
  title: string;
  description?: string;
  /** One-sentence answer to "why does Serenium need this?" - shown as a subtle info panel on the module page. */
  whyWeAsk?: string;
  estimatedMinutes?: number;
  videoUrl?: string;
  videoPlaceholder?: boolean;
  externalLink?: string;
  instructions?: string;
  tasks?: Task[];
  fields?: Field[];
  /** When true, this module can only start after the previous enabled module is complete. */
  requiresPrevious?: boolean;
  /** If set, module is only visible when the condition evaluates true (cross-module supported). */
  conditional?: Condition;
  /** If set, module is locked until admin flips this flag on this org. */
  lockedUntilAdminFlag?: string;
  lockedMessage?: string;
  /** Named static links shown under instructions. */
  links?: Record<string, string>;
  /** Links that appear when another field equals the key (e.g. registrar). */
  conditionalLinks?: Record<string, string>;
}

export interface ServiceDef {
  /** Marketing-style outcome pitch shown on the "More from Serenium" upsell list. */
  marketingDescription?: string;
  key: ServiceKey;
  label: string;
  description: string;
  modules: ModuleDef[];
  mandatory?: boolean;
}

// ============================================================================
// BUSINESS PROFILE, default on, shown first, but admin can disable if not needed
// ============================================================================
const BUSINESS_PROFILE: ServiceDef = {
  key: 'business_profile',
  label: 'Business Profile',
  description: 'Core business details we use across every Serenium service we run for you.',
  marketingDescription: 'The story we tell about your business everywhere, polished, consistent, and built to win every quote.',
  modules: [
    {
      key: 'logo_files',
      title: 'Logo',
      whyWeAsk: 'Your logo goes everywhere we build for you - your website, ads, social profiles, email signatures, and the AI receptionist confirmation texts. We need the original files (not screenshots) so it stays sharp at any size.',
      estimatedMinutes: 3,
      fields: [{
        key: 'logo_files',
        label: 'Logo files - Google Drive or Dropbox link',
        type: 'url',
        required: true,
        placeholder: 'https://drive.google.com/…',
        helpText: 'Paste a link to a folder containing your logos. Include high-res PNG transparent + SVG if available. Make sure the link is set to "anyone with the link can view."',
        tooltip: 'Share a folder link (set to "anyone with the link can view") containing your original logo files. We need vector or high-res versions so your brand stays sharp on signs, ads, and your site.',
      }],
    },
    {
      key: 'service_areas',
      title: 'Service areas',
      whyWeAsk: 'Your ads, Google Business listing, and AI receptionist all need to know where you actually work, so we only spend ad budget on people in your service zone and the AI never books a job outside your coverage area.',
      estimatedMinutes: 3,
      fields: [{
        key: 'service_areas',
        label: 'Cities and towns you serve, most important first',
        type: 'repeatable',
        required: true,
        helpText: 'Order matters: top of the list gets priority in ads, landing pages, and SEO.',
        tooltip: 'List the cities and towns where you actually take jobs, your top market first. We use this to target ad spend, build local SEO pages, and stop the AI booking work outside your area.',
      }],
    },
    {
      key: 'services_offered',
      title: 'Services offered',
      whyWeAsk: 'These are what we will write your ads, your website pages, and your AI scripts around. The clearer you list them (full re-roof vs. repair vs. siding vs. eavestrough) the better we can match each lead to what you actually want to sell.',
      estimatedMinutes: 5,
      fields: [{ key: 'services_offered', label: 'Service name + brief description', type: 'repeatable', required: true, tooltip: 'List each service with a one-line description (e.g. "Full re-roof, asphalt or metal, 1 to 3 day turnaround"). The clearer you are, the better we can write ad copy and AI scripts that match what you actually want to sell.' }],
    },
    {
      key: 'unique_selling_points',
      title: 'Unique selling points',
      whyWeAsk: 'Every roofer in your city offers "quality work and good prices". What you say here is what we use as the headline of your ads and the hero of your website, so the more specific and honest the better. Family-run since 1998 beats "trusted local roofer" every time.',
      estimatedMinutes: 3,
      fields: [{ key: 'usps', label: 'What makes you different from competitors?', type: 'textarea', required: true, tooltip: 'Be specific. "Family-run since 1998, GAF Master Elite, all crews W-2 employees not subs" beats "quality work and great service". This becomes your ad headlines and website hero copy.' }],
    },
    {
      key: 'credentials_and_trust',
      title: 'Credentials and trust',
      whyWeAsk: 'Roofing is a trust purchase. Saying "fully insured, 10-year workmanship warranty, GAF Master Elite" converts roughly 30% better than not saying it. We weave these into your ads, site, and AI scripts so every touchpoint earns trust automatically.',
      estimatedMinutes: 6,
      instructions: 'All the things that make prospects trust you. We use these on your website hero, in ads, on your Google Business Profile, and when the AI answers questions about your credibility.',
      fields: [
        { key: 'certifications', label: 'Certifications (GAF, IKO, CRCA, etc.)', type: 'repeatable', tooltip: 'Manufacturer certifications and trade-body memberships (GAF Master Elite, IKO ROOFPRO, CRCA, BBB Accredited). These are huge trust signals on your site and in ads.' },
        { key: 'awards', label: 'Awards and "Best of" lists', type: 'repeatable', tooltip: 'Any "Best of" lists, HomeStars Best of, Consumer Choice, local newspaper awards, etc. Year and source if you have it. We turn these into trust badges on your site.' },
        { key: 'warranty', label: 'Warranty terms (workmanship and materials)', type: 'textarea', tooltip: 'Plain language is fine. Example: "10-year workmanship, lifetime manufacturer on GAF shingles." Used in ads, on site, and when the AI answers warranty questions.' },
        { key: 'insurance', label: 'Insurance you carry (liability, WCB, bonding)', type: 'textarea', tooltip: 'Coverage amounts and types (e.g. "$5M liability, WCB in good standing, fully bonded"). "Fully insured" is one of the strongest trust phrases we can put on your site.' },
      ],
    },
    {
      key: 'financing',
      title: 'Financing options',
      whyWeAsk: 'A new roof is a five-figure decision. When the AI hears "that\'s a lot of money", it can offer 0% financing or monthly plans on the spot, which is one of the biggest conversion levers we have. Tell us if you offer it and who through.',
      estimatedMinutes: 2,
      fields: [
        { key: 'financing_offered', label: 'Do you offer financing?', type: 'select', options: ['Yes', 'No'], required: true, tooltip: 'If Yes, your AI will mention financing when price comes up, a common conversion booster for bigger roof jobs.' },
        { key: 'financing_partners', label: 'Partners (Hearth, GreenSky, etc.)', type: 'repeatable', conditional: { field: 'financing_offered', op: 'eq', value: 'Yes' }, tooltip: 'List who provides your financing (Hearth, GreenSky, Financeit, etc.) and any rate-range you can advertise. The AI uses this when callers hesitate on price.' },
      ],
    },
    {
      key: 'emergency_service',
      title: 'Emergency service',
      whyWeAsk: 'A leaking roof at 9pm is the highest-intent lead a roofer will ever get. Telling us if and how you handle emergencies lets us route those calls and texts straight to the right person, instead of losing them to a competitor by morning.',
      estimatedMinutes: 5,
      fields: [
        { key: 'emergency_offered', label: 'Do you offer emergency service?', type: 'select', options: ['Yes', 'No'], required: true, tooltip: 'Answer Yes to unlock emergency handling inside your AI SMS and AI Receptionist flows. We use this to decide how urgent leaks and storm damage get routed.' },
        { key: 'emergency_services_list', label: 'What emergency services (storm damage, leaks, tarping, etc.)', type: 'textarea', conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' }, tooltip: 'List exactly what counts as emergency work for you (storm damage, active leaks, tarping, fallen tree). The AI uses these as trigger phrases to escalate the call instantly.' },
        { key: 'emergency_hours', label: 'Hours of emergency availability', type: 'select', options: ['24/7', 'After-hours only', 'Specific hours'], conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' }, tooltip: 'When you actually answer emergency calls. Be honest, the AI will only promise what you commit to here, otherwise you risk burning a relationship at 2am.' },
        { key: 'emergency_phone', label: 'Emergency contact phone (if different from main)', type: 'phone', conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' }, tooltip: 'Only if emergencies should ring a different phone than your main line (e.g. owner cell at night). Leave blank to use the main number.' },
        { key: 'emergency_response_time', label: 'Typical response time', type: 'select', options: ['Within 1 hour', 'Same day', 'Next business day'], conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' }, tooltip: 'What you can realistically commit to. The AI uses this to set caller expectations, faster promises convert better but only if you can actually deliver.' },
        { key: 'emergency_extra_charges', label: 'Extra charges for emergency calls?', type: 'select', options: ['Yes', 'No'], conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' }, tooltip: 'Whether emergency callouts cost more than standard. The AI discloses this upfront so callers do not get surprised on the invoice.' },
        { key: 'emergency_extra_charges_details', label: 'Details on extra charges', type: 'textarea', conditional: { field: 'emergency_extra_charges', op: 'eq', value: 'Yes' }, tooltip: 'How much and when (e.g. "$150 callout fee after 6pm or weekends, waived if work proceeds"). The AI says this verbatim so customers know what to expect.' },
      ],
    },
    {
      key: 'team_members',
      title: 'Team members',
      whyWeAsk: 'Faces convert. A "Meet the team" section with real headshots and short bios outperforms a generic "About us" page in every test we have run. We use these on your site, in retargeting ads, and on Google Business Profile posts.',
      estimatedMinutes: 10,
      fields: [{ key: 'team_members', label: 'Name, role, years of experience, short bio, headshot', type: 'repeatable', tooltip: 'Add owners and key crew. A real photo and a one-line bio per person turns "some roofer" into people the homeowner can picture in their driveway, which lifts conversion noticeably.' }],
    },
    {
      key: 'main_business_email',
      title: 'Main business email',
      whyWeAsk: 'This is where every lead summary, booking confirmation, and monthly report will land in your inbox. Use the address you actually check, not a "info@" you forget about, otherwise hot leads can sit unread.',
      estimatedMinutes: 1,
      fields: [{ key: 'primary_email', label: 'Primary business email', type: 'email', required: true, validate: validateEmail, tooltip: 'The inbox you actually check daily. Lead notifications, AI call summaries, and monthly reports all go here, so put a generic info@ only if someone genuinely watches it.' }],
    },
    {
      key: 'physical_address',
      title: 'Physical address',
      whyWeAsk: 'Google Business Profile, Local Service Ads, and the "Contact" section of your site all need a real Canadian address. It also tells Google where the centre of your service map should sit, which directly affects who sees you in local search.',
      estimatedMinutes: 2,
      fields: [{
        key: 'business_address',
        label: 'Business address',
        type: 'structured',
        required: true,
        tooltip: 'Your real Canadian business address (HQ, office, or yard). Google uses it to anchor your local search visibility, and it appears on your site footer and Google Business Profile.',
        schema: [
          { key: 'street',  label: 'Street',      type: 'text', required: true, placeholder: '123 Main St' },
          { key: 'city',    label: 'City',        type: 'text', required: true, placeholder: 'Calgary' },
          { key: 'province', label: 'Province',   type: 'select', required: true, options: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] },
          { key: 'postal',  label: 'Postal code', type: 'text', required: true, placeholder: 'T1A 1A1' },
        ],
      }],
    },
    {
      key: 'business_hours_module',
      title: 'Business hours',
      whyWeAsk: 'Your hours decide when a lead gets routed to a real person versus the AI taking a message, when ads pause, and what shows on your Google Business Profile. Be honest about reality, not what you wish your hours were.',
      estimatedMinutes: 3,
      fields: [{
        key: 'business_hours',
        label: 'Weekly hours (Mon–Sun)',
        type: 'weekly_availability',
        required: true,
        weekDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        helpText: 'Toggle a day to "Closed" if you don\'t work that day. Defines the boundary between business-hours and after-hours handling for your AI.',
        tooltip: 'The hours you actually answer the phone or take leads. These power your Google Business Profile hours, ad scheduling, and the AI\'s "out of hours" handling.',
      }],
    },
    {
      key: 'legal_business_name',
      title: 'Legal business name',
      whyWeAsk: 'This goes on contracts, your website footer, your privacy policy, CASL email footers, and Google Business Profile verification paperwork. It needs to match what is on your business registration exactly.',
      estimatedMinutes: 1,
      fields: [{ key: 'legal_business_name', label: 'Legal entity name', type: 'text', required: true, helpText: 'Used on contracts, website footer, GBP verification, privacy policy.', tooltip: 'The exact name on your business registration (e.g. "Surewest Roofing Ltd."). Must match paperwork or Google Business Profile verification will fail.' }],
    },
    {
      key: 'social_profiles',
      title: 'Social profiles',
      whyWeAsk: 'When a homeowner Googles your business name they end up on these pages. We link them from your site and your Google Business Profile, and we cross-post your monthly ad video to whichever ones you have. Skip the ones you don\'t actually use.',
      estimatedMinutes: 4,
      instructions: 'Paste links to any of these platforms where you have a presence. All optional, skip the ones you don\'t use.',
      fields: [
        { key: 'social_facebook',  label: 'Facebook',    type: 'url', placeholder: 'https://facebook.com/...', tooltip: 'Your business Page URL. We link it from your site, your Google profile, and post your monthly ad video here. Skip if you do not have one.' },
        { key: 'social_instagram', label: 'Instagram',   type: 'url', placeholder: 'https://instagram.com/...', tooltip: 'Your business Instagram handle URL. Used for cross-posting and as a trust signal on your site. Skip if you do not have one.' },
        { key: 'social_youtube',   label: 'YouTube',     type: 'url', placeholder: 'https://youtube.com/@...', tooltip: 'Your YouTube channel URL. Where we publish your monthly ad video and any longer testimonial / project content. Skip if you do not have one.' },
        { key: 'social_linkedin',  label: 'LinkedIn',    type: 'url', placeholder: 'https://linkedin.com/company/...', tooltip: 'Your company LinkedIn page. Mostly for credibility on commercial work and Google Knowledge Panel signals.' },
        { key: 'social_tiktok',    label: 'TikTok',      type: 'url', placeholder: 'https://tiktok.com/@...', tooltip: 'Your TikTok handle URL. Optional, only useful if you want short-form clips of your work cross-posted there.' },
        { key: 'social_homestars', label: 'HomeStars',   type: 'url', placeholder: 'https://homestars.com/...', tooltip: 'Your HomeStars listing URL. Strong trust signal in Canada, we link it prominently if you have a "Best of" badge.' },
        { key: 'social_other',     label: 'Other (platform + URL)', type: 'repeatable', tooltip: 'Anywhere else you have a presence (Houzz, Yelp, BBB, Google reviews link, Nextdoor, etc.). Add the platform name and URL for each.' },
      ],
    },
    {
      key: 'year_founded',
      title: 'Year founded',
      whyWeAsk: '"Est. 2012" reads as more credible than "we have been around for 13 years" and never goes stale. We use it in your site footer, ad copy, and the AI\'s answer when callers ask how long you have been in business.',
      estimatedMinutes: 1,
      fields: [{ key: 'year_founded', label: 'Year the business was founded', type: 'number', placeholder: 'e.g. 2012', helpText: 'Stable value for "Est. 2012" branding, years_in_business drifts, year_founded doesn\'t.', tooltip: 'The year you actually started taking jobs. We use it as "Est. 2012" branding on your site footer, ads, and the AI\'s answer to "how long have you been around?".' }],
    },
    {
      key: 'tagline',
      title: 'Tagline or slogan',
      whyWeAsk: 'A short line we can repeat across your site hero, ad headlines, and email signatures. Don\'t worry if you don\'t have one yet, we can write you a few options based on the rest of your Business Profile.',
      estimatedMinutes: 1,
      fields: [{ key: 'tagline_or_slogan', label: 'Tagline', type: 'text', helpText: 'Used as consistent hero copy across website and ads.', tooltip: 'A short line that captures what you do (e.g. "Calgary\'s family-owned roofers since 1998"). Leave blank and we will draft a few options from your Business Profile for you to choose from.' }],
    },
  ],
};

// ============================================================================
// FACEBOOK ADS, placeholder, to be respec'd
// ============================================================================
const FACEBOOK_ADS: ServiceDef = {
  key: 'facebook_ads',
  label: 'Facebook Ads',
  description: 'Partner access and brand info so we can launch and manage your Meta ads.',
  marketingDescription: 'Hyper-targeted Meta ads that put your roof in front of homeowners ready to buy this week, not next year.',
  modules: [
    {
      key: 'prerequisites',
      title: 'Pre-requisite checks',
      whyWeAsk: 'Meta requires a Business Manager (a free Facebook account that owns your Page, Pixel, and Ad Account) before any agency can run ads on your behalf. We need to know what you already have so we either jump straight into sharing access or help you set the missing pieces up first.',
      estimatedMinutes: 3,
      instructions: `Before Serenium can run ads, we need to partner with your Meta Business Manager. A couple of quick questions first.`,
      fields: [
        { key: 'fb_business_manager_exists', label: 'Do you have a Meta Business Manager (BM)?', type: 'select', required: true, options: ['Yes', 'No', 'Not sure'], tooltip: 'Business Manager is the free Meta dashboard that owns your Page, Pixel, and Ad Account. We need one to partner with before any ads can run. Pick "Not sure" and we\'ll help you check.' },
        { key: 'fb_bm_create_help', type: 'info',
          conditional: { field: 'fb_business_manager_exists', op: 'eq', value: 'No' },
          content: "No problem, create one free at **business.facebook.com/overview** before continuing. You'll need it to run ads and to grant Serenium partner access." },
        { key: 'fb_bm_find_help', type: 'info',
          conditional: { field: 'fb_business_manager_exists', op: 'eq', value: 'Not sure' },
          content: "Head to **business.facebook.com**. If you're logged in and see a 'Business Manager' option, you have one. If not, select 'Create Account' and set one up." },
        { key: 'fb_page_exists', label: 'Do you have a Facebook Page for your business?', type: 'select', required: true, options: ['Yes', 'No'], tooltip: 'A business Page (not your personal profile). Meta requires a Page for ads. If No, we will help you spin one up under your Business Manager.' },
        { key: 'fb_page_help', type: 'info',
          conditional: { field: 'fb_page_exists', op: 'eq', value: 'No' },
          content: "Pre-requisite: your Page must belong to your Business Manager, not a personal profile. Serenium can create or guide you, ping us if you need help." },
      ],
    },
    {
      key: 'grant_access',
      title: 'Grant Serenium partner access',
      whyWeAsk: 'This is the access we need to actually launch and optimise your Meta ads. You stay the owner of everything, your Page, your Pixel, your Ad Account, we are added as a partner so we can build campaigns and pull performance data. Pull the access at any time and we are out.',
      estimatedMinutes: 5,
      instructions: `Add Serenium as a partner in your Business Manager, then share these assets with us. Our BM ID: **1304001774825587**

Only the checkboxes that apply to your setup will show. If you don't have a Business Manager or Page yet, create them first on the previous step, then come back here.`,
      fields: [
        { key: 'fb_prereq_warning', type: 'info',
          conditional: { all: [
            { path: 'facebook_ads.prerequisites.fb_business_manager_exists', op: 'neq', value: 'Yes' },
            { path: 'facebook_ads.prerequisites.fb_page_exists', op: 'neq', value: 'Yes' },
          ]},
          content: "You haven't confirmed a Business Manager or a Facebook Page on the previous step, so there's nothing to share yet. Head back, set those up, and this module will open up for you.",
        },
        { key: 'fb_partner_added',
          label: 'Added Serenium as a partner in my Business Manager (BM ID 1304001774825587)',
          type: 'checkbox', required: true,
          conditional: { path: 'facebook_ads.prerequisites.fb_business_manager_exists', op: 'eq', value: 'Yes' },
          tooltip: 'In Business Manager → Business Settings → Partners → Add. Paste our BM ID. This creates the relationship, you still own everything, we just get a chair at the table.',
        },
        { key: 'fb_shared_page',
          label: 'Shared my Facebook Page with Serenium',
          type: 'checkbox', required: true,
          conditional: { path: 'facebook_ads.prerequisites.fb_page_exists', op: 'eq', value: 'Yes' },
          tooltip: 'Page access lets us run ads tied to your Page and reply to comments on ad creatives. Pick "Manage Page" or "Create Ads" permission level.',
        },
        { key: 'fb_shared_instagram',
          label: 'Shared my Instagram account with Serenium (optional if no IG)',
          type: 'checkbox',
          conditional: { path: 'facebook_ads.prerequisites.fb_page_exists', op: 'eq', value: 'Yes' },
          tooltip: 'Optional but recommended, sharing your IG lets us run ads natively in Instagram feed and Reels, where roofing creative often performs best.',
        },
        { key: 'fb_shared_dataset',
          label: 'Shared my Dataset (Pixel) with Serenium',
          type: 'checkbox', required: true,
          conditional: { path: 'facebook_ads.prerequisites.fb_business_manager_exists', op: 'eq', value: 'Yes' },
          tooltip: 'The Pixel (Dataset) is what tracks who clicked your ad and what they did on your site. Without it we cannot optimise for actual leads, only clicks.',
        },
        { key: 'fb_shared_ad_account',
          label: 'Shared my Ad Account with Serenium',
          type: 'checkbox', required: true,
          conditional: { path: 'facebook_ads.prerequisites.fb_business_manager_exists', op: 'eq', value: 'Yes' },
          tooltip: 'Ad Account is where the campaigns and the credit card live. Sharing it (with "Manage Campaigns" access) is what lets us actually launch and optimise ads.',
        },
      ],
    },
  ],
};

// ============================================================================
// GOOGLE ADS, NEW
// ============================================================================
const GOOGLE_ADS: ServiceDef = {
  key: 'google_ads',
  label: 'Google Ads',
  description: 'Manager link and account details so we can run your search and LSA campaigns.',
  marketingDescription: 'Show up first when locals search "roofer near me", plus Google-guaranteed Local Service Ads that bring leads to your phone.',
  modules: [
    {
      key: 'account_state',
      title: 'Account state',
      whyWeAsk: 'Old Google Ads accounts carry quality scores and conversion history that brand-new accounts don\'t, which means lower cost-per-click. If you have one, we link to it instead of starting from scratch. If you don\'t, we make one for you.',
      estimatedMinutes: 2,
      fields: [
        { key: 'google_ads_account_exists', label: 'Do you already have a Google Ads account?', type: 'select', required: true, options: ['Yes', 'No', 'Not sure'], tooltip: 'Pick "Not sure" if you ran ads years ago but can\'t remember. We\'ll look it up before creating a new one, old accounts keep valuable history.' },
        { key: 'google_ads_no_info', type: 'info',
          conditional: { field: 'google_ads_account_exists', op: 'eq', value: 'No' },
          content: "No problem, Serenium will create a new account linked to our Manager Account. No action needed from you, skip the rest of this service." },
      ],
    },
    {
      key: 'customer_id',
      title: 'Customer ID',
      whyWeAsk: 'Your 10-digit Google Ads Customer ID is how we identify your specific account when we send a Manager link request. Without it the link request goes to the wrong place, or to no one. Two minutes to find, saves a week of back-and-forth.',
      estimatedMinutes: 2,
      conditional: { path: 'google_ads.account_state.google_ads_account_exists', op: 'eq', value: 'Yes' },
      instructions: `We need your **10-digit Google Ads Customer ID** to send an MCC link request. Log into Google Ads, the number appears in the top-right of every screen, formatted like **123-456-7890**.`,
      fields: [
        { key: 'google_ads_customer_id', label: 'Customer ID', type: 'text', required: true, placeholder: '123-456-7890', validate: validateGoogleAdsId, tooltip: 'The 10-digit ID in the top-right of any Google Ads screen, formatted 123-456-7890. We need this exactly so our Manager link request lands on the right account.' },
      ],
    },
    {
      key: 'mcc_link',
      title: 'Accept MCC link request',
      whyWeAsk: 'Accepting our Manager Account (MCC) link is how Google grants us permission to optimise your campaigns without taking ownership of your account. You can revoke it from the same screen any time. Until you accept it, we can\'t actually run anything.',
      estimatedMinutes: 2,
      conditional: { path: 'google_ads.account_state.google_ads_account_exists', op: 'eq', value: 'Yes' },
      instructions: `Serenium sends a Manager Account (MCC) link request once we have your Customer ID. Accept it in **Google Ads → Tools & settings → Access and security → Managers**.`,
      fields: [
        { key: 'google_mcc_link_accepted', label: 'I accepted the MCC link request from Serenium', type: 'checkbox', required: true, tooltip: 'Tick this once you have approved our Manager link inside Google Ads. Until then, we have no way to build or optimise your campaigns.' },
      ],
    },
  ],
};

// ============================================================================
// GOOGLE BUSINESS PROFILE, NEW (extracted from Website)
// ============================================================================
const GOOGLE_BUSINESS_PROFILE: ServiceDef = {
  key: 'google_business_profile',
  label: 'Google Business Profile',
  description: 'Manager access so we can post, reply to reviews, and grow your reputation.',
  marketingDescription: 'Dominate the Google Map Pack so when neighbours search, you\'re the first call. Reviews, fresh photos, weekly posts, all handled.',
  modules: [
    {
      key: 'profile_state',
      title: 'Profile state',
      whyWeAsk: 'Your Google Business Profile is the listing that shows up when someone searches your name or "roofer near [city]". We need to know if it exists, is verified, or needs creating from scratch, because each path requires different help from us.',
      estimatedMinutes: 2,
      fields: [
        { key: 'gbp_profile_exists', label: 'Do you have a Google Business Profile?', type: 'select', required: true, options: ['Yes verified', 'Yes unverified', 'No', 'Not sure'], tooltip: 'Search your business name on Google, if a panel appears on the right with your address and reviews, you have one. "Verified" means there is a blue checkmark or you can edit it as the owner.' },
        { key: 'gbp_help_create', type: 'info',
          conditional: { any: [{ field: 'gbp_profile_exists', op: 'eq', value: 'No' }, { field: 'gbp_profile_exists', op: 'eq', value: 'Not sure' }] },
          content: "No problem, we'll create or claim one for you. You can skip the rest of this service, Serenium takes it from here. Need a hand in the meantime? Ask Aria or message the team." },
        { key: 'gbp_help_unverified', type: 'info',
          conditional: { field: 'gbp_profile_exists', op: 'eq', value: 'Yes unverified' },
          content: "All good. Google needs to verify the listing (usually by postcard or phone) before we can be added as a Manager. **If you need help with that step, just reach out and we'll walk you through it.** Once it's verified, come back here and the next steps will unlock." },
      ],
    },
    {
      key: 'ownership',
      title: 'Confirm ownership',
      whyWeAsk: 'A surprising number of roofers find that an old contractor or marketing company still owns their Google Business Profile. We need you to confirm it is genuinely yours before we touch it, otherwise we end up working on the wrong listing.',
      estimatedMinutes: 1,
      conditional: { any: [
        { path: 'google_business_profile.profile_state.gbp_profile_exists', op: 'eq', value: 'Yes verified' },
        { path: 'google_business_profile.profile_state.gbp_profile_exists', op: 'eq', value: 'Yes unverified' },
      ] },
      fields: [
        { key: 'gbp_ownership_confirmed', label: "I confirm I'm the verified owner of this Google Business Profile, not a third party, and not a stolen or old listing", type: 'checkbox', required: true, tooltip: 'A surprising number of roofers find an old agency or former employee owns their listing. Confirm you genuinely control it before we touch it, otherwise we end up working on the wrong profile.' },
      ],
    },
    {
      key: 'manager_access',
      title: 'Grant Manager access',
      whyWeAsk: 'Manager access lets us post updates, reply to reviews, and add photos to your listing without you having to log in every time. It does not give us ownership, you can remove us with one click, and we can never delete the profile.',
      estimatedMinutes: 3,
      conditional: { path: 'google_business_profile.profile_state.gbp_profile_exists', op: 'eq', value: 'Yes verified' },
      instructions: `In your Google Business Profile dashboard → **Users** → **Add users** → add \`contact@sereniumai.com\` as a **Manager**.`,
      fields: [
        { key: 'gbp_manager_access_granted', label: 'Added contact@sereniumai.com as a Manager', type: 'checkbox', required: true, tooltip: 'Manager (not Owner) access lets us post updates, reply to reviews, and add photos without taking ownership. You can remove us with one click any time.' },
      ],
      links: {
        'Official Google guide': 'https://support.google.com/business/answer/3403100?hl=en',
      },
    },
  ],
};

// ============================================================================
// AI SMS
// ============================================================================
const AI_SMS: ServiceDef = {
  key: 'ai_sms',
  label: 'AI SMS',
  description: 'Scripts, FAQs, and calendar setup so the AI can reply and book leads for you.',
  marketingDescription: 'An AI that texts every lead back in 10 seconds, qualifies them, and books estimates straight into your calendar. 24/7, no missed leads.',
  modules: [
    {
      key: 'purpose_goal',
      title: 'Purpose & goal',
      whyWeAsk: 'There is a different optimal AI strategy for "book every lead an estimate" versus "qualify hard, only book serious buyers". Telling us your single most important outcome means we can tune the AI for that one number.',
      estimatedMinutes: 2,
      fields: [
        {
          key: 'sms_primary_goal',
          label: 'What should the AI do?',
          type: 'multiselect',
          required: true,
          options: ['Book a free estimate', 'Book a phone consultation / sales call', 'Qualify the lead and hand off to a human'],
          tooltip: 'The single most important outcome you want from every text conversation. We tune the entire AI script around this, so picking one or two beats picking all three.',
        },
      ],
    },
    {
      key: 'scripts_behaviour',
      title: 'Scripts & behaviour',
      estimatedMinutes: 20,
      instructions: `The more specific you are here, the more your AI sounds like you.`,
      fields: [
        {
          key: 'sms_opening_message',
          label: 'Opening message',
          type: 'textarea',
          required: true,
          placeholder: "Hi [Name], thanks for reaching out to [Company] about your roof! I'm [AI Name], happy to help you get a free estimate. Mind if I grab a few quick details?",
          helpText: 'First message the AI sends to a new lead.',
          tooltip: 'The exact opening text the AI sends every new lead. Keep it warm and short, use [Name] and [Company] placeholders, and avoid overly formal language since this is SMS.',
        },
        {
          key: 'sms_qualification_questions',
          label: 'Info the AI must gather before booking',
          type: 'repeatable',
          required: true,
          helpText: 'Ordered. Typical roofing: full name, service address, roof age, material, insurance vs cash, urgency.',
          tooltip: 'The questions the AI must get answered before it books. Order matters, ask the easy ones (name, address) first and the trickier ones (insurance vs cash) once they are warmed up.',
        },
        {
          key: 'sms_faqs',
          label: 'FAQs (question + ideal answer)',
          type: 'repeatable',
          minItems: 5,
          required: true,
          helpText: 'Minimum 5. Cover service area, warranty, pricing, availability, insurance work, emergency service, financing.',
          tooltip: 'For each common question, give the AI the exact answer in your voice. Example Q: "Do you do insurance claims?" A: "Yes, we work with all major Canadian insurers and handle the paperwork." More FAQs means fewer awkward AI moments.',
        },
        {
          key: 'sms_pricing_stance',
          label: 'Pricing stance',
          type: 'select',
          required: true,
          options: ['Share ranges', 'Share specifics', 'Always punt to human'],
          helpText: 'Most roofers pick "punt to human".',
          tooltip: 'How the AI should handle "how much?". Most roofers pick "punt to human" because every roof is different and quoting blind hurts conversion. Ranges work if you are confident on typical costs.',
        },
        { key: 'sms_ai_never_say', label: 'Guardrails, things the AI should NEVER say', type: 'textarea', required: true, tooltip: "Hard limits. Examples: don't guarantee prices, don't commit to a specific date without checking the calendar, don't mention competitors by name." },
      ],
    },
    {
      key: 'operational',
      title: 'Operational',
      whyWeAsk: 'Speed-to-lead beats every other conversion lever. Telling us your target response time, when to disqualify, and who picks up if the AI hits a wall keeps the AI fast on the easy stuff and never strands a real lead with no response.',
      estimatedMinutes: 5,
      fields: [
        {
          key: 'sms_response_time_sla',
          label: 'Target response time',
          type: 'slider',
          slider: { min: 10, max: 60, step: 10, default: 10, suffix: 's' },
          helpText: 'Speed-to-lead is the biggest conversion lever. Lower = better.',
          tooltip: 'How fast the AI replies to a brand-new lead. Studies put 5-minute response 100x better than 30-minute. We default to 10 seconds for a reason, leave it unless you have a strong reason.',
        },
        { key: 'sms_disqualification_criteria', label: 'When the AI politely ends the chat', type: 'textarea', helpText: 'e.g. outside service area, wrong service, too-small job.', tooltip: 'When the AI should politely wrap up rather than book. Example: "outside our 50km service radius, residential-only inquiries for commercial buildings, jobs under $1k". Saves you wasted estimate visits.' },
        { key: 'sms_human_handoff_enabled', label: 'Allow handoff to a human?', type: 'select', required: true, options: ['Yes', 'No'], tooltip: 'If Yes, the AI forwards the conversation to a real person when the lead asks or gets stuck. Recommended, catches edge cases the AI can\'t resolve.' },
        { key: 'sms_human_handoff_triggers', label: 'What triggers a handoff?', type: 'textarea', required: true, conditional: { field: 'sms_human_handoff_enabled', op: 'eq', value: 'Yes' }, tooltip: 'Words or situations that should always pull a real person in. Example: "asks for the owner, mentions a lawyer, complains about a previous job, asks a question the AI cannot answer twice in a row".' },
        {
          key: 'sms_human_handoff_recipient',
          label: 'Who takes over',
          type: 'structured',
          required: true,
          conditional: { field: 'sms_human_handoff_enabled', op: 'eq', value: 'Yes' },
          tooltip: 'The single person whose phone buzzes when the AI hands off. Pick someone who actually checks their phone fast, this is where hot leads land.',
          schema: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'phone', label: 'Phone', type: 'phone', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
          ],
        },
      ],
    },
    {
      key: 'emergency_handling',
      title: 'Emergency handling',
      whyWeAsk: 'You told us in Business Profile that you handle emergencies. This is where we tell the AI exactly what an emergency looks like in your words and where to escalate it instantly. The faster you get a leak call, the higher chance you win the job.',
      estimatedMinutes: 4,
      conditional: { path: 'business_profile.emergency_service.emergency_offered', op: 'eq', value: 'Yes' },
      fields: [
        { key: 'sms_emergency_enabled', label: 'Does the AI handle emergency leads?', type: 'select', required: true, options: ['Yes', 'No'], tooltip: 'If Yes, the AI watches for emergency keywords and escalates immediately instead of going through the normal qualification flow.' },
        { key: 'sms_emergency_definition', label: 'What counts as an emergency?', type: 'textarea', required: true, conditional: { field: 'sms_emergency_enabled', op: 'eq', value: 'Yes' }, tooltip: 'In your words: what keywords or situations should flip the AI into emergency mode? E.g. "active leak, water coming through ceiling, tarp needed, storm damage today".' },
        {
          key: 'sms_emergency_recipient',
          label: 'Who to escalate emergencies to',
          type: 'structured',
          required: true,
          conditional: { field: 'sms_emergency_enabled', op: 'eq', value: 'Yes' },
          tooltip: 'The cell phone that should ring at any hour for emergencies. Usually the owner. Emergency leads have the highest close rate, do not put a generic inbox here.',
          schema: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'phone', label: 'Phone', type: 'phone', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
          ],
        },
      ],
    },
    {
      key: 'casl',
      title: 'CASL compliance (existing site)',
      whyWeAsk: 'Canadian law (CASL) requires explicit consent before any AI-assisted SMS follow-up, with fines up to $10M per violation. If we are not building you a new site, you need to add the consent language to your existing one yourself. We give you the exact wording.',
      estimatedMinutes: 5,
      // Skip this module when Serenium is building the client's new site,
      // CASL language ships baked into the new site automatically.
      conditional: { serviceEnabled: 'website', expected: false },
      instructions: `Canada's Anti-Spam Legislation requires explicit consent before AI-assisted SMS follow-up. You need two things on your existing site.

**Add this checkbox to your existing lead forms:**

☐ *By checking this box, I consent to receive SMS, email, and phone communications from [Company Name] regarding my roof inquiry, including via automated / AI-assisted tools. I can opt out anytime by replying STOP.*

**Add this language to your Terms / Privacy Policy:**

*"By submitting this form or engaging our services, you consent to communications from us and our authorized agents (including AI-assisted SMS, email, and phone) in accordance with Canada's Anti-Spam Legislation (CASL). You may withdraw consent at any time by replying STOP to any message."*`,
      fields: [
        { key: 'sms_external_site_consent_checkbox_added', label: 'Added the consent checkbox to my existing lead forms', type: 'checkbox', required: true, tooltip: 'Tick once the exact consent checkbox shown above is live on every lead form on your existing site. Without it, AI follow-up is illegal under CASL.' },
        { key: 'sms_external_site_terms_updated',         label: 'Updated my Terms / Privacy Policy to disclose AI-assisted follow-up', type: 'checkbox', required: true, tooltip: 'Tick once your Terms or Privacy Policy contains the disclosure language above. Required by CASL so customers know AI tools may follow up on their behalf.' },
      ],
    },
    {
      key: 'booking',
      title: 'Booking',
      whyWeAsk: 'Whatever calendar you already use, we work with it. The list of info the AI captures before booking is the same info that ends up in the booking notification you receive, so you can show up to the estimate already prepared.',
      estimatedMinutes: 4,
      fields: [
        {
          key: 'sms_existing_calendar_tool',
          label: 'What do you currently use for booking?',
          type: 'select',
          required: true,
          options: ['Cal.com', 'Calendly', 'Google Calendar', 'Acuity', 'Square Appointments', 'Other', 'None yet, Serenium to set up'],
          tooltip: 'Whatever you use today for keeping track of estimate appointments. Pick "None yet" and we will set up a Google Calendar integration for you, no extra cost.',
        },
        {
          key: 'sms_existing_calendar_other',
          label: 'Which tool?',
          type: 'text',
          conditional: { field: 'sms_existing_calendar_tool', op: 'eq', value: 'Other' },
          tooltip: 'Tell us the name so we can check whether it integrates cleanly. If it does not, we will recommend the closest alternative.',
        },
        {
          key: 'sms_booking_info_required',
          label: 'Info the AI must capture before booking',
          type: 'multiselect',
          required: true,
          options: [
            'Full name',
            'Phone number',
            'Email address',
            'Service address (where the roof is)',
            'Service needed (leak repair / full replacement / inspection / etc.)',
            'Roof age',
            'Roof material',
            'Insurance claim vs cash',
            'Urgency / timeframe',
            'Preferred appointment time',
            'How they heard about the company',
          ],
          helpText: 'Drives both the qualification script and the content of booking notifications.',
          tooltip: 'Tick everything you want the AI to confirm before it books. The same list shows up in your booking notification email, so pick what you actually want to see before you arrive on site.',
        },
        { key: 'sms_booking_info_custom', label: 'Anything else the AI should capture?', type: 'textarea', tooltip: 'Free-form additions, e.g. "ask if there are pets on site", "confirm gate code", "ask whether prior estimates exist". Each item gets folded into the AI script.' },
      ],
    },
    {
      key: 'booking_notifications',
      title: 'Booking notifications',
      whyWeAsk: 'When the AI books an estimate, we ping you the moment it happens, not in a daily digest. Tell us how you want to be told (SMS, email, or both) and who on your team should get it.',
      estimatedMinutes: 4,
      fields: [
        { key: 'notification_method', label: 'How do you want to be notified?', type: 'multiselect', required: true, options: ['SMS', 'Email', 'Both'], tooltip: 'How you find out the moment a booking lands. Most owners pick "Both", SMS for the buzz, email for the full details and lead history.' },
        {
          key: 'appointment_notification_recipients',
          label: 'Who gets notified (name, phone, email each)',
          type: 'repeatable',
          required: true,
          helpText: 'System uses whichever channel matches your preference above, include both phone AND email for each person.',
          tooltip: 'Each person who should be pinged when a new estimate is booked. Include name, mobile, and email. The owner plus one back-up is the typical setup.',
        },
      ],
    },
    {
      key: 'ghl_calendar_setup',
      title: 'Connect your Google Calendar',
      whyWeAsk: 'This is the actual handshake that lets the AI drop a real appointment on your calendar without double-booking. The 10 minutes you spend here is the difference between "AI texts about a lead" and "AI books the lead while you are on a roof".',
      estimatedMinutes: 10,
      videoUrl: 'https://www.youtube.com/watch?v=KcdUwD3I5ms',
      instructions: `Connect your Google Calendar so the AI can book estimates straight in, and set your weekly availability.`,
      fields: [
        { key: 'calendar_connected', label: "I've connected my Google Calendar to my GHL account", type: 'checkbox', required: true, tooltip: 'Tick once you have linked Google Calendar inside the GHL account we provided. This is the handshake that lets the AI drop appointments straight onto your calendar without double-booking.' },
        {
          key: 'weekly_availability',
          label: 'Weekly availability (Mon–Fri)',
          type: 'weekly_availability',
          required: true,
          helpText: 'Toggle a day to "Closed" if you don\'t work that day. Add an optional break window (e.g. lunch) to block the AI from booking during it.',
          tooltip: 'When the AI is allowed to book estimates, separate from your business hours. Add a lunch break window so estimates do not get squeezed into your sandwich time.',
        },
      ],
    },
  ],
};

// ============================================================================
// AI RECEPTIONIST
// ============================================================================
const AI_RECEPTIONIST: ServiceDef = {
  key: 'ai_receptionist',
  label: 'AI Receptionist',
  description: 'Greeting, question flow, and forwarding so the AI can answer and qualify your calls.',
  marketingDescription: 'A phone AI that answers every call professionally, qualifies the caller, and books the job. Never miss another lead, even at 11pm.',
  modules: [
    {
      key: 'purpose_goal',
      title: 'Purpose & goal',
      whyWeAsk: 'There are two completely different ways to use a phone AI: qualify the caller and warm-transfer them to you, or capture the info and let you call them back. Tell us which one you want and we tune the whole behaviour around it.',
      estimatedMinutes: 2,
      fields: [
        {
          key: 'retell_primary_goal',
          label: 'What should the AI do on every call?',
          type: 'multiselect',
          required: true,
          options: ['Qualify the caller then transfer to a human', 'Take messages (capture info + email summary)'],
          tooltip: 'Pick one: warm-transfer qualified callers to a real person, or have the AI take a full message and email you the summary. Different scripts, different outcomes, you can switch later.',
        },
      ],
    },
    {
      key: 'scripts_behaviour',
      title: 'Scripts & question flow',
      whyWeAsk: 'The greeting and questions you give us here are exactly what your AI receptionist will say to every caller, in your voice. Think of this as briefing a new front-desk hire on day one. The more specific you are, the more it sounds like you.',
      estimatedMinutes: 15,
      fields: [
        {
          key: 'retell_greeting_script',
          label: 'Greeting script',
          type: 'textarea',
          required: true,
          placeholder: "Thanks for calling [Company], this is [AI Name], how can I help you today?",
          tooltip: 'The first thing every caller hears. Keep it short, warm, and on-brand. Use [Company] and [AI Name] placeholders. This sets the tone for the entire call.',
        },
        {
          key: 'retell_question_flow',
          label: 'Question flow (ordered)',
          type: 'repeatable',
          required: true,
          helpText: 'Order matters. Typical roofing: name → address → roof type → age → reason → urgency → callback time.',
          tooltip: 'The questions the AI asks in order on every qualifying call. Easy first (name, address), then the deeper ones. Treat this like training a new front-desk hire.',
        },
        { key: 'retell_faqs', label: 'FAQs callers commonly ask', type: 'repeatable', required: true, tooltip: 'Question + ideal answer pairs for things callers always ask: hours, service area, warranty, financing, insurance work. The more you give, the less the AI fumbles.' },
        { key: 'retell_pricing_stance', label: 'Pricing stance', type: 'select', required: true, options: ['Share ranges', 'Always punt to human'], tooltip: 'How the AI handles "what does a roof cost?" on a phone call. Most roofers pick "punt to human" since pricing varies, but ranges are fine if you are confident on typical jobs.' },
        { key: 'retell_ai_never_say', label: 'Guardrails, never say', type: 'textarea', required: true, tooltip: 'Hard limits for the AI on calls. Examples: "do not promise specific prices, do not commit to dates without checking the calendar, do not name competitors, do not speculate on insurance coverage".' },
        { key: 'retell_voice_preference', label: 'Voice preference', type: 'select', options: ['Male', 'Female', 'No preference'], tooltip: 'The voice your callers hear. We will pick a natural-sounding option in your chosen gender. Some markets respond better to one or the other, "no preference" lets us A/B test.' },
      ],
    },
    {
      key: 'email_summaries',
      title: 'Email summaries',
      whyWeAsk: 'Every call the AI takes ends with a summary email so you can act fast without listening back. Tell us who should get it and what to capture, and a hot lead will land in your inbox within seconds of hanging up.',
      estimatedMinutes: 4,
      instructions: `Every call ends with an email summary. Pick the recipients and the info that should always appear in the email.`,
      fields: [
        { key: 'primary_email', label: 'Primary recipient', type: 'email', required: true, validate: validateEmail, tooltip: 'The main inbox that gets every call summary email. Pick whoever responds to leads fastest, every minute counts when a call summary lands.' },
        { key: 'additional_emails', label: 'Additional recipients (email)', type: 'repeatable', tooltip: 'Extra inboxes to copy on every summary (sales rep, office manager, etc.). All recipients get the same email at the same time.' },
        {
          key: 'retell_summary_info_required',
          label: 'Info to capture and include in every summary',
          type: 'multiselect',
          required: true,
          options: [
            "Caller's full name",
            'Phone number',
            'Service address',
            'Reason for call (leak / estimate / insurance claim / etc.)',
            'Roof age',
            'Roof material',
            'Urgency / timeframe',
            'Preferred callback time',
            'Insurance company (if claim-related)',
            'How they heard about the company',
            'Call recording link',
            'Full transcript',
          ],
          tooltip: 'Tick everything you want the AI to confirm and include in the summary email. The AI will work each item into the question flow naturally instead of reading them like a checklist.',
        },
        { key: 'retell_summary_info_custom', label: 'Anything else the AI should capture?', type: 'textarea', tooltip: 'Free-form additions specific to your business, e.g. "ask if they have had previous estimates, ask about HOA rules, confirm whether tenants or owners". Each gets folded into the script.' },
      ],
    },
    {
      key: 'human_transfer',
      title: 'Human transfer behaviour',
      whyWeAsk: 'Some callers will always insist on a real person, no matter how good the AI is. Telling us when to transfer (and to who at what hours) is what stops a frustrated caller from hanging up and dialling your competitor.',
      estimatedMinutes: 3,
      fields: [
        { key: 'retell_human_request_handling', label: 'When callers ask for a human', type: 'select', required: true, options: ['Transfer call', 'Always take message'], tooltip: 'What happens when a caller insists on a real person. Transferring keeps hot leads engaged, taking a message buys you time but loses some impatient callers.' },
        { key: 'retell_transfer_contacts', label: 'Who to transfer to (name, phone, hours)', type: 'repeatable', required: true, conditional: { field: 'retell_human_request_handling', op: 'eq', value: 'Transfer call' }, tooltip: 'Add each person who can take a transferred call, with their hours of availability. The AI rings them in order and falls through to the next if no answer.' },
      ],
    },
    {
      key: 'emergency_handling',
      title: 'Emergency handling',
      whyWeAsk: 'Emergency calls are the highest-intent calls you will ever get. The AI needs to recognise the keywords ("leak", "tarp", "storm", "water coming through") instantly and route the call to whoever can act fast, even if that is your cell at midnight.',
      estimatedMinutes: 3,
      conditional: { path: 'business_profile.emergency_service.emergency_offered', op: 'eq', value: 'Yes' },
      fields: [
        { key: 'retell_emergency_enabled', label: 'Does the AI handle emergency calls differently?', type: 'select', required: true, options: ['Yes', 'No'], tooltip: 'If Yes, the AI listens for emergency keywords and either transfers immediately or pages a specific person, instead of going through the standard flow.' },
        { key: 'retell_emergency_definition', label: 'What counts as an emergency on a phone call', type: 'textarea', required: true, conditional: { field: 'retell_emergency_enabled', op: 'eq', value: 'Yes' }, tooltip: 'In your words, the trigger phrases the AI should treat as urgent. E.g. "leak right now, water dripping inside, tarp needed today, storm just hit". These bypass the normal qualification flow.' },
      ],
    },
    {
      key: 'phone_number_setup',
      title: 'Phone number implementation',
      whyWeAsk: 'This is the final connection that makes the AI live. Either we forward your existing business line to the AI (most common) or we give you a brand new Serenium number to use everywhere. Either way the AI starts answering calls the moment this is wired.',
      estimatedMinutes: 10,
      lockedUntilAdminFlag: 'ai_receptionist_ready_for_connection',
      lockedMessage: "This step unlocks once we've built your AI. We'll let you know when it's ready.",
      fields: [
        {
          key: 'retell_phone_mode',
          label: 'How should calls reach the AI?',
          type: 'select',
          required: true,
          options: [
            "Option A, Use Serenium's AI phone number directly",
            'Option B, Keep existing number, forward to AI',
          ],
          tooltip: 'Option A is simpler but you advertise a new number. Option B keeps your existing number, calls forward to the AI (needs a quick setup on your phone).',
        },
        {
          key: 'retell_phone_option_a_info',
          type: 'info',
          conditional: { field: 'retell_phone_mode', op: 'eq', value: "Option A, Use Serenium's AI phone number directly" },
          content: "We'll give you a dedicated AI phone number to publish on your website, ads, and business cards. Calls go straight to the AI. No forwarding setup needed on your end.",
        },

        // Option B branch
        { key: 'retell_forwarding_mode', label: 'Forwarding mode', type: 'select', required: true,
          options: ['Immediate forward, phone never rings on my end', "Ring first, forward if unanswered"],
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
          tooltip: 'Immediate means every call goes straight to the AI (cleanest setup). Ring-first lets you grab the call yourself if you are free, falling back to the AI only if you miss it.',
        },
        { key: 'retell_phone_carrier', label: 'Your phone carrier', type: 'select', required: true,
          options: ['Rogers', 'Bell', 'Telus', 'Freedom', 'Koodo', 'Fido', 'Virgin Plus', 'Public Mobile', 'Lucky Mobile', 'Chatr', 'Other'],
          helpText: 'Canadian GSM standard: dial *004*[AI number]# to set forwarding, ##004# to cancel. Confirm with your carrier.',
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
          tooltip: 'We need this because forwarding setup codes vary slightly by carrier. Pick the one your business line is on.',
        },
        { key: 'retell_phone_brand', label: 'Your phone brand', type: 'select', required: true,
          options: ['Apple (iPhone)', 'Samsung (Galaxy)', 'Google (Pixel)', 'Motorola', 'OnePlus', 'Other Android'],
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
          tooltip: 'So we can show you the exact menu path for setting up call forwarding on your specific phone, since every brand hides it in a different place.',
        },

        // Per-brand inline steps
        { key: 'retell_brand_apple_info', type: 'info',
          conditional: { field: 'retell_phone_brand', op: 'eq', value: 'Apple (iPhone)' },
          content: '**🍎 Apple (iPhone), forwarding setup:**\n\n1. Open **Settings**\n2. Tap **Phone**\n3. Tap **Call Forwarding**\n4. Toggle **On**\n5. Enter the AI forwarding number provided by Serenium',
        },
        { key: 'retell_brand_samsung_info', type: 'info',
          conditional: { field: 'retell_phone_brand', op: 'eq', value: 'Samsung (Galaxy)' },
          content: '**📱 Samsung (Galaxy), forwarding setup:**\n\n1. Open the **Phone** app\n2. Tap the **3-dot menu** (top right)\n3. Tap **Settings → Supplementary services**\n4. Tap **Call forwarding → Voice call → Always forward**\n5. Enter the AI forwarding number and tap **Enable**',
        },
        { key: 'retell_brand_pixel_info', type: 'info',
          conditional: { field: 'retell_phone_brand', op: 'eq', value: 'Google (Pixel)' },
          content: '**🔵 Google (Pixel), forwarding setup:**\n\n1. Open the **Phone** app\n2. Tap **3-dot menu → Settings**\n3. Tap **Calls → Calling accounts**\n4. Select your carrier\n5. Tap **Call forwarding → Always forward**\n6. Enter the AI forwarding number',
        },
        { key: 'retell_brand_motorola_info', type: 'info',
          conditional: { field: 'retell_phone_brand', op: 'eq', value: 'Motorola' },
          content: '**🟠 Motorola, forwarding setup:**\n\n1. Open the **Phone** app\n2. Tap **3-dot menu → Settings**\n3. Tap **Calls → Call forwarding → Always forward**\n4. Enter the AI forwarding number',
        },
        { key: 'retell_brand_oneplus_info', type: 'info',
          conditional: { field: 'retell_phone_brand', op: 'eq', value: 'OnePlus' },
          content: '**🔴 OnePlus, forwarding setup:**\n\n1. Open the **Phone** app\n2. Tap **3-dot menu → Settings**\n3. Tap **Call settings → Call forwarding → Always forward**\n4. Enter the AI forwarding number',
        },
        { key: 'retell_brand_other_info', type: 'info',
          conditional: { field: 'retell_phone_brand', op: 'eq', value: 'Other Android' },
          content: '**⚙️ Other Android, forwarding setup:**\n\n1. Open the **Phone** app\n2. Go to **Settings → Calls → Call forwarding** (path varies by manufacturer skin)\n3. Select **Always forward**\n4. Enter the AI forwarding number\n\n**Fallback for any phone:** dial `*004*[AI number]#` on most Canadian carriers.',
        },

        // Safety checks (always shown in Option B)
        { key: 'retell_forwarding_setup_confirmed', label: "I've set up call forwarding using the steps above", type: 'checkbox', required: true,
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
          tooltip: 'Tick once you have actually walked through the steps for your phone. Without this we cannot mark the AI as live.',
        },
        { key: 'retell_forwarding_tested', label: "I've called my own number and confirmed the AI picked up", type: 'checkbox', required: true,
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
          tooltip: 'Always do a live test from a different phone before going live. If the AI does not answer, your customers will hit voicemail or silence, the worst possible launch day.',
        },
      ],
    },
  ],
};

// ============================================================================
// WEBSITE
// ============================================================================
const WEBSITE: ServiceDef = {
  key: 'website',
  label: 'Website',
  description: 'Brand, content, and tech access so we can build a site that ranks and converts.',
  marketingDescription: 'A premium website that ranks on Google, converts visitors into bookings, and makes you the obvious choice in town.',
  modules: [
    {
      key: 'purpose_goal',
      title: 'Purpose & goal',
      whyWeAsk: 'A site built to win phone calls looks completely different from one built for self-service bookings. Telling us what you want the site to do shapes every layout decision, every CTA, and every conversion path we wire up.',
      estimatedMinutes: 2,
      fields: [{
        key: 'website_primary_goal',
        label: 'What should the website accomplish?',
        type: 'multiselect',
        required: true,
        options: [
          'Generate inquiries via contact form',
          'Generate phone calls (click-to-call)',
          'Let customers self-book estimates',
          'Build credibility + provide info (brochure-style)',
        ],
        tooltip: 'Pick the one or two that matter most. Every CTA, layout choice, and conversion path on the site flows from this answer, so being honest about your priority job matters.',
      }],
    },
    {
      key: 'brand_and_design',
      title: 'Brand & design',
      whyWeAsk: 'Colours, fonts, and a few "I love this" reference sites give our designers a real starting point instead of a guess. The 3-sites-you-like exercise saves about a week of revision rounds, so spend a few minutes finding ones that genuinely feel like the standard you want.',
      estimatedMinutes: 12,
      fields: [
        { key: 'website_primary_color', label: 'Primary brand colour', type: 'color', required: true, tooltip: 'The dominant colour from your logo or existing brand. This becomes the main button colour, link colour, and accent across the entire site.' },
        { key: 'website_secondary_color', label: 'Secondary brand colour', type: 'color', required: true, tooltip: 'The supporting colour used for backgrounds, dividers, and accents. Pick something that works alongside your primary, not a clashing twin.' },
        { key: 'website_accent_color', label: 'Accent / tertiary colour', type: 'color', tooltip: 'Optional. A pop colour for highlights, badges, or a CTA button if you want it to stand out from your primary brand colour.' },
        { key: 'website_font_preference', label: 'Font preference (Google Font name or reference site)', type: 'text', tooltip: 'Either name a Google Font (e.g. "Inter", "Poppins") or paste a URL whose typography you love. Leave blank and we will pick something that suits roofing.' },
        { key: 'website_liked_sites', label: '3 websites you like (URL + why)', type: 'repeatable', required: true, minItems: 3, helpText: 'Minimum 3.', tooltip: 'Three sites you genuinely admire (any industry). Tell us what you like about each one (the hero, the photography, the booking flow). This saves a week of design revisions.' },
        { key: 'brand_guidelines_available', label: 'Do you have existing brand guidelines?', type: 'select', options: ['Yes', 'No'], tooltip: 'A PDF or doc that defines your colours, fonts, logo usage. Most small businesses do not have one, that is fine, we will derive a system from your logo and colour picks.' },
        { key: 'brand_guidelines_upload', label: 'Link to your brand guidelines (PDF on Drive / Dropbox)', type: 'url', placeholder: 'https://drive.google.com/…', helpText: 'Make sure the link is viewable by anyone with it.', conditional: { field: 'brand_guidelines_available', op: 'eq', value: 'Yes' }, tooltip: 'Drop a Google Drive or Dropbox link to the PDF. Set sharing to "anyone with the link can view" so our designers can open it without back-and-forth.' },
      ],
    },
    {
      key: 'brand_assets',
      title: 'Brand assets and content',
      whyWeAsk: 'Real photos of your jobs, your trucks, and your team beat stock photography on every metric. Drop a Drive folder so our designers can pick the best shots, no need to caption or organise them, just get the raw files to us.',
      estimatedMinutes: 10,
      fields: [
        {
          key: 'website_logo',
          label: 'Logo - Google Drive or Dropbox link',
          type: 'url',
          required: true,
          placeholder: 'https://drive.google.com/…',
          helpText: 'Anyone-with-the-link access.',
          conditional: { serviceEnabled: 'business_profile', expected: false },
          tooltip: 'Folder link with your original logo files (vector or high-res PNG). Set sharing to "anyone with the link can view" so designers can grab them without bottlenecks.',
        },
        { key: 'business_story', label: 'Business story (About page)', type: 'textarea', helpText: 'Origin, owner\'s story, values. Can be a voice-note reference too.', tooltip: 'How and why you started, what you stand for, who you serve. Even a rough draft beats us guessing. This becomes the heart of your About page, where homeowners decide they like you.' },
        {
          key: 'website_media_folder_link',
          label: 'Google Drive or Dropbox folder (photos, videos, other assets)',
          type: 'url',
          required: true,
          helpText: 'Suggested subfolders: Completed Jobs · Team · Building · Drone Footage · Video Testimonials · Equipment',
          tooltip: 'A single folder with every photo and video we can pull from. Real shots of your trucks, crews, and finished roofs always beat stock photos. No need to caption, just dump the raw files.',
        },
      ],
    },
    {
      key: 'lead_form_and_routing',
      title: 'Lead form & routing',
      whyWeAsk: 'The lead form is the single most important element on your site. Every other piece of design exists to drive people to it. Telling us what fields you want, what the CTA should say, and where the submission lands wires the whole conversion engine.',
      estimatedMinutes: 6,
      fields: [
        { key: 'lead_form_fields', label: 'Fields on the lead form', type: 'multiselect', required: true, options: ['Name', 'Phone', 'Email', 'Service needed', 'Timeframe', 'Address'], tooltip: 'Fewer fields = more submissions but lower quality. Three fields (name, phone, service) usually wins for roofers. Pick the minimum you actually need to call back.' },
        { key: 'primary_cta', label: 'Primary CTA across the site', type: 'select', required: true, options: ['Free quote', 'Book inspection', 'Call now', 'Financing'], tooltip: 'The action you most want every visitor to take. This becomes the headline button on every page. Pick one, having multiple competing CTAs lowers conversion.' },
        { key: 'submission_destination', label: 'Where should form submissions go?', type: 'multiselect', required: true, options: ['Email', 'CRM', 'Both'], tooltip: 'Where the lead lands the moment someone submits. "Both" is safest, you get an email alert and the CRM record in one shot.' },
        { key: 'email_destination', label: 'Email for lead notifications', type: 'email', required: true, validate: validateEmail, conditional: { field: 'submission_destination', op: 'includes', value: 'Email' }, tooltip: 'The inbox that gets a fresh email every time the form is submitted. Use a real, monitored address, not info@ unless someone actually watches it.' },
        { key: 'crm_choice', label: 'CRM', type: 'select', required: true,
          options: ['GoHighLevel (Serenium-managed)', 'GoHighLevel (their own)', 'HubSpot', 'Salesforce', 'Pipedrive', 'Zoho', 'JobNimbus', 'AccuLynx', 'Roofr', 'Other'],
          conditional: { field: 'submission_destination', op: 'includes', value: 'CRM' },
          tooltip: 'Which CRM should receive new leads. If you do not have one, "GoHighLevel (Serenium-managed)" is included and integrates cleanly with the AI SMS and Receptionist services.',
        },
      ],
    },
    {
      key: 'domain_and_hosting',
      title: 'Domain & hosting',
      whyWeAsk: 'Your domain is your most valuable digital asset. We need to know who currently controls it, where the site is hosted today, and whether your business email is tied to either, so we can plan a clean cutover with zero downtime and no broken inboxes.',
      estimatedMinutes: 5,
      fields: [
        { key: 'current_domain', label: 'Domain name', type: 'text', required: true, placeholder: 'surewestroofing.ca', validate: validateDomain, tooltip: 'Your existing domain (e.g. surewestroofing.ca). The new site will launch on this same domain so you keep all your SEO history and existing links.' },
        {
          key: 'has_dns_access',
          label: 'Do you currently have access to the domain so you can change DNS etc?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Not sure'],
          helpText: 'If No / Not sure, Serenium works with you to find who controls the domain (former employee, old agency, etc.) and get access through them.',
          tooltip: 'Whether you can log into the registrar (GoDaddy, Namecheap, etc.) and change DNS records. If No or Not sure, we will help you track down who has it, this is the most common launch blocker.',
        },
        { key: 'current_website_hosting_provider', label: 'Current hosting provider', type: 'select', required: true,
          options: ['GoDaddy', 'Bluehost', 'Hostinger', 'WPEngine', 'SiteGround', 'Vercel', 'Netlify', 'Squarespace', 'Wix', 'Shopify', 'WordPress.com', 'Webflow', 'Self-hosted', 'Other', 'Not sure'],
          tooltip: 'Where your current site is hosted today. We use this to plan a clean cutover to the new site without breaking links or losing email. Pick "Not sure" and we will help you figure it out.',
        },
        { key: 'email_hosting_status', label: 'Business email hosting', type: 'select', options: [
          'Google Workspace',
          'Microsoft 365 / Outlook',
          'Apple iCloud+',
          'GoDaddy Email',
          'Bluehost Email',
          'Hostinger Email',
          'Zoho Mail',
          'Proton Mail',
          'Fastmail',
          'Other',
          'Not sure',
          "Don't have business email yet",
        ], tooltip: 'Pick the platform hosting your @yourbusiness.ca inbox. If you don\'t have one yet, Serenium can set up Google Workspace for you.' },
      ],
    },
    {
      key: 'registrar_delegation',
      title: 'Registrar / DNS delegation',
      whyWeAsk: 'To launch your new site without downtime, we need temporary DNS access at your domain registrar (GoDaddy, Namecheap, etc.). We never transfer your domain. It stays in your name, we just point it at the new site when go-live day comes.',
      estimatedMinutes: 8,
      instructions: `Add **contact@sereniumai.com** to your registrar with admin / DNS-edit permissions. Pick your registrar below, we'll show you a walkthrough.`,
      fields: [
        { key: 'registrar', label: 'Your domain registrar', type: 'select', required: true, options: ['GoDaddy', 'Namecheap', 'Cloudflare', 'Other'], tooltip: 'Where the domain itself is registered (separate from where the site is hosted). Pick yours and we will show a step-by-step walkthrough below for that exact registrar.' },
        { key: 'other_registrar_info', type: 'info',
          conditional: { field: 'registrar', op: 'eq', value: 'Other' },
          content: "Log into your registrar. Find **Account Settings / User Management / Delegate Access**. Add `contact@sereniumai.com` with admin or DNS-edit permissions. If you can't find the option, contact the registrar's support." },
        { key: 'registrar_access_granted', label: "I've added contact@sereniumai.com as a delegate / user on my registrar with DNS-edit permissions", type: 'checkbox', required: true, tooltip: 'Tick once you have added us as a delegate or user with DNS-edit permission. We never transfer the domain, you stay the owner. We just need temporary access to point it at the new site on go-live day.' },
      ],
      conditionalLinks: {
        GoDaddy: 'https://www.youtube.com/watch?v=bir3uk0VtJE',
        Namecheap: 'https://www.youtube.com/watch?v=KfbgEDI4gK8',
        Cloudflare: 'https://developers.cloudflare.com/fundamentals/manage-members/manage/',
      },
    },
    {
      key: 'cms_access',
      title: 'Existing site / CMS access',
      whyWeAsk: 'If we are replacing an existing WordPress (or other CMS) site, we need temporary admin access to grab the content, redirect the old URLs, and avoid losing any SEO juice you have built up. Once the new site is live, you can revoke us with one click.',
      estimatedMinutes: 5,
      fields: [
        { key: 'has_current_site', label: 'Do you have a current website?', type: 'select', required: true, options: ['Yes', 'No'], tooltip: 'If Yes, we need temporary admin access so we can pull existing content, set up redirects, and protect your existing SEO when the new site goes live.' },
        { key: 'cms_platform', label: 'What platform is it on?', type: 'select', required: true, options: ['WordPress', 'Other'], conditional: { field: 'has_current_site', op: 'eq', value: 'Yes' }, tooltip: 'Most roofing sites are WordPress. Pick "Other" if it is on Wix, Squarespace, Webflow, or another builder, we will walk you through the access flow for that platform.' },
        { key: 'cms_access_granted', label: "I've added contact@sereniumai.com as an Administrator in WordPress", type: 'checkbox', required: true, conditional: { field: 'cms_platform', op: 'eq', value: 'WordPress' }, tooltip: 'Tick once contact@sereniumai.com is added as an Administrator inside your WordPress dashboard. Admin (not Editor) is needed so we can export content and configure redirects. You can revoke us with one click after launch.' },
      ],
      conditionalLinks: {
        WordPress: 'https://www.youtube.com/watch?v=ow9EU1pyVaI',
      },
    },
    {
      key: 'analytics_and_search_console',
      title: 'Analytics & Search Console',
      whyWeAsk: 'Without Google Analytics and Search Console properly set up, we are flying blind on what is actually working. These two tools are how we prove the ads, the AI, and the site are paying for themselves every month, and how we know what to double down on.',
      estimatedMinutes: 7,
      instructions: `Two quick checks. If you already have these set up, you'll add **contact@sereniumai.com** with the permissions shown. If you don't have them yet, Serenium sets them up as part of your site build.`,
      fields: [
        // Google Analytics branch
        { key: 'has_ga', label: 'Do you have Google Analytics set up?', type: 'select', required: true, options: ['Yes', 'No', 'Not sure'], tooltip: 'Google Analytics tracks who visits your site and what they do. If you have it, we link in to your existing data. If not, we set up GA4 fresh as part of the build.' },
        { key: 'ga_help_yes', type: 'info',
          conditional: { field: 'has_ga', op: 'eq', value: 'Yes' },
          label: 'Add Serenium as an Administrator',
          content: "Walk through how to add `contact@sereniumai.com` as an **Administrator** on your Google Analytics property:",
          videoUrl: 'https://www.youtube.com/watch?v=jKDykqKDMLI',
        },
        { key: 'ga_help_no', type: 'info',
          conditional: { field: 'has_ga', op: 'eq', value: 'No' },
          content: "No Google Analytics yet? No problem, Serenium sets one up for you as part of the site build. Skip to Search Console below.",
        },
        { key: 'ga_help_not_sure', type: 'info',
          conditional: { field: 'has_ga', op: 'eq', value: 'Not sure' },
          content: "Log into [analytics.google.com](https://analytics.google.com) with your main Google account. If you see properties listed, you have Analytics, change your answer above to Yes. If not, change to No and we'll handle it.",
        },
        { key: 'google_analytics_access_granted', label: "I've added contact@sereniumai.com as Administrator in Google Analytics", type: 'checkbox', required: true,
          conditional: { field: 'has_ga', op: 'eq', value: 'Yes' },
          tooltip: 'Administrator (not Viewer) is needed so we can configure conversion events, link Google Ads, and set up the proper goal tracking that proves your campaigns are working.',
        },

        // Google Search Console branch
        { key: 'has_gsc', label: 'Do you have Google Search Console set up?', type: 'select', required: true, options: ['Yes', 'No', 'Not sure'], tooltip: 'Search Console shows what people Google to find you. Critical for SEO. If you do not have it, we set it up and verify your site as part of the build.' },
        { key: 'gsc_help_yes', type: 'info',
          conditional: { field: 'has_gsc', op: 'eq', value: 'Yes' },
          label: 'Add Serenium as an Owner',
          content: "Follow Google's official guide to add `contact@sereniumai.com` as an **Owner**:",
          docLinks: [{ label: 'Google Search Console, add an Owner', url: 'https://support.google.com/webmasters/answer/7687615' }],
        },
        { key: 'gsc_help_no', type: 'info',
          conditional: { field: 'has_gsc', op: 'eq', value: 'No' },
          content: "No Search Console yet? Serenium sets it up and verifies your site as part of the build.",
        },
        { key: 'gsc_help_not_sure', type: 'info',
          conditional: { field: 'has_gsc', op: 'eq', value: 'Not sure' },
          content: "Log into [search.google.com/search-console](https://search.google.com/search-console) with your Google account. If you see verified properties, you have it set up.",
        },
        { key: 'search_console_access_granted', label: "I've added contact@sereniumai.com as Owner in Google Search Console", type: 'checkbox', required: true,
          conditional: { field: 'has_gsc', op: 'eq', value: 'Yes' },
          tooltip: 'Owner (not just User) access is needed so we can submit sitemaps, fix indexing issues, and verify the new site cleanly when it launches.',
        },
      ],
    },
  ],
};

// ============================================================================
// EXPORTS, SERVICES in dashboard order
// ============================================================================
export const SERVICES: ServiceDef[] = [
  BUSINESS_PROFILE,
  FACEBOOK_ADS,
  GOOGLE_ADS,
  GOOGLE_BUSINESS_PROFILE,
  AI_SMS,
  AI_RECEPTIONIST,
  WEBSITE,
];

export const SELECTABLE_SERVICES: ServiceDef[] = SERVICES;

export function getService(key: ServiceKey): ServiceDef | undefined {
  return SERVICES.find(s => s.key === key);
}

export function getModule(serviceKey: ServiceKey, moduleKey: string): ModuleDef | undefined {
  return getService(serviceKey)?.modules.find(m => m.key === moduleKey);
}
