import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';

export function PrivacyPage() {
  return (
    <AuthLayout
      eyebrow="Legal"
      title={<>Privacy <span className="text-orange">Policy</span></>}
      subtitle="Last updated April 2026"
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      <div className="prose prose-invert text-sm text-white/70 space-y-4 max-w-none">
        <p>
          Serenium AI ("we", "us") operates clients.sereniumai.com (the "Portal") for our roofing-agency clients.
          This policy explains what personal information we collect, how we use it, and your rights under Canadian
          privacy law (PIPEDA).
        </p>

        <h3 className="text-white font-semibold text-base mt-6">What we collect</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Contact details you provide (name, email, phone)</li>
          <li>Business details you enter while onboarding (business name, service areas, hours, team members)</li>
          <li>Files you upload (logos, photos, documents)</li>
          <li>Technical data (IP address, browser, timestamps) for security and fraud prevention</li>
        </ul>

        <h3 className="text-white font-semibold text-base mt-6">How we use it</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide the services you've contracted with Serenium for (ads, website, AI reception, AI SMS)</li>
          <li>To set up third-party integrations you authorize (Google, Meta, WordPress, etc.)</li>
          <li>To send you operational emails about your account and onboarding progress</li>
          <li>To debug and improve the Portal</li>
        </ul>

        <h3 className="text-white font-semibold text-base mt-6">Who we share it with</h3>
        <p>
          We use the following service providers ("subprocessors") to run the Portal. Each handles data only to deliver
          the Portal to you:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supabase (hosted database + authentication)</li>
          <li>Vercel (hosting + edge functions)</li>
          <li>Resend (transactional email)</li>
          <li>Anthropic (AI assistant inside the Portal)</li>
        </ul>
        <p>We never sell your data.</p>

        <h3 className="text-white font-semibold text-base mt-6">Your rights</h3>
        <p>
          Under PIPEDA you can ask us to access, correct, or delete your personal information. Email
          {' '}<a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>{' '}
          and we'll respond within 30 days.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Retention</h3>
        <p>
          We keep your data for as long as your engagement with Serenium is active, plus a reasonable period after
          close for accounting and legal obligations. You can request earlier deletion at any time.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Security</h3>
        <p>
          Data is encrypted in transit (TLS) and at rest. Access is limited to authenticated Serenium team members on
          a need-to-know basis. If we ever have a breach that affects you, we'll notify you within 72 hours as required
          under PIPEDA.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Contact</h3>
        <p>
          Questions? <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>.
        </p>
      </div>
    </AuthLayout>
  );
}
