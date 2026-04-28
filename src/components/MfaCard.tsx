import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, KeyRound, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/cn';

type Status = 'loading' | 'idle' | 'enrolling' | 'verifying' | 'enrolled';

interface FactorSummary {
  id: string;
  friendlyName: string | null;
  status: 'verified' | 'unverified';
}

/**
 * Multi-Factor Authentication enrollment + management card.
 *
 * Flow:
 *  1. listFactors → if a verified TOTP factor exists, show "Enrolled" state
 *  2. enroll → returns QR code + secret. User scans with Authy / 1Password
 *  3. challenge → returns challenge id; user types 6-digit code
 *  4. verify → factor is marked verified, AAL upgrades on next sign-in
 *
 * Removal goes through unenroll(factorId).
 */
export function MfaCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [factor, setFactor] = useState<FactorSummary | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setStatus('loading');
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.warn('[mfa] listFactors failed', error);
      setStatus('idle');
      return;
    }
    const verified = (data?.totp ?? []).find(f => f.status === 'verified');
    if (verified) {
      setFactor({ id: verified.id, friendlyName: verified.friendly_name ?? null, status: 'verified' });
      setStatus('enrolled');
    } else {
      setFactor(null);
      setStatus('idle');
    }
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Clean up any half-finished factors from a previous attempt so we
      // don't pile up unverified rows in the auth schema.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.totp ?? []) {
        if (f.status !== 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator (${new Date().toLocaleDateString()})`,
      });
      if (error) throw error;
      setQrSvg(data?.totp?.qr_code ?? null);
      setSecret(data?.totp?.secret ?? null);
      setFactorId(data?.id ?? null);
      setStatus('enrolling');
    } catch (e) {
      toast.error('Could not start MFA setup', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!factorId || !code.trim()) return;
    setBusy(true);
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;
      const challengeId = challengeData?.id;
      if (!challengeId) throw new Error('No challenge id returned');

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });
      if (verifyErr) throw verifyErr;

      toast.success('MFA enabled. From now on, sign-in will ask for a 6-digit code.');
      setCode('');
      setQrSvg(null);
      setSecret(null);
      setFactorId(null);
      await refresh();
    } catch (e) {
      toast.error('Code did not match', { description: e instanceof Error ? e.message : 'Try again with a fresh code.' });
    } finally {
      setBusy(false);
    }
  };

  const removeMfa = async () => {
    if (!factor) return;
    if (!window.confirm('Remove MFA from your account? Sign-in will go back to password-only.')) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      toast.success('MFA removed');
      await refresh();
    } catch (e) {
      toast.error('Could not remove MFA', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-4">
        <div className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
          status === 'enrolled' ? 'bg-success/15 text-success' : 'bg-orange/10 text-orange',
        )}>
          {status === 'enrolled' ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg tracking-[-0.01em]">Two-factor authentication</h3>
          <p className="text-sm text-white/55 mt-1 leading-relaxed">
            Adds a 6-digit code from your phone on top of your password. Even if your password leaks, an attacker still cannot sign in without your phone.
          </p>
        </div>
      </div>

      {status === 'loading' && (
        <p className="text-sm text-white/45">Checking…</p>
      )}

      {status === 'idle' && (
        <button onClick={startEnroll} disabled={busy} className="btn-primary">
          <KeyRound className="h-4 w-4" /> {busy ? 'Setting up…' : 'Set up two-factor'}
        </button>
      )}

      {status === 'enrolling' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border-subtle bg-bg-tertiary/40 p-4">
            <p className="text-sm font-semibold mb-3">1. Scan this with your authenticator app</p>
            {qrSvg && (
              <div className="bg-white inline-block rounded-md p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            )}
            {secret && (
              <div className="mt-3">
                <p className="text-[11px] text-white/45 uppercase tracking-wider mb-1">Or paste this secret manually</p>
                <code className="text-xs text-orange font-mono break-all">{secret}</code>
              </div>
            )}
            <p className="text-xs text-white/45 mt-3">Apps that work: 1Password, Authy, Google Authenticator, Microsoft Authenticator.</p>
          </div>

          <div>
            <label className="label" htmlFor="mfa-code">2. Enter the 6-digit code from your app</label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input tabular-nums tracking-[0.4em] text-center text-lg"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={verifyCode} disabled={busy || code.length !== 6} className="btn-primary flex-1">
              <Check className="h-4 w-4" /> {busy ? 'Verifying…' : 'Verify and enable'}
            </button>
            <button
              onClick={() => { setStatus('idle'); setQrSvg(null); setSecret(null); setFactorId(null); setCode(''); }}
              disabled={busy}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === 'enrolled' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Two-factor is on</p>
              <p className="text-xs text-white/55">{factor?.friendlyName ?? 'Authenticator app'}</p>
            </div>
          </div>
          <button onClick={removeMfa} disabled={busy} className="inline-flex items-center gap-2 text-sm text-error hover:text-error/80">
            <Trash2 className="h-4 w-4" /> Remove two-factor
          </button>
        </div>
      )}
    </div>
  );
}
