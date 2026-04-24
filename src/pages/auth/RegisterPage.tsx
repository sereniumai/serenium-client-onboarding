import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { supabase } from '../../lib/supabase';
import { getInvitationByToken, acceptInvitation, type InvitationLookup } from '../../lib/db/invitations';
import { listOrgsForUser } from '../../lib/db/orgs';
import { loadProfile } from '../../lib/db/auth';
import { useAuth } from '../../auth/AuthContext';

type Stage = 'loading' | 'ready' | 'submitting' | 'error' | 'already-accepted' | 'expired' | 'invalid';

export function RegisterPage() {
  const [params] = useSearchParams();
  const token = params.get('invite') ?? params.get('token');
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [stage, setStage] = useState<Stage>(token ? 'loading' : 'invalid');
  const [invitation, setInvitation] = useState<InvitationLookup | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const inv = await getInvitationByToken(token);
        if (!inv) { setStage('invalid'); return; }
        if (inv.acceptedAt) { setStage('already-accepted'); setInvitation(inv); return; }
        if (new Date(inv.expiresAt) < new Date()) { setStage('expired'); setInvitation(inv); return; }
        setInvitation(inv);
        setFullName(inv.fullName ?? '');
        setStage('ready');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load invitation.');
        setStage('error');
      }
    })();
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !token) return;
    setErrorMsg(null);
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }
    if (password !== password2) { setErrorMsg('Passwords do not match.'); return; }
    setStage('submitting');

    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: { full_name: fullName.trim(), role: 'client' },
        },
      });
      if (signUpErr) {
        // If the account already exists, their password might not match.
        // Safer to bounce them to /login with a banner than silently retrying signIn.
        if (signUpErr.message.toLowerCase().includes('already')) {
          navigate(`/login?invited=1&email=${encodeURIComponent(invitation.email)}`, { replace: true });
          return;
        }
        throw signUpErr;
      }

      // Prefer the session returned by signUp directly, getSession() races
      // against localStorage persistence on some browsers.
      let session = signUpData?.session ?? null;
      if (!session) {
        const { data: sess } = await supabase.auth.getSession();
        session = sess.session;
      }
      if (!session) {
        setErrorMsg('Account created. Please check your email to confirm it, then sign in.');
        setStage('ready');
        return;
      }

      await acceptInvitation(token);
      // Force a token refresh so the new organization_members row is reflected
      // in the JWT before we query org membership.
      await supabase.auth.refreshSession().catch(() => {});
      await refresh();

      const profile = await loadProfile(session.user.id);
      const orgs = await listOrgsForUser(profile.id);
      if (orgs[0]) navigate(`/onboarding/${orgs[0].slug}`, { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign up failed.');
      setStage('ready');
    }
  };

  if (stage === 'loading') {
    return (
      <AuthLayout eyebrow="Accept Invitation" title={<>Checking your <span className="text-orange">invitation</span>…</>}>
        <p className="text-sm text-white/60">One moment.</p>
      </AuthLayout>
    );
  }

  if (stage === 'invalid') {
    return (
      <AuthLayout
        title={<>No <span className="text-orange">invitation</span> found.</>}
        subtitle="Registration is invite-only. Check your inbox for a link from Serenium."
        footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
      >
        <div className="text-sm text-white/60 leading-relaxed">
          Your Serenium onboarding portal is invitation-only. If you're expecting access,
          reach out to <a href="mailto:contact@sereniumai.com" className="text-orange">contact@sereniumai.com</a>.
        </div>
      </AuthLayout>
    );
  }

  if (stage === 'expired') {
    return (
      <AuthLayout
        title={<>This invitation has <span className="text-orange">expired</span>.</>}
        subtitle={invitation ? `The invite for ${invitation.email} is no longer valid.` : undefined}
        footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
      >
        <p className="text-sm text-white/60">Ask your Serenium contact to send you a fresh invitation.</p>
      </AuthLayout>
    );
  }

  if (stage === 'already-accepted') {
    return (
      <AuthLayout
        title={<>You're already <span className="text-orange">set up</span>.</>}
        subtitle={invitation ? `Sign in with ${invitation.email}.` : 'Sign in to continue.'}
        footer={<Link to="/login" className="text-orange hover:text-orange-hover">Back to sign in</Link>}
      >
        <p className="text-sm text-white/60">This invitation has already been accepted. Head to sign in.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Accept Invitation"
      title={invitation ? <>Welcome to <span className="text-orange">{invitation.organizationName}</span>.</> : <>Set up your account</>}
      subtitle="Create a password and you're in."
      footer={<Link to="/login" className="text-orange hover:text-orange-hover">Already have an account? Sign in</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={invitation?.email ?? ''} disabled />
          <p className="text-xs text-white/40 mt-1.5">Locked to the invited address.</p>
        </div>
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" type="text" required className="input" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" required minLength={8} className="input" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pw2">Confirm password</label>
          <input id="pw2" type="password" required className="input" value={password2} onChange={e => setPassword2(e.target.value)} />
        </div>
        {errorMsg && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">{errorMsg}</div>
        )}
        <button type="submit" disabled={stage === 'submitting'} className="btn-primary w-full">
          {stage === 'submitting' ? 'Creating account…' : 'Create account & sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
