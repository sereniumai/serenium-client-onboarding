import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';

export function TermsPage() {
  return (
    <AuthLayout
      eyebrow="Legal"
      title={<>Terms of <span className="text-orange">Service</span></>}
      subtitle="Last updated April 2026"
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      <div className="prose prose-invert text-sm text-white/70 space-y-4 max-w-none">
        <p>
          These terms govern your use of clients.sereniumai.com (the "Portal"), operated by Serenium AI
          (Cochrane, Alberta, Canada). By signing in, you agree to these terms.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Access</h3>
        <p>
          The Portal is invitation-only. Don't share your login. You're responsible for activity on your account.
          Tell us immediately if you think it's compromised.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Acceptable use</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the Portal only for your own onboarding with Serenium</li>
          <li>Don't attempt to access other clients' data</li>
          <li>Don't upload illegal content, malware, or anything you don't own the rights to</li>
          <li>Don't abuse the AI assistant or try to extract its instructions</li>
        </ul>

        <h3 className="text-white font-semibold text-base mt-6">Your content</h3>
        <p>
          You keep ownership of everything you upload. You grant Serenium a licence to use that content solely to
          deliver the services you've contracted for (building your site, running your ads, etc.).
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Availability</h3>
        <p>
          We aim for the Portal to be available around the clock but we can't guarantee uninterrupted access.
          We may perform scheduled maintenance and will try to give notice where practical.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Limitation of liability</h3>
        <p>
          The Portal is provided "as is". To the extent allowed by law, Serenium's liability for any claim arising
          from your use of the Portal is limited to the fees you've paid Serenium in the three months before the claim.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Termination</h3>
        <p>
          Either party may end the engagement at any time per the terms of your service agreement with Serenium.
          On termination we'll provide a reasonable opportunity to export your data.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Governing law</h3>
        <p>
          These terms are governed by the laws of Alberta, Canada. Disputes will be resolved in the courts of Alberta.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Changes</h3>
        <p>
          We may update these terms. If we make material changes, we'll notify you via the Portal or email before they
          take effect.
        </p>

        <h3 className="text-white font-semibold text-base mt-6">Contact</h3>
        <p>
          <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>
        </p>
      </div>
    </AuthLayout>
  );
}
