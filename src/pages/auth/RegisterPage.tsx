import { useSearchParams, Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';

export function RegisterPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  if (!token) {
    return (
      <AuthLayout
        title={<>No <span className="text-orange">invitation</span> found.</>}
        subtitle="Registration is invite-only. Check your inbox for a link from Serenium."
        footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
      >
        <div className="text-sm text-white/60 leading-relaxed">
          Your Serenium onboarding portal is invitation-only. If you're expecting access,
          check your email for a link ending in <code className="px-1.5 py-0.5 rounded bg-bg-tertiary text-orange">?token=...</code> or
          reach out to <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Accept Invitation"
      title={<>Set up your <span className="text-orange">account</span>.</>}
      subtitle="Final step before you can get started."
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-orange/30 bg-orange/5 p-4 text-sm text-white/70">
          Registration will wire up to Supabase in a later phase. Token detected: <code className="text-orange break-all">{token.slice(0, 12)}…</code>
        </div>
        <Link to="/login" className="btn-secondary w-full">Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}
