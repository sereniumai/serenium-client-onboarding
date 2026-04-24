import { useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../auth/AuthContext';
import { listOrgsForUser } from '../../lib/db/orgs';

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      // Race signIn against a 15-second timeout so the button can never stick.
      // If any step hangs (cold start, stale session, etc) the user gets a
      // specific error and can retry instead of staring at "Signing in…".
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Sign-in is taking too long. Try refreshing the page.")), 15000),
      );
      const profile = await Promise.race([signIn(data.email, data.password), timeout]);

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from) { navigate(from, { replace: true }); return; }

      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        const orgs = await Promise.race([listOrgsForUser(profile.id), timeout]).catch(() => []);
        if (orgs[0]) navigate(`/onboarding/${orgs[0].slug}`, { replace: true });
        else navigate('/', { replace: true });
      }
    } catch (e) {
      console.error('[login] failed', e);
      setSubmitError(e instanceof Error ? e.message : 'Sign in failed');
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
      {invitedNotice && (
        <div className="mb-4 rounded-lg border border-orange/30 bg-orange/10 p-3 text-sm text-orange">
          You're already signed up. Log in below to continue.
        </div>
      )}
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

        {submitError && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
            {submitError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center justify-between text-sm pt-2">
          <Link to="/forgot-password" className="text-white/60 hover:text-white transition-colors">
            Forgot password?
          </Link>
          <span className="text-white/55 text-xs">Invite-only · no public signup</span>
        </div>
      </form>
    </AuthLayout>
  );
}
