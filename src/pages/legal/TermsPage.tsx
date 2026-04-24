import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';

export function TermsPage() {
  return (
    <AuthLayout
      eyebrow="Legal"
      title={<>Terms of <span className="text-orange">Service</span></>}
      subtitle="Last updated April 24, 2026"
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      <div className="text-sm text-white/70 space-y-5 max-w-none leading-relaxed">
        <p>
          These Terms of Service ("Terms") govern your access to and use of clients.sereniumai.com (the "Portal"),
          operated by <strong className="text-white">Serenium AI Ltd.</strong> ("Serenium", "we", "us", "our")
          from Cochrane, Alberta, Canada. By accessing the Portal you agree to these Terms.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">1. Who may use the Portal</h3>
        <p>
          The Portal is a closed tool offered to businesses that Serenium has entered into a services agreement
          with. Access is by invitation only. You must be at least 18 years old and authorized to act on behalf
          of the business you are onboarding. If you are using the Portal on behalf of an entity, you represent
          that you have authority to bind that entity to these Terms.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">2. Your account</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>You are responsible for keeping your login credentials confidential</li>
          <li>Do not share your account with anyone else, including co-workers. We can add additional users at no charge</li>
          <li>Notify us immediately at contact@sereniumai.com if you suspect unauthorized access</li>
          <li>You are responsible for all activity that occurs under your account</li>
        </ul>

        <h3 className="text-white font-semibold text-base pt-4">3. Acceptable use</h3>
        <p>When using the Portal you agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Attempt to access data belonging to another Serenium client</li>
          <li>Probe, scan, or test the vulnerability of the Portal or its infrastructure</li>
          <li>Circumvent authentication, rate limits, or any security feature</li>
          <li>Upload content you do not own or have permission to share, or content that is illegal,
            infringing, defamatory, discriminatory, or malicious</li>
          <li>Upload malware, viruses, or code designed to interfere with the Portal</li>
          <li>Use the AI assistant to extract its system instructions, generate content that violates Anthropic's
            usage policies, or for purposes unrelated to your Serenium onboarding</li>
          <li>Scrape, mirror, or resell the Portal or its content</li>
          <li>Use the Portal in a way that violates Canadian law, applicable provincial law, or any regulation</li>
        </ul>

        <h3 className="text-white font-semibold text-base pt-4">4. Your content and data</h3>
        <p>
          You retain ownership of the content, files, and business information you submit to the Portal ("Client
          Content"). You grant Serenium a non-exclusive, worldwide, royalty-free licence to host, process, copy,
          modify, and display Client Content solely as necessary to operate the Portal and deliver the services
          you have contracted for (for example, building your website, running your ads, or training your AI
          assistants). This licence ends when you close your account, except for backup copies retained for the
          periods described in our Privacy Policy and for content already distributed publicly on your behalf.
        </p>
        <p>
          You represent that you have the rights to all Client Content and that it does not violate any third
          party's rights.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">5. Third-party access you grant</h3>
        <p>
          Onboarding often involves granting Serenium access to third-party systems you control (for example,
          your domain registrar, WordPress admin, Google Business Profile, Google Ads Manager, or Meta Business
          Manager). You remain responsible for those third-party accounts and for any fees or charges they
          incur. We will only use the access to deliver the services you have engaged us for.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">6. Intellectual property</h3>
        <p>
          The Portal, including its software, design, and brand, is owned by Serenium. These Terms do not
          transfer any intellectual property rights to you except the limited right to use the Portal as
          described here.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">7. Fees</h3>
        <p>
          Access to the Portal is included in your Serenium services agreement. No separate Portal fees apply.
          All fees for Serenium's services are governed by that agreement.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">8. Availability</h3>
        <p>
          We aim for the Portal to be continuously available but do not guarantee uptime. Planned maintenance
          may cause short interruptions. We will give notice where practical. We are not liable for outages
          caused by our hosting providers, third-party services, force majeure events, or your internet
          connection.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">9. AI assistant</h3>
        <p>
          The Portal includes an AI assistant powered by third-party models. Responses may be inaccurate,
          incomplete, or out of date. You must verify any factual claims before relying on them for business
          decisions. Do not submit sensitive personal information (such as government IDs, health information,
          or payment card numbers) to the assistant. We are not liable for decisions made based on assistant
          responses.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">10. Termination and suspension</h3>
        <p>
          Either party may terminate access per the terms of your services agreement with Serenium. We may
          suspend or terminate access immediately, with or without notice, if you violate these Terms, if
          required by law, or if your account poses a security risk. On termination we will give you a
          reasonable opportunity to export your data and then delete it per our Privacy Policy.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">11. Disclaimers</h3>
        <p>
          The Portal is provided on an "as is" and "as available" basis. To the maximum extent permitted by law,
          Serenium disclaims all warranties, express or implied, including merchantability, fitness for a
          particular purpose, non-infringement, and any warranties arising from course of dealing or trade usage.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">12. Limitation of liability</h3>
        <p>
          To the maximum extent permitted by law, in no event will Serenium or its officers, employees, or
          agents be liable for any indirect, incidental, special, consequential, or punitive damages, or any
          loss of profits, revenue, data, or goodwill, even if advised of the possibility. Serenium's total
          aggregate liability arising out of or relating to these Terms or the Portal is limited to the fees
          you paid Serenium in the three months preceding the event giving rise to the claim. Nothing in these
          Terms limits liability that cannot be limited under applicable Canadian law (for example, gross
          negligence, wilful misconduct, or consumer-protection rights that cannot be waived).
        </p>

        <h3 className="text-white font-semibold text-base pt-4">13. Indemnification</h3>
        <p>
          You agree to defend, indemnify, and hold harmless Serenium from any claim, damage, loss, or expense
          (including reasonable legal fees) arising from your misuse of the Portal, your Client Content, or
          your breach of these Terms.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">14. Force majeure</h3>
        <p>
          Neither party is liable for any failure or delay caused by events beyond its reasonable control,
          including natural disasters, internet outages, regional infrastructure failures, labour actions, or
          government orders.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">15. Governing law and disputes</h3>
        <p>
          These Terms are governed by the laws of the Province of Alberta and the federal laws of Canada
          applicable in Alberta. Disputes will be resolved in the courts of Alberta, and you and Serenium
          consent to exclusive jurisdiction of those courts, except either party may seek urgent injunctive
          relief in any court with jurisdiction.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">16. Changes to these Terms</h3>
        <p>
          We may update these Terms. We will notify you of material changes in the Portal or by email at least
          seven days before they take effect. Continued use of the Portal after that constitutes acceptance.
          The "Last updated" date at the top of this page shows the current version.
        </p>

        <h3 className="text-white font-semibold text-base pt-4">17. General</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>These Terms and the services agreement between you and Serenium are the entire agreement between
            the parties regarding the Portal</li>
          <li>If any provision is held unenforceable, the remaining provisions stay in effect</li>
          <li>Our failure to enforce a provision does not waive our right to do so later</li>
          <li>You may not assign these Terms without our written consent; we may assign them in connection
            with a merger, acquisition, or sale of assets</li>
          <li>Notices to Serenium should be sent to contact@sereniumai.com. Notices to you may be sent to the
            email on your Portal account</li>
        </ul>

        <h3 className="text-white font-semibold text-base pt-4">18. Contact</h3>
        <p>
          Serenium AI Ltd.<br />
          Cochrane, Alberta, Canada<br />
          <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>
        </p>
      </div>
    </AuthLayout>
  );
}
