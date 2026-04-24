import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { updatePassword } from '../../lib/db/auth';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) { setError('Password must be at least 10 characters.'); return; }
    if (pw !== pw2) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await updatePassword(pw);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        eyebrow="Password Reset"
        title={<>Password <span className="text-orange">updated</span>.</>}
        footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
      >
        <p className="text-white/70 text-sm">Redirecting to sign in…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Password Reset"
      title={<>Set a new <span className="text-orange">password</span>.</>}
      subtitle="Paste a new password below. You must click the reset link in your email first so we know it's really you."
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="pw">New password</label>
          <input id="pw" type="password" required minLength={10} value={pw} onChange={e => setPw(e.target.value)} className="input" placeholder="At least 10 characters" />
        </div>
        <div>
          <label className="label" htmlFor="pw2">Confirm password</label>
          <input id="pw2" type="password" required value={pw2} onChange={e => setPw2(e.target.value)} className="input" />
        </div>
        {error && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">{error}</div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
}
