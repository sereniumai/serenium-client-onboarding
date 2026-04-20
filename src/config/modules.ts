import type { ServiceKey } from '../types';

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'number'
  | 'select' | 'multiselect' | 'url' | 'color' | 'checkbox'
  | 'file' | 'file_multiple' | 'repeatable';

export interface Task {
  key: string;
  label: string;
  required?: boolean;
}

export type FieldCondition =
  | { field: string; op: 'eq'; value: string }
  | { field: string; op: 'neq'; value: string }
  | { field: string; op: 'includes'; value: string };

export interface Field {
  key: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  accept?: string;
  conditional?: FieldCondition;
}

export interface ModuleDef {
  key: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  videoUrl?: string;
  instructions?: string;
  tasks?: Task[];
  fields?: Field[];
  requiresPrevious?: boolean;
  /** Named links rendered as a list after instructions. */
  links?: Record<string, string>;
  /** Links that depend on another field's value (e.g. registrar). */
  conditionalLinks?: Record<string, string>;
}

export interface ServiceDef {
  key: ServiceKey;
  label: string;
  description: string;
  modules: ModuleDef[];
  /** If true, this section is always enabled for every client and shown first. */
  mandatory?: boolean;
}

// ============================================================================
// BUSINESS PROFILE — mandatory section, sits above service sections
// ============================================================================
const BUSINESS_PROFILE: ServiceDef = {
  key: 'business_profile',
  label: 'Business Profile',
  description: 'Core business info used across all services',
  mandatory: true,
  modules: [
    {
      key: 'years_in_business',
      title: 'Years in business',
      estimatedMinutes: 1,
      fields: [{ key: 'years_in_business', label: 'Years in business', type: 'number', required: true, placeholder: 'e.g. 12' }],
    },
    {
      key: 'service_areas',
      title: 'Service areas',
      estimatedMinutes: 3,
      fields: [{ key: 'service_areas', label: 'Cities / towns you serve', type: 'repeatable', required: true }],
    },
    {
      key: 'service_areas_priority',
      title: 'Service areas ranked by priority',
      estimatedMinutes: 3,
      fields: [{ key: 'service_areas_priority', label: 'Ranked by importance (most important first)', type: 'repeatable' }],
    },
    {
      key: 'services_offered',
      title: 'Services offered',
      estimatedMinutes: 5,
      fields: [{ key: 'services_offered', label: 'Service name + brief description', type: 'repeatable', required: true }],
    },
    {
      key: 'unique_selling_points',
      title: 'Unique selling points',
      estimatedMinutes: 3,
      fields: [{ key: 'usps', label: 'What makes you different from competitors?', type: 'textarea', required: true }],
    },
    {
      key: 'certifications',
      title: 'Certifications and credentials',
      estimatedMinutes: 2,
      fields: [{ key: 'certifications', label: 'Certifications (GAF, IKO, CRCA, etc.)', type: 'repeatable' }],
    },
    {
      key: 'awards',
      title: 'Awards or recognition',
      estimatedMinutes: 2,
      fields: [{ key: 'awards', label: 'Awards, Best of lists, recognition', type: 'repeatable' }],
    },
    {
      key: 'warranty',
      title: 'Warranty details',
      estimatedMinutes: 2,
      fields: [{ key: 'warranty', label: 'Warranty terms (workmanship + materials)', type: 'textarea' }],
    },
    {
      key: 'insurance',
      title: 'Insurance details',
      estimatedMinutes: 2,
      fields: [{ key: 'insurance', label: 'Liability, WCB, bonding — what you carry', type: 'textarea' }],
    },
    {
      key: 'financing',
      title: 'Financing options',
      estimatedMinutes: 2,
      fields: [
        { key: 'financing_offered', label: 'Do you offer financing?', type: 'select', options: ['Yes', 'No'], required: true },
        { key: 'financing_partners', label: 'Partners (Hearth, GreenSky, etc.)', type: 'repeatable', conditional: { field: 'financing_offered', op: 'eq', value: 'Yes' } },
      ],
    },
    {
      key: 'emergency_service',
      title: 'Emergency service',
      estimatedMinutes: 5,
      fields: [
        { key: 'emergency_offered', label: 'Do you offer emergency service?', type: 'select', options: ['Yes', 'No'], required: true },
        { key: 'emergency_services_list', label: 'What emergency services (storm damage, leaks, tarping, etc.)', type: 'textarea', conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' } },
        { key: 'emergency_hours', label: 'Hours of emergency availability', type: 'select', options: ['24/7', 'After-hours only', 'Specific hours'], conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' } },
        { key: 'emergency_phone', label: 'Emergency contact phone (if different from main)', type: 'phone', conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' } },
        { key: 'emergency_response_time', label: 'Typical response time', type: 'select', options: ['Within 1 hour', 'Same day', 'Next business day'], conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' } },
        { key: 'emergency_extra_charges', label: 'Extra charges for emergency calls?', type: 'select', options: ['Yes', 'No'], conditional: { field: 'emergency_offered', op: 'eq', value: 'Yes' } },
        { key: 'emergency_extra_charges_details', label: 'Details on extra charges', type: 'textarea', conditional: { field: 'emergency_extra_charges', op: 'eq', value: 'Yes' } },
      ],
    },
    {
      key: 'team_members',
      title: 'Team members',
      estimatedMinutes: 10,
      fields: [{ key: 'team_members', label: 'Name, role, years of experience, short bio, headshot', type: 'repeatable' }],
    },
  ],
};

// ============================================================================
// FACEBOOK ADS
// ============================================================================
const FACEBOOK_ADS: ServiceDef = {
  key: 'facebook_ads',
  label: 'Facebook Ads',
  description: 'Meta campaigns that drive qualified roofing leads',
  modules: [
    {
      key: 'grant_meta_access',
      title: 'Grant Meta Business Manager access',
      description: 'Add Serenium as a partner so we can run ads on your behalf.',
      estimatedMinutes: 10,
      instructions: `This is the fastest way to get us running. You'll add Serenium as a partner inside your Meta Business Manager — no password sharing required, and you can revoke access any time.

**What you'll need:**
- Admin access to your Facebook Page
- Access to your Meta Business Manager (business.facebook.com)

**Our Partner ID:** \`1234567890\` — copy this for the form below.

Walk through each task in order. Check each one off as you finish.`,
      tasks: [
        { key: 'meta_partner_added', label: 'Added Serenium partner ID in Business Settings', required: true },
        { key: 'meta_ads_manager_access', label: 'Assigned Ads Manager access', required: true },
        { key: 'meta_page_access', label: 'Assigned Facebook Page access', required: true },
        { key: 'meta_pixel_access', label: 'Assigned Pixel access', required: true },
        { key: 'meta_business_verified', label: 'Confirmed business verification status', required: false },
      ],
      fields: [
        { key: 'meta_business_id', label: 'Your Meta Business ID', type: 'text', required: true, placeholder: 'e.g. 9876543210', helpText: 'Find this under Business Settings → Business Info.' },
        { key: 'meta_page_name', label: 'Facebook Page name', type: 'text', required: true, placeholder: 'Sure West Roofing' },
        { key: 'meta_notes', label: 'Anything we should know?', type: 'textarea', placeholder: 'Optional — existing pixels, ad accounts, or previous agency setups.' },
      ],
    },
    {
      key: 'ad_account_billing',
      title: 'Set up ad account billing',
      description: 'Add a payment method on your ad account.',
      estimatedMinutes: 5,
      requiresPrevious: true,
      instructions: `Meta requires the ad account owner to add billing directly. **We never take payment credentials** — you'll add the card yourself in Ads Manager.

After you've added a card, fill out the confirmations below.`,
      tasks: [
        { key: 'billing_payment_method', label: 'Payment method added in Ads Manager', required: true },
        { key: 'billing_currency', label: 'Currency confirmed (CAD for most Canadian roofers)', required: true },
        { key: 'billing_timezone', label: 'Timezone confirmed (America/Toronto, America/Edmonton, etc.)', required: true },
      ],
      fields: [
        { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', required: true, placeholder: 'act_1234567890' },
        { key: 'ad_account_currency', label: 'Currency', type: 'select', options: ['CAD', 'USD'], required: true },
        { key: 'ad_account_timezone', label: 'Timezone', type: 'select', options: ['America/Edmonton', 'America/Toronto', 'America/Vancouver', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns'], required: true },
      ],
    },
    {
      key: 'brand_assets',
      title: 'Upload brand assets',
      description: 'Logo, job photos, video footage, and team photos.',
      estimatedMinutes: 15,
      requiresPrevious: true,
      instructions: `Quality creative = quality leads. The more you give us, the better the ads.

**Minimums we'd love to have:**
- 1 high-resolution logo (transparent PNG preferred)
- 15–30 photos of completed jobs (before/after pairs are gold)
- Any video footage you have — drone shots, crews working, timelapses, testimonials
- Photos of your team, especially the owner`,
      fields: [
        { key: 'brand_logo', label: 'Logo (transparent PNG preferred)', type: 'file', accept: 'image/*', required: true },
        { key: 'job_photos', label: 'Completed job photos (15–30 minimum)', type: 'file_multiple', accept: 'image/*', required: true },
        { key: 'video_footage', label: 'Video footage (optional but recommended)', type: 'file_multiple', accept: 'video/*' },
        { key: 'team_photos', label: 'Team photos — especially the owner', type: 'file_multiple', accept: 'image/*' },
      ],
    },
    {
      key: 'testimonials',
      title: 'Testimonials and social proof',
      description: 'Reviews, written testimonials, and video testimonials.',
      estimatedMinutes: 10,
      requiresPrevious: true,
      instructions: `Social proof closes leads faster than any ad copy. Upload whatever you have.`,
      fields: [
        { key: 'review_screenshots', label: 'Google review screenshots', type: 'file_multiple', accept: 'image/*' },
        { key: 'written_testimonials', label: 'Written testimonials', type: 'repeatable', helpText: 'Name, location, and the testimonial text.' },
        { key: 'video_testimonials', label: 'Video testimonials (optional)', type: 'file_multiple', accept: 'video/*' },
      ],
    },
    {
      key: 'landing_page',
      title: 'Landing page setup',
      description: 'Where leads land after clicking your ad.',
      estimatedMinutes: 5,
      requiresPrevious: true,
      instructions: `Two options: use our pre-built landing page template, or we'll install the Meta Pixel on your existing site.`,
      fields: [
        { key: 'landing_page_choice', label: 'Landing page option', type: 'select', required: true, options: ['Use Serenium landing page', 'Use my own website'] },
        { key: 'landing_page_subdomain', label: 'Preferred subdomain (if using Serenium page)', type: 'text', placeholder: 'offers.surewest.ca' },
        { key: 'existing_site_url', label: 'Existing site URL (if using own)', type: 'url', placeholder: 'https://surewest.ca' },
        { key: 'existing_site_access', label: 'Site admin access handoff', type: 'textarea', placeholder: 'Hosting login, WordPress admin, etc. — we\'ll handle pixel install.' },
      ],
    },
  ],
};

// ============================================================================
// AI SMS
// ============================================================================
const AI_SMS: ServiceDef = {
  key: 'ai_sms',
  label: 'AI SMS',
  description: 'Automated lead qualification in under 60 seconds',
  modules: [
    {
      key: 'connect_calendar',
      title: 'Connect your Google Calendar',
      description: 'So the AI can book appointments directly into your calendar.',
      estimatedMinutes: 15,
      instructions: `This is the most common stall point — do it now so the rest goes smoothly.

Walk through the steps below in GoHighLevel (GHL). If you don't have GHL access yet, ping us and we'll invite you.`,
      tasks: [
        { key: 'ghl_login', label: 'Logged into GHL', required: true },
        { key: 'ghl_calendar_settings', label: 'Navigated to Calendar settings', required: true },
        { key: 'ghl_connect_clicked', label: 'Clicked Connect → Google', required: true },
        { key: 'ghl_authorized', label: 'Authorized Google Calendar access', required: true },
        { key: 'ghl_calendar_selected', label: 'Selected the correct calendar', required: true },
        { key: 'ghl_availability_set', label: 'Set availability windows', required: true },
        { key: 'ghl_connection_confirmed', label: 'Confirmed connection visible in GHL', required: true },
      ],
    },
    {
      key: 'availability',
      title: 'Set availability and booking preferences',
      description: 'When are you available, and how should bookings flow?',
      estimatedMinutes: 10,
      requiresPrevious: true,
      instructions: `These rules drive every AI conversation. Be realistic — overcommitting means the AI books slots you can't actually hit.`,
      fields: [
        { key: 'working_hours', label: 'Working hours per day', type: 'repeatable', required: true, helpText: 'e.g. Mon 8am–5pm, Tue 8am–5pm…' },
        { key: 'lunch_breaks', label: 'Lunch breaks', type: 'text', placeholder: '12:00pm – 1:00pm' },
        { key: 'weekend_availability', label: 'Weekend availability', type: 'select', options: ['None', 'Saturday only', 'Saturday & Sunday'] },
        { key: 'buffer_minutes', label: 'Buffer between appointments (minutes)', type: 'number', placeholder: '30' },
        { key: 'max_bookings_per_day', label: 'Max bookings per day', type: 'number', placeholder: '4' },
        { key: 'min_notice_hours', label: 'Minimum notice period (hours)', type: 'number', placeholder: '24' },
      ],
    },
    {
      key: 'train_ai',
      title: 'Train your AI assistant',
      description: 'Voice, FAQs, objections, pricing guidance.',
      estimatedMinutes: 30,
      requiresPrevious: true,
      instructions: `This is the brains of the operation. The more specific you are, the more your AI sounds like you.`,
      fields: [
        { key: 'tone_of_voice', label: 'Tone of voice', type: 'select', required: true, options: ['Casual & friendly', 'Professional', 'Direct & no-nonsense', 'Warm & consultative'] },
        { key: 'faqs', label: 'Frequently asked questions (minimum 5)', type: 'repeatable', required: true, helpText: 'Question + your ideal answer.' },
        { key: 'objections', label: 'Common objections & responses', type: 'repeatable', required: true, helpText: 'e.g. "Too expensive" → "Here\'s why it\'s worth it…"' },
        { key: 'pricing_guidance', label: 'Pricing guidance', type: 'textarea', required: true, helpText: 'What can the AI ballpark vs punt to a human?' },
        { key: 'qualifiers', label: 'Service qualifiers', type: 'textarea', helpText: 'Roof age, material type, insurance vs cash, urgency — what do you need to know to qualify a lead?' },
      ],
    },
    {
      key: 'notifications',
      title: 'Notification preferences',
      description: 'Who gets pinged when an appointment books?',
      estimatedMinutes: 5,
      requiresPrevious: true,
      instructions: `Every booked appointment will ping you in real time. Pick your preferred method.`,
      fields: [
        { key: 'notification_recipients', label: 'Who gets notified?', type: 'repeatable', required: true, helpText: 'Name, phone, email for each person.' },
        { key: 'notification_backup', label: 'Backup contact', type: 'text' },
        { key: 'notification_method', label: 'Preferred notification method', type: 'multiselect', options: ['SMS', 'Email', 'Both'], required: true },
        { key: 'after_hours_handling', label: 'After-hours handling preference', type: 'select', options: ['AI handles & books, notify next morning', 'AI handles & pings immediately', 'AI asks lead to wait, pings you'] },
      ],
    },
    {
      key: 'casl_consent',
      title: 'Lead form consent language (CASL)',
      description: 'Canadian anti-spam compliance for SMS messages.',
      estimatedMinutes: 10,
      requiresPrevious: true,
      instructions: `**CASL requires express consent** before we can text a lead. Your lead form must have explicit SMS opt-in language.

If you're using Serenium's lead form, we've already handled this. If you're using your own, upload a screenshot for our review.`,
      tasks: [{ key: 'casl_consent_confirmed', label: 'Lead form has express SMS consent language', required: true }],
      fields: [
        { key: 'lead_form_source', label: 'Lead form source', type: 'select', required: true, options: ['Using Serenium lead form', 'Using my own form (upload screenshot)'] },
        { key: 'lead_form_screenshot', label: 'Screenshot of your consent checkbox', type: 'file', accept: 'image/*' },
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
  description: 'Custom website build with foundational SEO baked in',
  modules: [
    {
      key: 'brand_and_style',
      title: 'Brand and style',
      estimatedMinutes: 15,
      instructions: `Paint us a picture of your brand. Share colors, logos, fonts, and a few sites that capture the feel you want.`,
      fields: [
        { key: 'primary_color', label: 'Primary brand color', type: 'color', required: true },
        { key: 'secondary_color', label: 'Secondary brand color', type: 'color', required: true },
        { key: 'accent_color', label: 'Accent / tertiary color (optional)', type: 'color' },
        { key: 'logo_files', label: 'Logo files (high-res PNG transparent + SVG if available)', type: 'file_multiple', accept: 'image/*', required: true },
        { key: 'brand_guidelines', label: 'Any existing brand guidelines (PDF)', type: 'file' },
        { key: 'typography_preferences', label: 'Typography preferences (if any)', type: 'textarea' },
        { key: 'liked_websites', label: '3 websites you like + why', type: 'repeatable', required: true },
        { key: 'disliked_websites', label: '1–2 websites you dislike + why', type: 'repeatable' },
      ],
    },
    {
      key: 'imagery_and_media',
      title: 'Imagery and media',
      estimatedMinutes: 10,
      instructions: `Share a link to a Google Drive or Dropbox folder with all your photos and videos.

**Suggested subfolders:**
- Completed Jobs
- Team
- Building
- Drone Footage
- Video Testimonials
- Equipment`,
      fields: [
        { key: 'media_folder_link', label: 'Google Drive / Dropbox folder link', type: 'url', required: true, helpText: 'Make sure the link has view access for contact@sereniumai.com or anyone with the link.' },
      ],
    },
    {
      key: 'content',
      title: 'Content',
      estimatedMinutes: 15,
      instructions: `Tell us your story and the questions customers ask you most.`,
      fields: [
        { key: 'business_story', label: 'Business story (text or voice note)', type: 'textarea' },
        { key: 'faq_questions', label: 'Common customer questions for FAQ page', type: 'repeatable' },
      ],
    },
    {
      key: 'forms_and_conversion',
      title: 'Forms and conversion',
      estimatedMinutes: 10,
      instructions: `How should leads reach you? Pick the fields on your lead form and where submissions go.`,
      fields: [
        { key: 'lead_form_fields', label: 'Lead form fields', type: 'multiselect', required: true, options: ['Name', 'Phone', 'Email', 'Service needed', 'Timeframe', 'Address'] },
        { key: 'primary_cta', label: 'Primary CTA across the site', type: 'select', required: true, options: ['Free quote', 'Book inspection', 'Call now', 'Financing'] },
        { key: 'submission_destination', label: 'Where should submissions go?', type: 'multiselect', required: true, options: ['Email', 'CRM', 'Both'] },
        { key: 'email_destination', label: 'Email address for lead notifications', type: 'email', conditional: { field: 'submission_destination', op: 'includes', value: 'Email' } },
        { key: 'crm_choice', label: 'CRM', type: 'select', options: ['GoHighLevel (Serenium-managed)', 'GoHighLevel (their own)', 'HubSpot', 'Salesforce', 'Pipedrive', 'Zoho', 'JobNimbus', 'AccuLynx', 'Roofr', 'Other'], conditional: { field: 'submission_destination', op: 'includes', value: 'CRM' } },
      ],
    },
    {
      key: 'domain_access',
      title: 'Domain access',
      estimatedMinutes: 10,
      instructions: `Add **contact@sereniumai.com** to your registrar with admin or DNS-edit permissions. Pick your registrar below — we'll show you the exact steps.`,
      fields: [
        { key: 'registrar', label: 'Your domain registrar', type: 'select', required: true, options: ['GoDaddy', 'Namecheap', 'Cloudflare', 'Squarespace', 'Other'] },
        { key: 'access_granted_confirmation', label: 'I have added contact@sereniumai.com with the required permissions', type: 'checkbox' },
      ],
      conditionalLinks: {
        GoDaddy: 'https://www.godaddy.com/help/invite-a-delegate-to-access-my-godaddy-account-12376',
        Namecheap: 'https://www.namecheap.com/support/knowledgebase/article.aspx/192/46/how-do-i-share-access-to-my-domain-with-other-users/',
        Cloudflare: 'https://developers.cloudflare.com/fundamentals/manage-members/manage/',
        Squarespace: 'https://support.squarespace.com/hc/en-us/articles/25974568684557-Managing-domain-permissions',
      },
    },
    {
      key: 'cms_access',
      title: 'CMS / existing site access',
      estimatedMinutes: 5,
      instructions: `If you have an existing site we'll need access to it during migration. If not, skip this step.`,
      fields: [
        { key: 'has_current_site', label: 'Do you have a current website?', type: 'select', options: ['Yes', 'No'], required: true },
        { key: 'cms_platform', label: 'What platform is it on?', type: 'select', options: ['WordPress', 'Other'], conditional: { field: 'has_current_site', op: 'eq', value: 'Yes' } },
        { key: 'access_granted_confirmation', label: 'I have added contact@sereniumai.com as an Administrator', type: 'checkbox', conditional: { field: 'cms_platform', op: 'eq', value: 'WordPress' } },
      ],
      conditionalLinks: {
        WordPress: 'https://yoast.com/help/how-do-i-add-a-new-admin-user/',
      },
    },
    {
      key: 'analytics_and_tracking',
      title: 'Analytics and tracking access',
      estimatedMinutes: 10,
      instructions: `Add **contact@sereniumai.com** to all three Google services below at the permission levels listed.`,
      fields: [
        { key: 'ga_access_granted', label: 'Added contact@sereniumai.com to Google Analytics as Administrator', type: 'checkbox' },
        { key: 'gsc_access_granted', label: 'Added contact@sereniumai.com to Google Search Console as Owner', type: 'checkbox' },
        { key: 'gbp_access_granted', label: 'Added contact@sereniumai.com to Google Business Profile as Manager', type: 'checkbox' },
      ],
      links: {
        'Google Analytics (Administrator)': 'https://support.google.com/analytics/answer/9305788#Add',
        'Google Search Console (Owner)': 'https://support.google.com/webmasters/answer/7687615',
        'Google Business Profile (Manager)': 'https://support.google.com/business/answer/3403100',
      },
    },
  ],
};

// ============================================================================
// EXPORTS
// ============================================================================
export const SERVICES: ServiceDef[] = [BUSINESS_PROFILE, FACEBOOK_ADS, AI_SMS, WEBSITE];

/** Services admins select per client. Business Profile is always on. */
export const SELECTABLE_SERVICES: ServiceDef[] = SERVICES.filter(s => !s.mandatory);

export function getService(key: ServiceKey): ServiceDef | undefined {
  return SERVICES.find(s => s.key === key);
}

export function getModule(serviceKey: ServiceKey, moduleKey: string): ModuleDef | undefined {
  return getService(serviceKey)?.modules.find(m => m.key === moduleKey);
}
