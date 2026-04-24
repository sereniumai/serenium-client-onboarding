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
  accept?: string;
  conditional?: Condition;
  /** For type='info', static content shown as guidance */
  content?: string;
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
// BUSINESS PROFILE, default on, shown first, but admin can disable if not needed
// ============================================================================
const BUSINESS_PROFILE: ServiceDef = {
  key: 'business_profile',
  label: 'Business Profile',
  description: 'Core business info used across all services, filled out once, used everywhere',
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
      fields: [{ key: 'insurance', label: 'Liability, WCB, bonding, what you carry', type: 'textarea' }],
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
    {
      key: 'main_business_email',
      title: 'Main business email',
      estimatedMinutes: 1,
      fields: [{ key: 'primary_email', label: 'Primary business email', type: 'email', required: true, validate: validateEmail }],
    },
    {
      key: 'physical_address',
      title: 'Physical address',
      estimatedMinutes: 2,
      fields: [{
        key: 'business_address',
        label: 'Business address',
        type: 'structured',
        required: true,
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
      estimatedMinutes: 3,
      fields: [{
        key: 'business_hours',
        label: 'Weekly hours (Mon–Sun)',
        type: 'weekly_availability',
        required: true,
        weekDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        helpText: 'Toggle a day to "Closed" if you don\'t work that day. Defines the boundary between business-hours and after-hours handling for your AI.',
      }],
    },
    {
      key: 'legal_business_name',
      title: 'Legal business name',
      estimatedMinutes: 1,
      fields: [{ key: 'legal_business_name', label: 'Legal entity name', type: 'text', required: true, helpText: 'Used on contracts, website footer, GBP verification, privacy policy.' }],
    },
    {
      key: 'primary_contact',
      title: 'Primary contact',
      estimatedMinutes: 2,
      fields: [
        { key: 'primary_contact_name', label: 'Name', type: 'text', required: true },
        { key: 'primary_contact_role', label: 'Role', type: 'select', required: true, options: ['Owner', 'Operations', 'Marketing', 'Other'] },
      ],
    },
    {
      key: 'customer_types',
      title: 'Customer types served',
      estimatedMinutes: 2,
      fields: [{
        key: 'customer_types_served',
        label: 'Who you serve',
        type: 'multiselect',
        options: ['Residential', 'Commercial', 'Industrial', 'Multi-family', 'Insurance claims', 'Other'],
        helpText: 'Drives website targeting, ad audience definition, and AI qualification filtering.',
      }],
    },
    {
      key: 'social_profiles',
      title: 'Social profiles',
      estimatedMinutes: 4,
      instructions: 'Paste links to any of these platforms where you have a presence. All optional, skip the ones you don\'t use.',
      fields: [
        { key: 'social_facebook',  label: 'Facebook',    type: 'url', placeholder: 'https://facebook.com/...' },
        { key: 'social_instagram', label: 'Instagram',   type: 'url', placeholder: 'https://instagram.com/...' },
        { key: 'social_youtube',   label: 'YouTube',     type: 'url', placeholder: 'https://youtube.com/@...' },
        { key: 'social_linkedin',  label: 'LinkedIn',    type: 'url', placeholder: 'https://linkedin.com/company/...' },
        { key: 'social_tiktok',    label: 'TikTok',      type: 'url', placeholder: 'https://tiktok.com/@...' },
        { key: 'social_homestars', label: 'HomeStars',   type: 'url', placeholder: 'https://homestars.com/...' },
        { key: 'social_other',     label: 'Other (platform + URL)', type: 'repeatable' },
      ],
    },
    {
      key: 'year_founded',
      title: 'Year founded',
      estimatedMinutes: 1,
      fields: [{ key: 'year_founded', label: 'Year the business was founded', type: 'number', placeholder: 'e.g. 2012', helpText: 'Stable value for "Est. 2012" branding, years_in_business drifts, year_founded doesn\'t.' }],
    },
    {
      key: 'review_platforms',
      title: 'Active review platforms',
      estimatedMinutes: 2,
      fields: [{
        key: 'review_platforms_active',
        label: 'Where do customers leave reviews?',
        type: 'multiselect',
        options: ['Google', 'Facebook', 'HomeStars', 'BBB', 'Other'],
      }],
    },
    {
      key: 'billing_contact',
      title: 'Billing contact',
      estimatedMinutes: 2,
      fields: [{
        key: 'billing_contact',
        label: 'Who handles billing / invoicing?',
        type: 'structured',
        helpText: 'Leave blank if it\'s the primary contact. Add your bookkeeper or accountant here if they handle invoices.',
        schema: [
          { key: 'name',  label: 'Name',  type: 'text' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'phone', label: 'Phone', type: 'phone' },
        ],
      }],
    },
    {
      key: 'preferred_comms',
      title: 'Preferred communication channel',
      estimatedMinutes: 1,
      fields: [
        { key: 'preferred_comms_channel', label: 'Best way to reach you', type: 'select', required: true, options: ['Email', 'Text', 'Phone', 'Slack'] },
        { key: 'comms_email', label: 'Email for comms', type: 'email', required: true, validate: validateEmail, conditional: { field: 'preferred_comms_channel', op: 'eq', value: 'Email' } },
        { key: 'comms_phone', label: 'Phone number', type: 'phone', required: true, conditional: { any: [{ field: 'preferred_comms_channel', op: 'eq', value: 'Text' }, { field: 'preferred_comms_channel', op: 'eq', value: 'Phone' }] } },
        { key: 'comms_slack_handle', label: 'Slack handle (or workspace URL)', type: 'text', required: true, conditional: { field: 'preferred_comms_channel', op: 'eq', value: 'Slack' } },
      ],
    },
    {
      key: 'tagline',
      title: 'Tagline or slogan',
      estimatedMinutes: 1,
      fields: [{ key: 'tagline_or_slogan', label: 'Tagline', type: 'text', helpText: 'Used as consistent hero copy across website and ads.' }],
    },
  ],
};

// ============================================================================
// FACEBOOK ADS, placeholder, to be respec'd
// ============================================================================
const FACEBOOK_ADS: ServiceDef = {
  key: 'facebook_ads',
  label: 'Facebook Ads',
  description: 'Partnership access to your Meta ad account, Page, Instagram, and Pixel',
  modules: [
    {
      key: 'prerequisites',
      title: 'Pre-requisite checks',
      estimatedMinutes: 3,
      instructions: `Before Serenium can run ads, we need to partner with your Meta Business Manager. A couple of quick questions first.`,
      fields: [
        { key: 'fb_business_manager_exists', label: 'Do you have a Meta Business Manager (BM)?', type: 'select', required: true, options: ['Yes', 'No', 'Not sure'] },
        { key: 'fb_bm_create_help', type: 'info',
          conditional: { field: 'fb_business_manager_exists', op: 'eq', value: 'No' },
          content: "No problem, create one free at **business.facebook.com/overview** before continuing. You'll need it to run ads and to grant Serenium partner access." },
        { key: 'fb_bm_find_help', type: 'info',
          conditional: { field: 'fb_business_manager_exists', op: 'eq', value: 'Not sure' },
          content: "Head to **business.facebook.com**. If you're logged in and see a 'Business Manager' option, you have one. If not, select 'Create Account' and set one up." },
        { key: 'fb_page_exists', label: 'Do you have a Facebook Page for your business?', type: 'select', required: true, options: ['Yes', 'No'] },
        { key: 'fb_page_help', type: 'info',
          conditional: { field: 'fb_page_exists', op: 'eq', value: 'No' },
          content: "Pre-requisite: your Page must belong to your Business Manager, not a personal profile. Serenium can create or guide you, ping us if you need help." },
      ],
    },
    {
      key: 'grant_access',
      title: 'Grant Serenium partner access',
      estimatedMinutes: 5,
      instructions: `Add Serenium as a partner in your Business Manager, then share these 4 assets with us. Our BM ID: **1304001774825587**`,
      fields: [
        { key: 'fb_partner_added',     label: 'Added Serenium as a partner in my Business Manager (BM ID 1304001774825587)', type: 'checkbox', required: true },
        { key: 'fb_shared_page',       label: 'Shared my Facebook Page with Serenium',                                       type: 'checkbox', required: true },
        { key: 'fb_shared_instagram',  label: 'Shared my Instagram account with Serenium',                                   type: 'checkbox', required: true },
        { key: 'fb_shared_dataset',    label: 'Shared my Dataset (Pixel) with Serenium',                                     type: 'checkbox', required: true },
        { key: 'fb_shared_ad_account', label: 'Shared my Ad Account with Serenium',                                          type: 'checkbox', required: true },
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
  description: 'MCC link to your Google Ads account so Serenium can manage campaigns and LSAs',
  modules: [
    {
      key: 'account_state',
      title: 'Account state',
      estimatedMinutes: 2,
      fields: [
        { key: 'google_ads_account_exists', label: 'Do you already have a Google Ads account?', type: 'select', required: true, options: ['Yes', 'No', 'Not sure'] },
        { key: 'google_ads_no_info', type: 'info',
          conditional: { field: 'google_ads_account_exists', op: 'eq', value: 'No' },
          content: "No problem, Serenium will create a new account linked to our Manager Account. No action needed from you, skip the rest of this service." },
      ],
    },
    {
      key: 'customer_id',
      title: 'Customer ID',
      estimatedMinutes: 2,
      conditional: { field: 'google_ads_account_exists', op: 'eq', value: 'Yes' },
      instructions: `We need your **10-digit Google Ads Customer ID** to send an MCC link request. Log into Google Ads, the number appears in the top-right of every screen, formatted like **123-456-7890**.`,
      fields: [
        { key: 'google_ads_customer_id', label: 'Customer ID', type: 'text', required: true, placeholder: '123-456-7890', validate: validateGoogleAdsId },
      ],
    },
    {
      key: 'mcc_link',
      title: 'Accept MCC link request',
      estimatedMinutes: 2,
      conditional: { field: 'google_ads_account_exists', op: 'eq', value: 'Yes' },
      instructions: `Serenium sends a Manager Account (MCC) link request once we have your Customer ID. Accept it in **Google Ads → Tools & settings → Access and security → Managers**.`,
      fields: [
        { key: 'google_mcc_link_accepted', label: 'I accepted the MCC link request from Serenium', type: 'checkbox', required: true },
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
  description: 'Manager access to your GBP listing so Serenium can handle posts, reviews, and Q&A',
  modules: [
    {
      key: 'profile_state',
      title: 'Profile state',
      estimatedMinutes: 2,
      fields: [
        { key: 'gbp_profile_exists', label: 'Do you have a Google Business Profile?', type: 'select', required: true, options: ['Yes verified', 'Yes unverified', 'No', 'Not sure'] },
        { key: 'gbp_help_create', type: 'info',
          conditional: { any: [{ field: 'gbp_profile_exists', op: 'eq', value: 'No' }, { field: 'gbp_profile_exists', op: 'eq', value: 'Not sure' }] },
          content: "We'll help you create or claim a profile. Skip the rest of this service, Serenium takes it from here." },
        { key: 'gbp_help_unverified', type: 'info',
          conditional: { field: 'gbp_profile_exists', op: 'eq', value: 'Yes unverified' },
          content: "Verification is required before we can be added as a Manager. Google typically verifies by postcard or phone, finish verification, then come back." },
      ],
    },
    {
      key: 'ownership',
      title: 'Confirm ownership',
      estimatedMinutes: 1,
      conditional: { any: [{ field: 'gbp_profile_exists', op: 'eq', value: 'Yes verified' }, { field: 'gbp_profile_exists', op: 'eq', value: 'Yes unverified' }] },
      fields: [
        { key: 'gbp_ownership_confirmed', label: "I confirm I'm the verified owner of this Google Business Profile, not a third party, and not a stolen or old listing", type: 'checkbox', required: true },
      ],
    },
    {
      key: 'manager_access',
      title: 'Grant Manager access',
      estimatedMinutes: 3,
      conditional: { field: 'gbp_profile_exists', op: 'eq', value: 'Yes verified' },
      instructions: `In your Google Business Profile dashboard → **Users** → **Add users** → add \`contact@sereniumai.com\` as a **Manager**.`,
      fields: [
        { key: 'gbp_manager_access_granted', label: 'Added contact@sereniumai.com as a Manager', type: 'checkbox', required: true },
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
  description: 'Automated lead qualification via GoHighLevel + Appointwise',
  modules: [
    {
      key: 'purpose_goal',
      title: 'Purpose & goal',
      estimatedMinutes: 2,
      fields: [
        {
          key: 'sms_primary_goal',
          label: 'What should the AI do?',
          type: 'multiselect',
          required: true,
          options: ['Book a free estimate', 'Book a phone consultation / sales call', 'Qualify the lead and hand off to a human'],
        },
        { key: 'sms_goal_details', label: 'Any other context, edge cases, or preferences', type: 'textarea' },
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
        },
        {
          key: 'sms_qualification_questions',
          label: 'Info the AI must gather before booking',
          type: 'repeatable',
          required: true,
          helpText: 'Ordered. Typical roofing: full name, service address, roof age, material, insurance vs cash, urgency.',
        },
        {
          key: 'sms_faqs',
          label: 'FAQs (question + ideal answer)',
          type: 'repeatable',
          minItems: 5,
          required: true,
          helpText: 'Minimum 5. Cover service area, warranty, pricing, availability, insurance work, emergency service, financing.',
        },
        {
          key: 'sms_pricing_stance',
          label: 'Pricing stance',
          type: 'select',
          required: true,
          options: ['Share ranges', 'Share specifics', 'Always punt to human'],
          helpText: 'Most roofers pick "punt to human".',
        },
        { key: 'sms_ai_never_say', label: 'Guardrails, things the AI should NEVER say', type: 'textarea', required: true },
      ],
    },
    {
      key: 'operational',
      title: 'Operational',
      estimatedMinutes: 5,
      fields: [
        {
          key: 'sms_response_time_sla',
          label: 'Target response time',
          type: 'slider',
          slider: { min: 10, max: 60, step: 10, default: 10, suffix: 's' },
          helpText: 'Speed-to-lead is the biggest conversion lever. Lower = better.',
        },
        { key: 'sms_disqualification_criteria', label: 'When the AI politely ends the chat', type: 'textarea', helpText: 'e.g. outside service area, wrong service, too-small job.' },
        { key: 'sms_human_handoff_enabled', label: 'Allow handoff to a human?', type: 'select', required: true, options: ['Yes', 'No'] },
        { key: 'sms_human_handoff_triggers', label: 'What triggers a handoff?', type: 'textarea', required: true, conditional: { field: 'sms_human_handoff_enabled', op: 'eq', value: 'Yes' } },
        {
          key: 'sms_human_handoff_recipient',
          label: 'Who takes over',
          type: 'structured',
          required: true,
          conditional: { field: 'sms_human_handoff_enabled', op: 'eq', value: 'Yes' },
          schema: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'phone', label: 'Phone', type: 'phone', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
          ],
        },
        { key: 'sms_timezone', label: 'Timezone', type: 'select', options: ['America/St_Johns', 'America/Halifax', 'America/Toronto', 'America/Winnipeg', 'America/Regina', 'America/Edmonton', 'America/Vancouver'] },
      ],
    },
    {
      key: 'emergency_handling',
      title: 'Emergency handling',
      estimatedMinutes: 4,
      conditional: { path: 'business_profile.emergency_service.emergency_offered', op: 'eq', value: 'Yes' },
      fields: [
        { key: 'sms_emergency_enabled', label: 'Does the AI handle emergency leads?', type: 'select', required: true, options: ['Yes', 'No'] },
        { key: 'sms_emergency_definition', label: 'What counts as an emergency?', type: 'textarea', required: true, conditional: { field: 'sms_emergency_enabled', op: 'eq', value: 'Yes' } },
        {
          key: 'sms_emergency_recipient',
          label: 'Who to escalate emergencies to',
          type: 'structured',
          required: true,
          conditional: { field: 'sms_emergency_enabled', op: 'eq', value: 'Yes' },
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
      estimatedMinutes: 5,
      instructions: `Canada's Anti-Spam Legislation requires explicit consent before AI-assisted SMS follow-up. If Serenium is building your new website, we handle this automatically, so this step only shows up when we're NOT building your site.

**Add this checkbox to your existing lead forms:**

> ☐ *By checking this box, I consent to receive SMS, email, and phone communications from [Company Name] regarding my roof inquiry, including via automated / AI-assisted tools. I can opt out anytime by replying STOP.*

**Add this language to your Terms / Privacy Policy:**

> *"By submitting this form or engaging our services, you consent to communications from us and our authorized agents (including AI-assisted SMS, email, and phone) in accordance with Canada's Anti-Spam Legislation (CASL). You may withdraw consent at any time by replying STOP to any message."*`,
      fields: [
        { key: 'sms_external_site_consent_checkbox_added', label: 'Added the consent checkbox to my existing lead forms', type: 'checkbox', required: true },
        { key: 'sms_external_site_terms_updated',         label: 'Updated my Terms / Privacy Policy to disclose AI-assisted follow-up', type: 'checkbox', required: true },
      ],
    },
    {
      key: 'booking',
      title: 'Booking',
      estimatedMinutes: 4,
      fields: [
        {
          key: 'sms_existing_calendar_tool',
          label: 'What do you currently use for booking?',
          type: 'select',
          required: true,
          options: ['Cal.com', 'Calendly', 'Google Calendar', 'Acuity', 'Square Appointments', 'Other', 'None yet, Serenium to set up'],
        },
        {
          key: 'sms_existing_calendar_other',
          label: 'Which tool?',
          type: 'text',
          conditional: { field: 'sms_existing_calendar_tool', op: 'eq', value: 'Other' },
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
          helpText: 'Drives both the qualification script AND the content of booking notifications.',
        },
        { key: 'sms_booking_info_custom', label: 'Anything else the AI should capture?', type: 'textarea' },
      ],
    },
    {
      key: 'booking_notifications',
      title: 'Booking notifications',
      estimatedMinutes: 4,
      fields: [
        { key: 'notification_method', label: 'How do you want to be notified?', type: 'multiselect', required: true, options: ['SMS', 'Email', 'Both'] },
        {
          key: 'appointment_notification_recipients',
          label: 'Who gets notified (name, phone, email each)',
          type: 'repeatable',
          required: true,
          helpText: 'System uses whichever channel matches your preference above, include both phone AND email for each person.',
        },
      ],
    },
    {
      key: 'ghl_calendar_setup',
      title: 'GHL Calendar setup',
      estimatedMinutes: 10,
      lockedUntilAdminFlag: 'ghl_calendar_ready_for_client',
      lockedMessage: "Serenium is setting this up, we'll unlock it for you soon.",
      videoUrl: 'https://www.youtube.com/watch?v=KcdUwD3I5ms',
      instructions: `Once Serenium has provisioned your GHL subaccount, connect your Google Calendar and set availability here.`,
      fields: [
        { key: 'calendar_connected', label: "I've connected my Google Calendar to my GHL account", type: 'checkbox', required: true },
        {
          key: 'weekly_availability',
          label: 'Weekly availability (Mon–Fri)',
          type: 'weekly_availability',
          required: true,
          helpText: 'Toggle a day to "Closed" if you don\'t work that day. Add an optional break window (e.g. lunch) to block the AI from booking during it.',
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
  description: 'Inbound call AI, captures info and emails you a summary. Does not book appointments.',
  modules: [
    {
      key: 'purpose_goal',
      title: 'Purpose & goal',
      estimatedMinutes: 2,
      fields: [
        {
          key: 'retell_primary_goal',
          label: 'What should the AI do on every call?',
          type: 'multiselect',
          required: true,
          options: ['Qualify the caller then transfer to a human', 'Take messages (capture info + email summary)'],
        },
      ],
    },
    {
      key: 'scripts_behaviour',
      title: 'Scripts & question flow',
      estimatedMinutes: 15,
      fields: [
        {
          key: 'retell_greeting_script',
          label: 'Greeting script',
          type: 'textarea',
          required: true,
          placeholder: "Thanks for calling [Company], this is [AI Name], how can I help you today?",
        },
        {
          key: 'retell_question_flow',
          label: 'Question flow (ordered)',
          type: 'repeatable',
          required: true,
          helpText: 'Order matters. Typical roofing: name → address → roof type → age → reason → urgency → callback time.',
        },
        { key: 'retell_faqs', label: 'FAQs callers commonly ask', type: 'repeatable', required: true },
        { key: 'retell_pricing_stance', label: 'Pricing stance', type: 'select', required: true, options: ['Share ranges', 'Always punt to human'] },
        { key: 'retell_ai_never_say', label: 'Guardrails, never say', type: 'textarea', required: true },
        { key: 'retell_voice_preference', label: 'Voice preference', type: 'select', options: ['Male', 'Female', 'No preference'] },
      ],
    },
    {
      key: 'email_summaries',
      title: 'Email summaries',
      estimatedMinutes: 4,
      instructions: `Every call ends with an email summary. Pick the recipients and the info that should always appear in the email.`,
      fields: [
        { key: 'primary_email', label: 'Primary recipient', type: 'email', required: true, validate: validateEmail },
        { key: 'additional_emails', label: 'Additional recipients (email)', type: 'repeatable' },
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
        },
        { key: 'retell_summary_info_custom', label: 'Anything else the AI should capture?', type: 'textarea' },
      ],
    },
    {
      key: 'human_transfer',
      title: 'Human transfer behaviour',
      estimatedMinutes: 3,
      fields: [
        { key: 'retell_human_request_handling', label: 'When callers ask for a human', type: 'select', required: true, options: ['Transfer call', 'Always take message'] },
        { key: 'retell_transfer_contacts', label: 'Who to transfer to (name, phone, hours)', type: 'repeatable', required: true, conditional: { field: 'retell_human_request_handling', op: 'eq', value: 'Transfer call' } },
      ],
    },
    {
      key: 'emergency_handling',
      title: 'Emergency handling',
      estimatedMinutes: 3,
      conditional: { path: 'business_profile.emergency_service.emergency_offered', op: 'eq', value: 'Yes' },
      fields: [
        { key: 'retell_emergency_enabled', label: 'Does the AI handle emergency calls differently?', type: 'select', required: true, options: ['Yes', 'No'] },
        { key: 'retell_emergency_definition', label: 'What counts as an emergency on a phone call', type: 'textarea', required: true, conditional: { field: 'retell_emergency_enabled', op: 'eq', value: 'Yes' } },
      ],
    },
    {
      key: 'phone_number_setup',
      title: 'Phone number implementation',
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
        },
        { key: 'retell_phone_carrier', label: 'Your phone carrier', type: 'select', required: true,
          options: ['Rogers', 'Bell', 'Telus', 'Freedom', 'Koodo', 'Fido', 'Virgin Plus', 'Public Mobile', 'Lucky Mobile', 'Chatr', 'Other'],
          helpText: 'Canadian GSM standard: dial *004*[AI number]# to set forwarding, ##004# to cancel. Confirm with your carrier.',
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
        },
        { key: 'retell_phone_brand', label: 'Your phone brand', type: 'select', required: true,
          options: ['Apple (iPhone)', 'Samsung (Galaxy)', 'Google (Pixel)', 'Motorola', 'OnePlus', 'Other Android'],
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
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
        },
        { key: 'retell_forwarding_tested', label: "I've called my own number and confirmed the AI picked up", type: 'checkbox', required: true,
          conditional: { field: 'retell_phone_mode', op: 'eq', value: 'Option B, Keep existing number, forward to AI' },
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
  description: 'Custom website build with foundational SEO baked in, creative first, technical access at the end.',
  modules: [
    {
      key: 'purpose_goal',
      title: 'Purpose & goal',
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
      }],
    },
    {
      key: 'brand_and_design',
      title: 'Brand & design',
      estimatedMinutes: 12,
      fields: [
        { key: 'website_primary_color', label: 'Primary brand colour', type: 'color', required: true },
        { key: 'website_secondary_color', label: 'Secondary brand colour', type: 'color', required: true },
        { key: 'website_accent_color', label: 'Accent / tertiary colour', type: 'color' },
        { key: 'website_font_preference', label: 'Font preference (Google Font name or reference site)', type: 'text' },
        { key: 'website_liked_sites', label: '3 websites you like (URL + why)', type: 'repeatable', required: true, minItems: 3, helpText: 'Minimum 3.' },
        { key: 'brand_guidelines_available', label: 'Do you have existing brand guidelines?', type: 'select', options: ['Yes', 'No'] },
        { key: 'brand_guidelines_upload', label: 'Upload brand guidelines (PDF)', type: 'file', accept: 'application/pdf', conditional: { field: 'brand_guidelines_available', op: 'eq', value: 'Yes' } },
      ],
    },
    {
      key: 'brand_assets',
      title: 'Brand assets',
      estimatedMinutes: 4,
      fields: [
        {
          key: 'website_logo',
          label: 'Logo',
          type: 'logo_picker',
          required: true,
          logoReuseFieldKey: 'business_profile.logo_files.logo_files',
          helpText: 'Pick one: reuse what you uploaded in Business Profile, upload something fresh, or share a Drive / Dropbox link.',
        },
        {
          key: 'website_media_folder_link',
          label: 'Google Drive or Dropbox folder (photos, videos, other assets)',
          type: 'url',
          required: true,
          helpText: 'Suggested subfolders: Completed Jobs · Team · Building · Drone Footage · Video Testimonials · Equipment',
        },
      ],
    },
    {
      key: 'content',
      title: 'Content',
      estimatedMinutes: 10,
      fields: [
        { key: 'business_story', label: 'Business story (for About page)', type: 'textarea', helpText: 'Origin, owner\'s story, values. Can be a voice-note reference too.' },
      ],
    },
    {
      key: 'lead_form_and_routing',
      title: 'Lead form & routing',
      estimatedMinutes: 6,
      fields: [
        { key: 'lead_form_fields', label: 'Fields on the lead form', type: 'multiselect', required: true, options: ['Name', 'Phone', 'Email', 'Service needed', 'Timeframe', 'Address'] },
        { key: 'primary_cta', label: 'Primary CTA across the site', type: 'select', required: true, options: ['Free quote', 'Book inspection', 'Call now', 'Financing'] },
        { key: 'submission_destination', label: 'Where should form submissions go?', type: 'multiselect', required: true, options: ['Email', 'CRM', 'Both'] },
        { key: 'email_destination', label: 'Email for lead notifications', type: 'email', required: true, validate: validateEmail, conditional: { field: 'submission_destination', op: 'includes', value: 'Email' } },
        { key: 'crm_choice', label: 'CRM', type: 'select', required: true,
          options: ['GoHighLevel (Serenium-managed)', 'GoHighLevel (their own)', 'HubSpot', 'Salesforce', 'Pipedrive', 'Zoho', 'JobNimbus', 'AccuLynx', 'Roofr', 'Other'],
          conditional: { field: 'submission_destination', op: 'includes', value: 'CRM' } },
      ],
    },
    {
      key: 'domain_and_hosting',
      title: 'Domain & hosting',
      estimatedMinutes: 5,
      fields: [
        { key: 'current_domain', label: 'Domain name', type: 'text', required: true, placeholder: 'surewestroofing.ca', validate: validateDomain },
        {
          key: 'has_dns_access',
          label: 'Do you currently have access to the domain so you can change DNS etc?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Not sure'],
          helpText: 'If No / Not sure, Serenium works with you to find who controls the domain (former employee, old agency, etc.) and get access through them.',
        },
        { key: 'current_website_hosting_provider', label: 'Current hosting provider', type: 'select', required: true,
          options: ['GoDaddy', 'Bluehost', 'Hostinger', 'WPEngine', 'SiteGround', 'Vercel', 'Netlify', 'Squarespace', 'Wix', 'Shopify', 'WordPress.com', 'Webflow', 'Self-hosted', 'Other', 'Not sure'] },
        { key: 'email_hosting_status', label: 'Business email hosting', type: 'select', options: ['Have it', 'Need Google Workspace setup', 'Need other'] },
      ],
    },
    {
      key: 'registrar_delegation',
      title: 'Registrar / DNS delegation',
      estimatedMinutes: 8,
      instructions: `Add **contact@sereniumai.com** to your registrar with admin / DNS-edit permissions. Pick your registrar below, we'll show you a walkthrough.`,
      fields: [
        { key: 'registrar', label: 'Your domain registrar', type: 'select', required: true, options: ['GoDaddy', 'Namecheap', 'Cloudflare', 'Other'] },
        { key: 'other_registrar_info', type: 'info',
          conditional: { field: 'registrar', op: 'eq', value: 'Other' },
          content: "Log into your registrar. Find **Account Settings / User Management / Delegate Access**. Add `contact@sereniumai.com` with admin or DNS-edit permissions. If you can't find the option, contact the registrar's support." },
        { key: 'registrar_access_granted', label: "I've added contact@sereniumai.com as a delegate / user on my registrar with DNS-edit permissions", type: 'checkbox', required: true },
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
      estimatedMinutes: 5,
      fields: [
        { key: 'has_current_site', label: 'Do you have a current website?', type: 'select', required: true, options: ['Yes', 'No'] },
        { key: 'cms_platform', label: 'What platform is it on?', type: 'select', required: true, options: ['WordPress', 'Other'], conditional: { field: 'has_current_site', op: 'eq', value: 'Yes' } },
        { key: 'cms_access_granted', label: "I've added contact@sereniumai.com as an Administrator in WordPress", type: 'checkbox', required: true, conditional: { field: 'cms_platform', op: 'eq', value: 'WordPress' } },
      ],
      conditionalLinks: {
        WordPress: 'https://www.youtube.com/watch?v=ow9EU1pyVaI',
      },
    },
    {
      key: 'analytics_and_search_console',
      title: 'Analytics & Search Console',
      estimatedMinutes: 7,
      instructions: `Add **contact@sereniumai.com** to both services below at the permission levels listed.`,
      fields: [
        { key: 'google_analytics_access_granted', label: 'Added contact@sereniumai.com to Google Analytics as Administrator', type: 'checkbox', required: true },
        { key: 'search_console_access_granted', label: 'Added contact@sereniumai.com to Google Search Console as Owner', type: 'checkbox', required: true },
      ],
      links: {
        'Google Analytics (Administrator)': 'https://www.youtube.com/watch?v=jKDykqKDMLI',
        'Google Search Console (Owner)': 'https://support.google.com/webmasters/answer/7687615',
      },
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
