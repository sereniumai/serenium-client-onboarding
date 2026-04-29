import { useRef, useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../../components/AuthLayout';
import { TurnstileGate, type TurnstileGateHandle } from '../../components/TurnstileGate';
import { useAuth } from '../../auth/AuthContext';
import { listOrgsForUser } from '../../lib/db/orgs';
import { completeMfaChallenge, MfaRequiredError } from '../../lib/db/auth';
import { env } from '../../lib/env';
import type { Profile } from '../../types';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const invitedNotice = params.get('invited') === '1';
  const prefillEmail = params.get('email') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef<TurnstileGateHandle>(null);
  // When Turnstile is configured, we require a token before allowing submit.
  // When not configured (local dev without VITE_TURNSTILE_SITE_KEY), we skip.
  const captchaRequired = !!env.turnstileSiteKey;

  // MFA challenge state, set when signIn throws MfaRequiredError. Swaps the
  // form view to the 6-digit code prompt without leaving the page.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail },
  });

  const navigateAfterAuth = async (profile: Profile) => {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
    if (profile.role === 'admin') { navigate('/admin', { replace: true }); return; }
    if (from) { navigate(from, { replace: true }); return; }
    const orgs = await listOrgsForUser(profile.id).catch(() => []);
    if (orgs[0]) navigate(`/onboarding/${orgs[0].slug}`, { replace: true });
    else navigate('/', { replace: true });
  };

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    if (captchaRequired && !captchaToken) {
      setSubmitError('Please complete the verification check above.');
      return;
    }
    try {
      // Race signIn against a 15-second timeout so the button can never stick.
      // If any step hangs (cold start, stale session, etc) the user gets a
      // specific error and can retry instead of staring at "Signing in…".
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Sign-in is taking too long. Try refreshing the page.")), 15000),
      );
      const profile = await Promise.race([signIn(data.email, data.password, captchaToken || undefined), timeout]);
      await navigateAfterAuth(profile);
    } catch (e) {
      if (e instanceof MfaRequiredError) {
        // Password was correct, now ask for the TOTP code instead of failing.
        setMfaFactorId(e.factorId);
        setSubmitError(null);
        return;
      }
      console.error('[login] failed', e);
      setSubmitError(e instanceof Error ? e.message : 'Sign in failed');
      // Turnstile tokens are single-use. On any failure we force a fresh
      // challenge so the user can retry without hitting "timeout-or-duplicate".
      turnstileRef.current?.reset();
    }
  };

  const onSubmitMfa = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setMfaSubmitting(true);
    setSubmitError(null);
    try {
      const profile = await completeMfaChallenge(mfaFactorId, mfaCode);
      await navigateAfterAuth(profile);
    } catch (e) {
      console.error('[login mfa] failed', e);
      setSubmitError(e instanceof Error ? `Code didn't match. Try again with a fresh code.` : 'MFA verification failed');
      setMfaCode('');
    } finally {
      setMfaSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Client Portal"
      title={<>Welcome <span className="text-orange">back</span>.</>}
      subtitle="Sign in to pick up where you left off."
      footer={
        <div className="space-y-1">
          <div>Need help? <a href="mailto:contact@sereniumai.com" className="text-orange hover:text-orange-hover">contact@sereniumai.com</a></div>
          <div className="text-xs text-white/35">
            <Link to="/privacy" className="hover:text-white/60">Privacy</Link>
            <span className="mx-2">·</span>
            <Link to="/terms" className="hover:text-white/60">Terms</Link>
          </div>
        </div>
      }
    >
      {invitedNotice && !mfaFactorId && (
        <div className="mb-4 rounded-lg border border-orange/30 bg-orange/10 p-3 text-sm text-orange">
          You're already signed up. Log in below to continue.
        </div>
      )}

      {mfaFactorId ? (
        <form onSubmit={(e) => { e.preventDefault(); onSubmitMfa(); }} className="space-y-5" noValidate>
          <div>
            <label className="label" htmlFor="mfa-code">Two-factor code</label>
            <p className="text-sm text-white/55 mb-2">Enter the 6-digit code from your authenticator app.</p>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input tabular-nums tracking-[0.4em] text-center text-lg"
            />
          </div>

          {submitError && (
            <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
              {submitError}
            </div>
          )}

          <button type="submit" disabled={mfaSubmitting || mfaCode.length !== 6} className="btn-primary w-full">
            {mfaSubmitting ? 'Verifying…' : 'Verify and sign in'}
          </button>

          <button
            type="button"
            onClick={() => { setMfaFactorId(null); setMfaCode(''); setSubmitError(null); }}
            className="text-sm text-white/55 hover:text-white"
          >
            Use a different account
          </button>
        </form>
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="input"
            {...register('email')}
          />
          {errors.email && <p className="mt-2 text-sm text-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="input"
            {...register('password')}
          />
          {errors.password && <p className="mt-2 text-sm text-error">{errors.password.message}</p>}
        </div>

        <TurnstileGate ref={turnstileRef} onToken={setCaptchaToken} />

        {submitError && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
            {submitError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || (captchaRequired && !captchaToken)} className="btn-primary w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center justify-between text-sm pt-2">
          <Link to="/forgot-password" className="text-white/60 hover:text-white transition-colors">
            Forgot password?
          </Link>
          <span className="text-white/55 text-xs">Invite-only · no public signup</span>
        </div>
      </form>
      )}
    </AuthLayout>
  );
}
