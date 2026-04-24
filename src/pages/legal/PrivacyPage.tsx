import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';

export function PrivacyPage() {
  return (
    <AuthLayout
      eyebrow="Legal"
      title={<>Privacy <span className="text-orange">Policy</span></>}
      subtitle="Last updated April 24, 2026"
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      <div className="text-sm text-white/70 space-y-5 max-w-none leading-relaxed">
        <p>
          This Privacy Policy explains how <strong className="text-white">Serenium AI Ltd.</strong> ("Serenium",
          "we", "us", "our") collects, uses, discloses, and protects personal information when you use
          clients.sereniumai.com (the "Portal"). We comply with Canada's Personal Information Protection and
          Electronic Documents Act (PIPEDA) and Alberta's Personal Information Protection Act (PIPA).
        </p>
        <p>
          We are based in Cochrane, Alberta, Canada. Our Privacy Officer can be reached at{' '}
          <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">1. Who this policy covers</h3>
        <p>
          This policy applies to the business owners, staff members, and agents of Serenium client businesses who
          are invited to use the Portal. It does not cover the privacy practices of your end-customers who interact
          with you through channels we help run (such as our AI receptionist or SMS tools), which are governed by
          your own privacy obligations and our separate Data Processing Agreement.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">2. Personal information we collect</h3>
        <p className="font-medium text-white/85">From you directly:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Identity and contact details (full name, email address, phone number, mailing address)</li>
          <li>Account credentials (hashed password, session tokens)</li>
          <li>Business details you enter during onboarding (business name, hours, service areas, services offered,
            team members, credentials, insurance, warranty terms, financing partners, emergency service policies)</li>
          <li>Content and files you upload (logos, photos, documents, PDFs)</li>
          <li>Access credentials or delegations you choose to grant (for example, adding us as a manager on your
            Google Business Profile, Meta Business Manager, Google Ads Manager, WordPress admin, or domain
            registrar)</li>
          <li>Any messages you send our AI assistant or our team through the Portal</li>
        </ul>
        <p className="font-medium text-white/85 pt-2">Automatically when you use the Portal:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Device and browser information (type, version, operating system)</li>
          <li>IP address and approximate location derived from it</li>
          <li>Session timestamps, pages viewed, and feature usage</li>
          <li>Technical logs needed for security, fraud prevention, and debugging</li>
        </ul>

        <h3 className="text-white font-semibold text-base pt-4">3. Why we collect it (purposes)</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>To deliver the services you have engaged Serenium for (marketing, website, AI voice, AI SMS, reporting)</li>
          <li>To set up integrations with third-party tools you authorize</li>
          <li>To authenticate you and keep your account secure</li>
          <li>To send operational emails (invitations, follow-ups, access confirmations, monthly reports)</li>
          <li>To provide the in-Portal AI assistant that helps you complete onboarding steps</li>
          <li>To detect, investigate, and prevent abuse or security incidents</li>
          <li>To meet legal, tax, and regulatory obligations</li>
          <li>To improve the Portal (internal analytics only, no behavioural advertising)</li>
        </ul>

        <h3 className="text-white font-semibold text-base pt-4">4. Legal basis and consent</h3>
        <p>
          We rely on your consent and the necessity of processing your information to perform the services you
          have engaged us for. By creating an account and accepting our Terms of Service you consent to the
          collection and use described in this policy. You can withdraw consent at any time, subject to legal or
          contractual restrictions, by contacting us. Withdrawing consent may mean we can no longer provide some
          or all of the services.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">5. Service providers (subprocessors)</h3>
        <p>
          We use the following service providers to run the Portal. Each only processes information as needed to
          provide their service to us and is contractually bound to appropriate safeguards:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white/85">Supabase</strong> — hosted PostgreSQL database, authentication,
            and file storage (data region: United States)</li>
          <li><strong className="text-white/85">Vercel</strong> — web hosting and serverless edge functions
            (global edge network)</li>
          <li><strong className="text-white/85">Resend</strong> — transactional email delivery (United States)</li>
          <li><strong className="text-white/85">Anthropic</strong> — Claude AI model powering the in-Portal
            assistant. Messages you send the assistant are transmitted to Anthropic and are not used to train
            their models per their Zero Data Retention / API Terms</li>
          <li><strong className="text-white/85">Google Fonts</strong> — typography delivery</li>
        </ul>
        <p>
          We do not sell your personal information. We do not share it for behavioural advertising.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">6. Cross-border transfers</h3>
        <p>
          Our service providers process data primarily in the United States and on global edge networks. When
          personal information is transferred across borders, foreign governments and agencies may be able to
          access it under applicable law. We have contractual protections with each subprocessor and only share
          what is necessary. If you have concerns, please contact our Privacy Officer.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">7. Security</h3>
        <p>
          We use industry-standard safeguards to protect personal information, including encryption in transit
          (TLS 1.2+), encryption at rest, row-level security on our database, role-based access controls, secret
          management, audit logging, and short-lived access tokens. No system is perfectly secure. In the event
          of a material breach affecting your personal information, we will notify you and the Office of the
          Privacy Commissioner of Canada as required, typically within 72 hours of becoming aware of the breach.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">8. Retention</h3>
        <p>
          We keep your personal information for as long as your engagement with Serenium is active. After your
          engagement ends we retain account and operational data for up to twelve months for support and audit
          purposes, after which it is deleted or de-identified unless a longer retention period is required by
          law (for example, for tax records). You may request earlier deletion at any time.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">9. Your rights</h3>
        <p>Under PIPEDA / PIPA you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access the personal information we hold about you</li>
          <li>Ask us to correct inaccurate or incomplete information</li>
          <li>Withdraw your consent to further processing</li>
          <li>Ask us to delete your information, subject to any overriding legal obligations</li>
          <li>Receive a copy of your data in a portable format</li>
          <li>Lodge a complaint with the Office of the Privacy Commissioner of Canada</li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>.
          We respond to verified requests within 30 days.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">10. Cookies and local storage</h3>
        <p>
          The Portal uses strictly necessary browser storage (localStorage) to keep you signed in between visits
          and remember your theme preference. We do not use advertising or analytics cookies. No third-party
          tracking pixels are present.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">11. Children</h3>
        <p>
          The Portal is a business-to-business tool and is not intended for anyone under 18. We do not knowingly
          collect information from minors. If you believe we have, contact us and we will delete it.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">12. Automated decision making and AI</h3>
        <p>
          The Portal includes an AI assistant ("Aria") that can answer questions about your onboarding. It does
          not make decisions that have legal or similarly significant effects on you. Content you send to the
          assistant is transmitted to Anthropic for processing and stored in our database for your reference.
          You can clear your chat history from the assistant panel at any time.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">13. Changes to this policy</h3>
        <p>
          We may update this policy. When we make material changes we will notify you in the Portal or by email
          at least seven days before the change takes effect. Continued use of the Portal after that constitutes
          acceptance.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">14. Contact</h3>
        <p>
          Serenium AI Ltd.<br />
          Cochrane, Alberta, Canada<br />
          <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>
        </p>
      </div>
    </AuthLayout>
  );
}
