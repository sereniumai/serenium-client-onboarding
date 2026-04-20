import type { ServiceKey } from '../types';
import type { Condition } from '../lib/condition';

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'number'
  | 'select' | 'multiselect' | 'url' | 'color' | 'checkbox' | 'info'
  | 'file' | 'file_multiple' | 'repeatable';

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
  accept?: string;
  conditional?: Condition;
  /** For type='info' — static content shown as guidance */
  content?: string;
  /** For repeatable fields — minimum entries required */
  minItems?: number;
}

export interface ModuleDef {
  key: string;
  title: string;
  description?: string;
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
  key: ServiceKey;
  label: string;
  description: string;
  modules: ModuleDef[];
  mandatory?: boolean;
}

// ============================================================================
// BUSINESS PROFILE — mandatory, first in dashboard order
// ============================================================================
const BUSINESS_PROFILE: ServiceDef = {
  key: 'business_profile',
  label: 'Business Profile',
  description: 'Core business info used across all services — filled out once, used everywhere',
  mandatory: true,
  modules: [
    {
      key: 'years_in_business',
      title: 'Years in business',
      estimatedMinutes: 1,
      fields: [{ key: 'years_in_business', label: 'Years in business', type: 'number', required: true, placeholder: 'e.g. 12' }],
    },
    {
      key: 'logo_files',
      title: 'Logo files',
      estimatedMinutes: 3,
      fields: [{
        key: 'logo_files',
        label: 'Logo files',
        type: 'file_multiple',
        accept: 'image/*',
        required: true,
        helpText: 'High-res PNG transparent + SVG if available. Used across your website, ads, and all marketing assets.',
      }],
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
// FACEBOOK ADS — placeholder, to be respec'd
// ============================================================================
const FACEBOOK_ADS: ServiceDef = {
  key: 'facebook_ads',
  label: 'Facebook Ads',
  description: 'Meta campaigns that drive qualified roofing leads',
  modules: [
    {
      key: 'coming_soon',
      title: 'Facebook Ads setup — coming soon',
      estimatedMinutes: 1,
      instructions: `The Facebook Ads onboarding flow is being redesigned. Your Serenium team will guide you directly for now. This section will populate here as soon as it's ready.`,
      fields: [],
    },
  ],
};

// ============================================================================
// AI SMS
// ============================================================================
const AI_SMS: ServiceDef = {
  key: 'ai_sms',
  label: 'AI SMS',
  description: 'Automated lead qualification via GoHighLevel + Appointwise',
  modules: [
    {
      key: 'connect_google_calendar',
      title: 'Connect Google Calendar',
      estimatedMinutes: 10,
      videoPlaceholder: true,
      externalLink: 'https://help.gohighlevel.com/support/solutions/articles/155000002369-integrating-google-with-highlevel-calendars',
      instructions: `Connect your Google Calendar in GoHighLevel so the AI can book directly into your schedule.`,
      tasks: [
        { key: 'ghl_login',             label: 'Logged into GHL', required: true },
        { key: 'ghl_calendar_settings', label: 'Navigated to Calendar settings', required: true },
        { key: 'ghl_connect_google',    label: 'Clicked Connect Google Calendar, authorized with Google', required: true },
        { key: 'ghl_calendar_selected', label: 'Selected the correct calendar to sync', required: true },
        { key: 'ghl_connection_visible',label: 'Confirmed connection is visible in GHL', required: true },
      ],
      fields: [{ key: 'calendar_connected', type: 'checkbox', label: "I've connected my Google Calendar", required: true }],
      links: {
        'GHL Google Calendar integration guide': 'https://help.gohighlevel.com/support/solutions/articles/155000002369-integrating-google-with-highlevel-calendars',
      },
    },
    {
      key: 'set_availability',
      title: 'Set your availability in GHL',
      estimatedMinutes: 10,
      requiresPrevious: true,
      videoPlaceholder: true,
      externalLink: 'https://help.gohighlevel.com/support/solutions/articles/155000001716-calendar-availability-weekly-working-hours-date-specific-hours',
      instructions: `Log into GHL and set your working hours, availability, and booking preferences directly in Calendar settings.`,
      fields: [{ key: 'availability_set', type: 'checkbox', label: "I've set my availability in GHL", required: true }],
      links: {
        'GHL availability guide': 'https://help.gohighlevel.com/support/solutions/articles/155000001716-calendar-availability-weekly-working-hours-date-specific-hours',
      },
    },
    {
      key: 'train_ai',
      title: 'Train your AI assistant',
      estimatedMinutes: 30,
      requiresPrevious: true,
      instructions: `This is the brains of the operation. The more specific you are, the more your AI sounds like you.`,
      fields: [
        { key: 'faqs', label: 'FAQs (question + ideal answer)', type: 'repeatable', minItems: 5, required: true, helpText: 'Minimum 5.' },
        { key: 'objections', label: 'Common objections + how to respond', type: 'repeatable', minItems: 3, required: true, helpText: 'Minimum 3.' },
        { key: 'pricing_allowed', label: 'Is the AI allowed to give pricing guidance?', type: 'select', options: ['Yes', 'No'], required: true },
        { key: 'pricing_guidance', label: 'Pricing guidance', type: 'textarea', helpText: 'Write freely what the AI can share about pricing.', conditional: { field: 'pricing_allowed', op: 'eq', value: 'Yes' } },
        { key: 'pricing_punt_confirm', label: 'Confirm: the AI will always punt pricing to a human', type: 'checkbox', conditional: { field: 'pricing_allowed', op: 'eq', value: 'No' } },
        { key: 'qualification_questions', label: 'What info does the AI need to collect from every lead?', type: 'repeatable', required: true, helpText: 'Examples: location, roof age, roof material, insurance vs cash, urgency, property type — add any you need.' },
        { key: 'ai_never_say', label: 'Anything the AI should NEVER say or promise', type: 'textarea' },
      ],
    },
    {
      key: 'notification_preferences',
      title: 'Notification preferences',
      estimatedMinutes: 5,
      requiresPrevious: true,
      fields: [
        { key: 'appointment_notification_recipients', label: 'Who gets notified when an appointment is booked (name, phone, email)', type: 'repeatable', required: true },
        { key: 'notification_method', label: 'Preferred notification method', type: 'multiselect', options: ['SMS', 'Email', 'Both'], required: true },
        { key: 'after_hours_handling', label: 'After-hours handling', type: 'select', options: ['AI responds immediately 24/7', 'AI responds but flags for human next business day', 'Hold until business hours'], required: true },
      ],
    },
    {
      key: 'emergency_handling',
      title: 'Emergency handling',
      estimatedMinutes: 5,
      requiresPrevious: true,
      conditional: { path: 'business_profile.emergency_service.emergency_offered', op: 'eq', value: 'Yes' },
      fields: [
        { key: 'emergency_contact_chain', label: 'Who the AI contacts for emergency leads (name, phone, email, ranked by priority)', type: 'repeatable', required: true },
        { key: 'emergency_definition', label: 'What counts as an emergency', type: 'textarea', required: true, helpText: 'Describe what situations should trigger emergency escalation.' },
        { key: 'emergency_qualify_or_escalate', label: 'Qualification before escalation?', type: 'select', options: ['Qualify first', 'Skip qualification, escalate immediately'], required: true },
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
  description: 'Inbound call AI built on Retell',
  modules: [
    {
      key: 'train_ai_receptionist',
      title: 'Train your AI receptionist',
      estimatedMinutes: 20,
      instructions: `We write the prompts — this module just collects the info we need.`,
      fields: [
        { key: 'faqs', label: 'FAQs callers commonly ask (question + ideal answer)', type: 'repeatable', required: true },
        { key: 'pricing_allowed', label: 'Is the AI allowed to give pricing over the phone?', type: 'select', options: ['Yes', 'No'], required: true },
        { key: 'pricing_guidance', label: 'Pricing guidance', type: 'textarea', helpText: 'Write freely.', conditional: { field: 'pricing_allowed', op: 'eq', value: 'Yes' } },
        { key: 'pricing_punt_confirm', label: 'Confirm: the AI will always punt pricing to a human', type: 'checkbox', conditional: { field: 'pricing_allowed', op: 'eq', value: 'No' } },
        { key: 'qualification_questions', label: 'What info does the AI need to collect from every caller?', type: 'repeatable', required: true, helpText: 'Examples: location, roof age, roof material, insurance vs cash, urgency, property type — add any you need.' },
        { key: 'ai_never_say', label: 'Anything the AI should NEVER say over the phone', type: 'textarea' },
      ],
    },
    {
      key: 'call_handling_preferences',
      title: 'Call handling preferences',
      estimatedMinutes: 5,
      requiresPrevious: true,
      fields: [
        { key: 'human_request_handling', label: 'When callers want to speak to a human', type: 'select', options: ['Transfer the call', 'Always take a message'], required: true },
        { key: 'transfer_contacts', label: 'Who to transfer to (name, phone, available hours)', type: 'repeatable', conditional: { field: 'human_request_handling', op: 'eq', value: 'Transfer the call' } },
        { key: 'transfer_fallback', label: 'Backup if transfer fails', type: 'select', options: ['Voicemail', 'Back to AI', 'Callback via SMS'], conditional: { field: 'human_request_handling', op: 'eq', value: 'Transfer the call' } },
      ],
    },
    {
      key: 'email_summary_recipients',
      title: 'Email summary recipients',
      estimatedMinutes: 3,
      requiresPrevious: true,
      instructions: `Who receives the call summary email after every call.`,
      fields: [
        { key: 'primary_email', label: 'Primary email recipient', type: 'email', required: true },
        { key: 'additional_emails', label: 'Additional recipients (email)', type: 'repeatable' },
      ],
    },
    {
      key: 'emergency_handling',
      title: 'Emergency handling',
      estimatedMinutes: 5,
      requiresPrevious: true,
      conditional: { path: 'business_profile.emergency_service.emergency_offered', op: 'eq', value: 'Yes' },
      fields: [
        { key: 'emergency_contact_chain', label: 'Who the AI contacts for emergency calls (name, phone, email, ranked by priority)', type: 'repeatable', required: true },
        { key: 'emergency_definition', label: 'What counts as an emergency on a phone call', type: 'textarea', required: true },
        { key: 'emergency_transfer_or_details', label: 'Transfer or take details?', type: 'select', options: ['Transfer immediately', 'Take details then escalate'], required: true },
      ],
    },
    {
      key: 'call_forwarding_setup',
      title: 'Set up call forwarding to Retell',
      estimatedMinutes: 10,
      requiresPrevious: true,
      lockedUntilAdminFlag: 'ai_receptionist_ready_for_connection',
      lockedMessage: "This step unlocks once we've built your AI. We'll let you know when it's ready.",
      instructions: `Final step — only unlocks once the previous steps are complete and we've built your AI.`,
      fields: [
        {
          key: 'forwarding_mode',
          label: 'How do you want calls to reach the AI?',
          type: 'select',
          required: true,
          options: [
            'Option A — Forward all calls directly to the AI (phone never rings)',
            "Option B — Let my phone ring first, then forward if I don't answer",
          ],
        },
        {
          key: 'option_a_instructions',
          type: 'info',
          conditional: { field: 'forwarding_mode', op: 'eq', value: 'Option A — Forward all calls directly to the AI (phone never rings)' },
          content: 'iPhone: Settings → Phone → Call Forwarding → On → Enter the Serenium forwarding number.\n\nAndroid: Phone app → Menu (3 dots) → Settings → Calls → Call Forwarding → Always Forward → Enter the Serenium forwarding number.',
        },
        {
          key: 'ring_time_control',
          label: 'Do you want to control how long your phone rings before it forwards?',
          type: 'select',
          options: ['No, use the default (about 20-25 seconds / 5-6 rings)', 'Yes, I want to set a specific ring time'],
          conditional: { field: 'forwarding_mode', op: 'eq', value: "Option B — Let my phone ring first, then forward if I don't answer" },
        },
        {
          key: 'option_b_default_instructions',
          type: 'info',
          conditional: {
            all: [
              { field: 'forwarding_mode', op: 'eq', value: "Option B — Let my phone ring first, then forward if I don't answer" },
              { field: 'ring_time_control', op: 'eq', value: 'No, use the default (about 20-25 seconds / 5-6 rings)' },
            ],
          },
          content: 'Dial: **004*[forwarding number]#** and press call.\n\nTo turn off: dial **##004#** and press call.',
        },
        {
          key: 'ring_seconds',
          label: 'Choose how long your phone should ring before forwarding',
          type: 'select',
          options: ['10 seconds (recommended)', '20 seconds', '30 seconds'],
          conditional: {
            all: [
              { field: 'forwarding_mode', op: 'eq', value: "Option B — Let my phone ring first, then forward if I don't answer" },
              { field: 'ring_time_control', op: 'eq', value: 'Yes, I want to set a specific ring time' },
            ],
          },
        },
        {
          key: 'option_b_custom_instructions',
          type: 'info',
          conditional: {
            all: [
              { field: 'forwarding_mode', op: 'eq', value: "Option B — Let my phone ring first, then forward if I don't answer" },
              { field: 'ring_time_control', op: 'eq', value: 'Yes, I want to set a specific ring time' },
            ],
          },
          content: 'Dial: **004*[forwarding number]*[seconds]#** and press call.\n\nExample for 10 seconds: **004*4165551234*10#**.\n\nTo turn off: dial **##004#** and press call.',
        },
        {
          key: 'carrier',
          label: 'Which carrier are you with?',
          type: 'select',
          options: ['Rogers', 'Bell', 'Telus', 'Freedom', 'Koodo', 'Fido', 'Virgin Plus', 'Public Mobile', 'Other'],
          helpText: 'We only use this if you need help troubleshooting.',
        },
        { key: 'forwarding_setup_confirmed', label: "I've set up call forwarding using the method above", type: 'checkbox', required: true },
        { key: 'forwarding_tested', label: "I've tested by calling my business line and confirmed it reaches the AI", type: 'checkbox', required: true },
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
  description: 'Custom website build with foundational SEO baked in (analytics, Search Console, GBP, schema, meta, on-page basics)',
  modules: [
    {
      key: 'brand_and_style',
      title: 'Brand and style',
      estimatedMinutes: 15,
      fields: [
        { key: 'primary_color', label: 'Primary brand color', type: 'color', required: true },
        { key: 'secondary_color', label: 'Secondary brand color', type: 'color', required: true },
        { key: 'accent_color', label: 'Accent / tertiary color (optional)', type: 'color' },
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
      fields: [
        { key: 'media_folder_link', label: 'Google Drive / Dropbox folder link with all photos and videos', type: 'url', required: true, helpText: 'Suggested subfolders: Completed Jobs / Team / Building / Drone Footage / Video Testimonials / Equipment' },
      ],
    },
    {
      key: 'content',
      title: 'Content',
      estimatedMinutes: 15,
      fields: [
        { key: 'business_story', label: 'Business story (text or voice note upload)', type: 'textarea' },
        { key: 'faq_questions', label: 'Common customer questions for FAQ page', type: 'repeatable' },
      ],
    },
    {
      key: 'forms_and_conversion',
      title: 'Forms and conversion',
      estimatedMinutes: 10,
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
        { key: 'other_registrar_info', type: 'info',
          conditional: { field: 'registrar', op: 'eq', value: 'Other' },
          content: "Log into your registrar. Find **Account Settings / User Management / Delegate Access**. Add `contact@sereniumai.com` with admin or DNS-edit permissions. If you can't find the option, contact the registrar's support." },
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
// EXPORTS — SERVICES in dashboard order
// ============================================================================
export const SERVICES: ServiceDef[] = [
  BUSINESS_PROFILE,
  FACEBOOK_ADS,
  AI_SMS,
  AI_RECEPTIONIST,
  WEBSITE,
];

export const SELECTABLE_SERVICES: ServiceDef[] = SERVICES.filter(s => !s.mandatory);

export function getService(key: ServiceKey): ServiceDef | undefined {
  return SERVICES.find(s => s.key === key);
}

export function getModule(serviceKey: ServiceKey, moduleKey: string): ModuleDef | undefined {
  return getService(serviceKey)?.modules.find(m => m.key === moduleKey);
}
