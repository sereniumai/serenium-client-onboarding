import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../auth/AuthContext';
import { db } from '../../lib/mockDb';

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
        const orgs = db.listOrganizationsForUser(profile.id);
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

        <button type="button" className="btn-secondary w-full" disabled>
          <Mail className="h-4 w-4" /> Email me a magic link
        </button>

        <div className="flex items-center justify-between text-sm pt-2">
          <Link to="/forgot-password" className="text-white/60 hover:text-white transition-colors">
            Forgot password?
          </Link>
          <span className="text-white/40 text-xs">Invite-only · no public signup</span>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-border-subtle text-xs text-white/40">
        <p className="mb-2 font-semibold text-white/60">Dev preview accounts</p>
        <p>Admin: <span className="text-white/70">adam@sereniumai.com</span></p>
        <p>Client: <span className="text-white/70">craig@surewest.ca</span></p>
        <p className="mt-1 text-white/40">Any password works in local mode.</p>
      </div>
    </AuthLayout>
  );
}
