import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { TurnstileGate } from '../../components/TurnstileGate';
import { supabase } from '../../lib/supabase';
import { env } from '../../lib/env';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRequired = !!env.turnstileSiteKey;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const addr = email.trim().toLowerCase();
    if (!addr.includes('@')) { setErrorMsg("That doesn't look like a valid email."); return; }
    if (captchaRequired && !captchaToken) {
      setErrorMsg('Please complete the verification check above.');
      return;
    }
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(addr, {
        redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      // Don't leak whether the account exists - show generic success UX anyway
      // per security best-practice for password-reset endpoints.
      console.error('[forgot-password]', err);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Password Reset"
      title={sent ? <>Check your <span className="text-orange">inbox</span>.</> : <>Forgot your <span className="text-orange">password</span>?</>}
      subtitle={sent ? "If an account exists for that email, you'll get a reset link shortly." : "Enter your email and we'll send you a reset link."}
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-sm text-white/60 text-center py-2">
          Didn't get it? Check spam or <button onClick={() => { setSent(false); setEmail(''); }} className="text-orange hover:text-orange-hover">try again</button>.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                   placeholder="you@company.com" className="input" autoComplete="email" />
          </div>
          <TurnstileGate onToken={setCaptchaToken} />
          {errorMsg && (
            <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">{errorMsg}</div>
          )}
          <button type="submit" disabled={submitting || (captchaRequired && !captchaToken)} className="btn-primary w-full">
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
