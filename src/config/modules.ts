import type { ServiceKey } from '../types';

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'number'
  | 'select' | 'multiselect' | 'url' | 'color'
  | 'file' | 'file_multiple' | 'repeatable';

export interface Task {
  key: string;
  label: string;
  required?: boolean;
}

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  accept?: string;
}

export interface ModuleDef {
  key: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  videoUrl?: string;
  instructions: string;
  tasks?: Task[];
  fields?: Field[];
  requiresPrevious?: boolean;
}

export interface ServiceDef {
  key: ServiceKey;
  label: string;
  description: string;
  modules: ModuleDef[];
}

export const SERVICES: ServiceDef[] = [
  {
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
        key: 'business_details',
        title: 'Business details for ad copy',
        description: 'Service areas, offerings, USPs — what makes you different.',
        estimatedMinutes: 20,
        requiresPrevious: true,
        instructions: `This goes directly into our ad copy. Be specific — vague ads get ignored.`,
        fields: [
          { key: 'service_areas', label: 'Service areas (list cities)', type: 'repeatable', required: true },
          { key: 'services_offered', label: 'Services offered', type: 'multiselect', required: true,
            options: ['Asphalt shingle replacement', 'Metal roofing', 'Flat / TPO roofing', 'Cedar shakes', 'Repairs', 'Inspections', 'Gutters & eavestroughs', 'Soffit & fascia', 'Skylights', 'Insurance claims'] },
          { key: 'services_excluded', label: 'Services you do NOT offer', type: 'textarea', placeholder: 'e.g. commercial flat roofing, mobile home repairs' },
          { key: 'minimum_job_size', label: 'Minimum job size ($)', type: 'number', placeholder: '5000' },
          { key: 'usps', label: 'Unique selling points', type: 'repeatable', helpText: 'Warranty terms, years in business, certifications, insurance, financing options.' },
          { key: 'past_creative', label: 'Past ad creative (optional)', type: 'file_multiple' },
        ],
      },
      {
        key: 'landing_page',
        title: 'Landing page setup',
        description: 'Where leads land after clicking your ad.',
        estimatedMinutes: 5,
        requiresPrevious: true,
        instructions: `Two options: use our pre-built landing page template, or we'll install the Meta Pixel on your existing site. Pick one below.`,
        fields: [
          { key: 'landing_page_choice', label: 'Landing page option', type: 'select', required: true,
            options: ['Use Serenium landing page', 'Use my own website'] },
          { key: 'landing_page_subdomain', label: 'Preferred subdomain (if using Serenium page)', type: 'text', placeholder: 'offers.surewest.ca' },
          { key: 'existing_site_url', label: 'Existing site URL (if using own)', type: 'url', placeholder: 'https://surewest.ca' },
          { key: 'existing_site_access', label: 'Site admin access handoff', type: 'textarea', placeholder: 'Hosting login, WordPress admin, etc. — we\'ll handle pixel install.' },
        ],
      },
    ],
  },
  {
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
        key: 'business_info_sms',
        title: 'Business information',
        description: 'Core business details the AI will reference.',
        estimatedMinutes: 5,
        requiresPrevious: true,
        instructions: `The AI uses these details in every message. Double-check spelling.`,
        fields: [
          { key: 'legal_business_name', label: 'Legal business name', type: 'text', required: true },
          { key: 'dba', label: 'DBA (if different)', type: 'text' },
          { key: 'business_phone', label: 'Business phone', type: 'phone', required: true },
          { key: 'business_address', label: 'Business address', type: 'text', required: true },
          { key: 'business_email', label: 'Business email', type: 'email', required: true },
          { key: 'business_website', label: 'Website URL', type: 'url' },
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
          { key: 'tone_of_voice', label: 'Tone of voice', type: 'select', required: true,
            options: ['Casual & friendly', 'Professional', 'Direct & no-nonsense', 'Warm & consultative'] },
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
          { key: 'after_hours_handling', label: 'After-hours handling preference', type: 'select',
            options: ['AI handles & books, notify next morning', 'AI handles & pings immediately', 'AI asks lead to wait, pings you'] },
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
        tasks: [
          { key: 'casl_consent_confirmed', label: 'Lead form has express SMS consent language', required: true },
        ],
        fields: [
          { key: 'lead_form_source', label: 'Lead form source', type: 'select', required: true,
            options: ['Using Serenium lead form', 'Using my own form (upload screenshot)'] },
          { key: 'lead_form_screenshot', label: 'Screenshot of your consent checkbox', type: 'file', accept: 'image/*' },
        ],
      },
    ],
  },
  {
    key: 'website',
    label: 'Website',
    description: 'Landing pages and full sites built to convert',
    modules: [
      {
        key: 'domain_hosting',
        title: 'Domain and hosting',
        description: 'Where your site will live.',
        estimatedMinutes: 5,
        instructions: `Tell us what you've got. If you don't have a domain, we'll help you register one.`,
        fields: [
          { key: 'has_domain', label: 'Do you have an existing domain?', type: 'select', options: ['Yes', 'No'], required: true },
          { key: 'domain_name', label: 'Domain name', type: 'text', placeholder: 'surewest.ca' },
          { key: 'registrar', label: 'Registrar', type: 'text', placeholder: 'GoDaddy, Namecheap, Cloudflare…' },
          { key: 'has_hosting', label: 'Existing hosting?', type: 'select', options: ['Yes', 'No'] },
          { key: 'hosting_access', label: 'Hosting credentials handoff (secure)', type: 'textarea' },
        ],
      },
      {
        key: 'brand_style',
        title: 'Brand and style preferences',
        description: 'Colors, fonts, vibe.',
        estimatedMinutes: 15,
        requiresPrevious: true,
        instructions: `Paint us a picture. Share sites you love, sites you hate, and your existing brand guidelines if you have them.`,
        fields: [
          { key: 'brand_color_primary', label: 'Primary brand color', type: 'color' },
          { key: 'brand_color_secondary', label: 'Secondary color', type: 'color' },
          { key: 'brand_color_accent', label: 'Accent color', type: 'color' },
          { key: 'brand_fonts', label: 'Brand fonts (if any)', type: 'text' },
          { key: 'reference_sites_liked', label: 'Sites you like', type: 'repeatable' },
          { key: 'reference_sites_disliked', label: 'Sites you dislike', type: 'repeatable' },
          { key: 'site_vibe', label: 'Feel / vibe', type: 'select', options: ['Modern', 'Classic', 'Bold', 'Minimal', 'Premium'] },
          { key: 'brand_guidelines', label: 'Brand guidelines file (optional)', type: 'file' },
        ],
      },
      {
        key: 'content_pages',
        title: 'Content and pages',
        description: 'What pages do you need, and what should they say?',
        estimatedMinutes: 30,
        requiresPrevious: true,
        instructions: `Tell us the structure of your site. Share your story — we'll shape the copy.`,
        fields: [
          { key: 'pages_needed', label: 'Pages needed', type: 'multiselect', required: true,
            options: ['Home', 'About', 'Services', 'Contact', 'Gallery', 'Blog', 'Testimonials', 'Service Areas'] },
          { key: 'primary_cta', label: 'Primary CTA across the site', type: 'text', placeholder: 'Get a free quote' },
          { key: 'service_descriptions', label: 'Service descriptions', type: 'repeatable' },
          { key: 'business_story', label: 'Your business story', type: 'textarea' },
          { key: 'team_bios', label: 'Team bios', type: 'repeatable' },
        ],
      },
      {
        key: 'visual_assets_web',
        title: 'Visual assets',
        description: 'Photos for hero, services, team, and location.',
        estimatedMinutes: 15,
        requiresPrevious: true,
        instructions: `High-quality photos make a site feel premium. Use everything you've got.`,
        fields: [
          { key: 'hero_photos', label: 'Hero photos', type: 'file_multiple', accept: 'image/*' },
          { key: 'service_photos', label: 'Service photos', type: 'file_multiple', accept: 'image/*' },
          { key: 'team_photos_web', label: 'Team photos', type: 'file_multiple', accept: 'image/*' },
          { key: 'location_photos', label: 'Location / building photos', type: 'file_multiple', accept: 'image/*' },
        ],
      },
      {
        key: 'contact_integrations',
        title: 'Contact and integrations',
        description: 'How leads reach you.',
        estimatedMinutes: 10,
        requiresPrevious: true,
        instructions: `All the ways people can get in touch, plus any integrations you want live from day one.`,
        fields: [
          { key: 'contact_phone', label: 'Business phone', type: 'phone', required: true },
          { key: 'contact_email', label: 'Business email', type: 'email', required: true },
          { key: 'contact_address', label: 'Business address', type: 'text', required: true },
          { key: 'maps_pin_url', label: 'Google Maps pin URL', type: 'url' },
          { key: 'social_urls', label: 'Social media URLs', type: 'repeatable' },
          { key: 'contact_form_fields', label: 'Contact form fields', type: 'multiselect',
            options: ['Name', 'Email', 'Phone', 'Service needed', 'Urgency', 'Message', 'Upload photo'] },
          { key: 'booking_integration', label: 'Booking integration needed?', type: 'select', options: ['Yes — connect to AI SMS', 'No'] },
        ],
      },
      {
        key: 'seo_basics',
        title: 'SEO basics for the site',
        description: 'Keywords and metadata for launch.',
        estimatedMinutes: 10,
        requiresPrevious: true,
        instructions: `We'll wire up basic on-page SEO at launch. More aggressive SEO is handled in the SEO service.`,
        fields: [
          { key: 'target_keywords_web', label: 'Target keywords', type: 'repeatable' },
          { key: 'meta_descriptions', label: 'Meta descriptions per page', type: 'textarea', helpText: 'Or check the "write for me" box below.' },
          { key: 'write_meta_for_me', label: 'Let Serenium write metadata', type: 'select', options: ['Yes please', 'I\'ll provide my own'] },
          { key: 'existing_ga_account', label: 'Existing Google Analytics account ID', type: 'text' },
        ],
      },
    ],
  },
  {
    key: 'seo',
    label: 'SEO',
    description: 'Rank locally for your service areas',
    modules: [
      {
        key: 'gbp_access',
        title: 'Google Business Profile access',
        description: 'Grant us manager access to your GBP listing.',
        estimatedMinutes: 10,
        instructions: `We'll manage posts, photos, Q&A, and review responses.`,
        tasks: [
          { key: 'gbp_located', label: 'Located GBP listing', required: true },
          { key: 'gbp_users_clicked', label: 'Clicked Users in GBP dashboard', required: true },
          { key: 'gbp_serenium_added', label: 'Added Serenium email as Manager', required: true },
          { key: 'gbp_access_confirmed', label: 'Confirmed we received access', required: true },
        ],
        fields: [
          { key: 'gbp_listing_url', label: 'GBP listing URL', type: 'url', required: true },
        ],
      },
      {
        key: 'service_areas_seo',
        title: 'Service areas and target markets',
        description: 'Where you want to rank.',
        estimatedMinutes: 10,
        requiresPrevious: true,
        instructions: `Rank where it matters. Prioritize your biggest markets.`,
        fields: [
          { key: 'service_areas_ranked', label: 'Service area cities (with priority 1–5)', type: 'repeatable', required: true },
          { key: 'primary_market', label: 'Primary market', type: 'text', required: true },
          { key: 'secondary_markets', label: 'Secondary markets', type: 'repeatable' },
          { key: 'radius_km', label: 'Radius from base (km)', type: 'number', placeholder: '50' },
        ],
      },
      {
        key: 'keyword_research',
        title: 'Keyword research input',
        description: 'Services and keywords you want to rank for.',
        estimatedMinutes: 15,
        requiresPrevious: true,
        instructions: `Tell us what matters — we'll sharpen it with data.`,
        fields: [
          { key: 'primary_services_rank', label: 'Primary services to rank for', type: 'repeatable', required: true },
          { key: 'target_keywords_seo', label: 'Specific keywords targeted', type: 'repeatable' },
          { key: 'competitor_urls', label: 'Competitors to benchmark (3–5)', type: 'repeatable' },
          { key: 'failed_keywords', label: 'Keywords that haven\'t worked + why', type: 'repeatable' },
        ],
      },
      {
        key: 'content_audit',
        title: 'Content and review audit',
        description: 'What you already have online.',
        estimatedMinutes: 10,
        requiresPrevious: true,
        instructions: `We'll audit everything before we publish anything new.`,
        fields: [
          { key: 'has_blog', label: 'Existing blog?', type: 'select', options: ['Yes', 'No'] },
          { key: 'blog_url', label: 'Blog URL', type: 'url' },
          { key: 'existing_service_pages', label: 'Existing service pages', type: 'repeatable' },
          { key: 'google_review_count', label: 'Google review count', type: 'number' },
          { key: 'facebook_review_count', label: 'Facebook review count', type: 'number' },
          { key: 'other_review_platforms', label: 'Other review platforms', type: 'multiselect',
            options: ['HomeStars', 'TrustedPros', 'BBB', 'Yelp', 'Houzz'] },
          { key: 'content_willingness', label: 'Content preferences', type: 'multiselect',
            options: ['Willing to be interviewed for content', 'Write generically on my behalf', 'Send drafts for approval'] },
        ],
      },
      {
        key: 'backlinks',
        title: 'Backlink and citation opportunities',
        description: 'Memberships, partners, and local directories.',
        estimatedMinutes: 10,
        requiresPrevious: true,
        instructions: `Local SEO leans heavily on citations. Share everything you're already a part of.`,
        fields: [
          { key: 'trade_associations', label: 'Trade association memberships', type: 'repeatable', helpText: 'CRCA, provincial associations, etc.' },
          { key: 'manufacturer_partners', label: 'Manufacturer partner pages', type: 'repeatable', helpText: 'GAF, IKO, Malarkey — any certifications give us backlinks.' },
          { key: 'local_directories', label: 'Local directories you\'re in', type: 'repeatable' },
          { key: 'local_partnerships', label: 'Local business partnerships', type: 'repeatable' },
        ],
      },
      {
        key: 'analytics_access',
        title: 'Analytics and tracking access',
        description: 'GA, Search Console, and GBP insights.',
        estimatedMinutes: 10,
        requiresPrevious: true,
        instructions: `Grant read access so we can measure progress.`,
        tasks: [
          { key: 'ga_access_granted', label: 'Google Analytics access granted', required: true },
          { key: 'gsc_access_granted', label: 'Google Search Console access granted', required: true },
        ],
      },
    ],
  },
];

export function getService(key: ServiceKey): ServiceDef | undefined {
  return SERVICES.find(s => s.key === key);
}

export function getModule(serviceKey: ServiceKey, moduleKey: string): ModuleDef | undefined {
  return getService(serviceKey)?.modules.find(m => m.key === moduleKey);
}
