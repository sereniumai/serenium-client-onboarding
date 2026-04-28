import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { updatePassword } from '../../lib/db/auth';
import { supabase } from '../../lib/supabase';

/**
 * The recovery email link puts the user in a real session, but only at AAL1.
 * If they have MFA enrolled, Supabase blocks updateUser({ password }) until
 * the session is elevated to AAL2 via a TOTP challenge. We detect that on
 * mount and swap to the MFA code prompt first; only after a successful
 * verify do we show the password fields.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // MFA gate state. Until we know whether MFA is required, we render
  // nothing (mfaChecking=true). If a verified factor exists we collect a
  // 6-digit code; once verified, mfaPassed flips and the password form
  // renders.
  const [mfaChecking, setMfaChecking] = useState(true);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaPassed, setMfaPassed] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (cancelled) return;
        if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const verified = (factors?.totp ?? []).find(f => f.status === 'verified');
          if (verified) {
            setMfaFactorId(verified.id);
            setMfaChecking(false);
            return;
          }
        }
        setMfaPassed(true);
        setMfaChecking(false);
      } catch {
        // If the AAL lookup fails (no session yet, network blip), let the
        // user attempt the password update directly. Supabase will surface
        // the AAL2 error if it really is required.
        if (!cancelled) {
          setMfaPassed(true);
          setMfaChecking(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setMfaSubmitting(true);
    setError(null);
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeErr) throw challengeErr;
      if (!challenge?.id) throw new Error('Could not start MFA challenge');
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      });
      if (verifyErr) throw verifyErr;
      setMfaPassed(true);
    } catch (err) {
      setError(err instanceof Error ? `Code didn't match. Try again with a fresh code.` : 'MFA verification failed');
      setMfaCode('');
    } finally {
      setMfaSubmitting(false);
    }
  };

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

  if (mfaChecking) {
    return (
      <AuthLayout
        eyebrow="Password Reset"
        title={<>One <span className="text-orange">moment</span>.</>}
        subtitle="Verifying your reset link."
      >
        <p className="text-white/55 text-sm">Loading…</p>
      </AuthLayout>
    );
  }

  if (!mfaPassed && mfaFactorId) {
    return (
      <AuthLayout
        eyebrow="Password Reset"
        title={<>Two-factor <span className="text-orange">check</span>.</>}
        subtitle="Enter the 6-digit code from your authenticator app to continue."
        footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
      >
        <form onSubmit={onVerifyMfa} className="space-y-5" noValidate>
          <div>
            <label className="label" htmlFor="mfa-code">Two-factor code</label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input tabular-nums tracking-[0.4em] text-center text-lg"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">{error}</div>
          )}
          <button type="submit" disabled={mfaSubmitting || mfaCode.length !== 6} className="btn-primary w-full">
            {mfaSubmitting ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>
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
