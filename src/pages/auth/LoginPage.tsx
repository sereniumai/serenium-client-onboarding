import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../auth/AuthContext';
import { listOrgsForUser } from '../../lib/db/orgs';
import { signInWithGoogle } from '../../lib/db/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      const profile = await signIn(data.email, data.password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        const orgs = await listOrgsForUser(profile.id);
        if (orgs[0]) {
          navigate(`/onboarding/${orgs[0].slug}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Sign in failed');
    }
  };

  return (
    <AuthLayout
      eyebrow="Client Portal"
      title={<>Welcome <span className="text-orange">back</span>.</>}
      subtitle="Sign in to pick up where you left off."
      footer={<>Need help? <a href="mailto:contact@sereniumai.com" className="text-orange hover:text-orange-hover">contact@sereniumai.com</a></>}
    >
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

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle" /></div>
          <div className="relative flex justify-center"><span className="px-3 text-xs uppercase tracking-wider text-white/40 bg-bg-secondary">or</span></div>
        </div>

        <button
          type="button"
          onClick={() => signInWithGoogle().catch(err => setSubmitError(err.message))}
          className="btn-secondary w-full"
        >
          <GoogleMark /> Sign in with Google
        </button>

        <div className="flex items-center justify-between text-sm pt-2">
          <Link to="/forgot-password" className="text-white/60 hover:text-white transition-colors">
            Forgot password?
          </Link>
          <span className="text-white/40 text-xs">Invite-only · no public signup</span>
        </div>
      </form>
    </AuthLayout>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M12 5c1.617 0 3.102.6 4.24 1.69l3.165-3.165A11 11 0 0 0 12 1a11 11 0 0 0-9.79 6l3.69 2.87A6.55 6.55 0 0 1 12 5z" />
      <path fill="#4285F4" d="M23 12.23c0-.82-.07-1.61-.2-2.37H12v4.49h6.18A5.28 5.28 0 0 1 16 17.62l3.67 2.85A10.7 10.7 0 0 0 23 12.23z" />
      <path fill="#FBBC05" d="M5.9 14.13A6.55 6.55 0 0 1 5.54 12c0-.74.13-1.45.36-2.13L2.21 7A11 11 0 0 0 1 12c0 1.78.42 3.46 1.21 5l3.69-2.87z" />
      <path fill="#34A853" d="M12 23a10.6 10.6 0 0 0 7.67-2.8l-3.67-2.85A6.5 6.5 0 0 1 5.9 14.13L2.21 17A11 11 0 0 0 12 23z" />
    </svg>
  );
}
