import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User, Mail, Lock, Save, ChevronLeft, Moon, Sun, ShieldOff } from 'lucide-react';
import { getTheme, setTheme, type Theme } from '../../lib/theme';
import { toast } from 'sonner';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/cn';

export function AccountPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (!user) return null;

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />
        <div className="relative mx-auto max-w-2xl px-4 md:px-6 pt-8 md:pt-14 pb-16">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <p className="eyebrow mb-2">Your account</p>
          <h1 className="font-display font-black text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] mb-2">
            {user.fullName}
          </h1>
          <p className="text-white/55 text-sm mb-10">{user.email} · {user.role === 'admin' ? 'Admin' : 'Client'}</p>

          <div className="space-y-6">
            <ProfileCard
              initialName={user.fullName}
              onSaved={() => { refresh(); qc.invalidateQueries(); toast.success('Profile updated'); }}
            />
            <EmailCard
              initialEmail={user.email}
              onSaved={() => { refresh(); qc.invalidateQueries(); toast.success('Email updated, check your inbox to confirm the change'); }}
            />
            <PasswordCard />
            <AppearanceCard />
            <SessionCard />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ProfileCard({ initialName, onSaved }: { initialName: string; onSaved: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const dirty = name !== initialName;

  const save = async () => {
    if (!user || !dirty) return;
    setSaving(true);
    try {
      // Update profile row (canonical source of truth for display name).
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ full_name: name.trim() })
        .eq('id', user.id);
      if (dbErr) throw dbErr;
      // Keep auth user_metadata in sync so new tokens carry the updated name.
      await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      onSaved();
    } catch (err) {
      toast.error('Could not update name', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon={User} title="Display name" subtitle="Shown across the portal and on emails we send about you.">
      <input
        type="text"
        className="input"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Full name"
      />
      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={!dirty || saving || !name.trim()} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save name'}
        </button>
      </div>
    </SettingsCard>
  );
}

function EmailCard({ initialEmail, onSaved }: { initialEmail: string; onSaved: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const dirty = email.trim().toLowerCase() !== initialEmail.toLowerCase();

  const save = async () => {
    if (!dirty) return;
    const next = email.trim().toLowerCase();
    if (!next.includes('@')) { toast.error('That doesn\'t look like a valid email'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
      onSaved();
    } catch (err) {
      toast.error('Could not update email', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon={Mail} title="Email address" subtitle="Used to sign in and receive portal emails. Supabase sends a confirmation link when you change this.">
      <input
        type="email"
        className="input"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@company.com"
      />
      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={!dirty || saving} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Updating…' : 'Update email'}
        </button>
      </div>
    </SettingsCard>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = calcStrength(pw);
  const tooShort = pw.length > 0 && pw.length < 10;
  const mismatch = pw2.length > 0 && pw !== pw2;
  const canSave = pw.length >= 10 && pw === pw2 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw(''); setPw2('');
      toast.success('Password updated');
    } catch (err) {
      toast.error('Could not update password', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon={Lock} title="Password" subtitle="Pick at least 10 characters. Longer is better than complex.">
      <div className="space-y-3">
        <input
          type="password"
          className="input"
          placeholder="New password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onFocus={() => setShowHints(true)}
          autoComplete="new-password"
        />
        {pw.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-bg-tertiary overflow-hidden">
              <div className={cn('h-full transition-all', strength.color)} style={{ width: `${strength.pct}%` }} />
            </div>
            <span className="text-[11px] text-white/50 w-16 text-right">{strength.label}</span>
          </div>
        )}
        <input
          type="password"
          className="input"
          placeholder="Confirm password"
          value={pw2}
          onChange={e => setPw2(e.target.value)}
          autoComplete="new-password"
        />
        {tooShort && <p className="text-xs text-error">At least 10 characters.</p>}
        {mismatch && <p className="text-xs text-error">Passwords don't match.</p>}
        {showHints && pw.length === 0 && <p className="text-xs text-white/40">Tip: longer passwords are stronger than complex ones. 16 random lowercase letters beats an 8-character "P@ssw0rd!".</p>}
      </div>
      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={!canSave} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </SettingsCard>
  );
}

function AppearanceCard() {
  const [current, setCurrent] = useState<Theme>(getTheme());
  const pick = (t: Theme) => { setTheme(t); setCurrent(t); };
  return (
    <SettingsCard icon={current === 'light' ? Sun : Moon} title="Appearance" subtitle="Pick light or dark. The choice follows you across devices in your browser.">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => pick('dark')}
          className={cn(
            'relative rounded-xl border p-4 text-left transition-all',
            current === 'dark' ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis',
          )}
        >
          <div className="h-16 rounded-lg bg-[#0A0706] border border-white/10 mb-3 relative overflow-hidden">
            <div className="absolute left-2 top-2 h-1.5 w-8 rounded-full bg-white/60" />
            <div className="absolute left-2 bottom-2 h-1 w-12 rounded-full bg-orange" />
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-orange" />
            <p className="font-semibold text-sm">Dark</p>
            {current === 'dark' && <span className="ml-auto text-[10px] uppercase tracking-wider text-orange font-semibold">Active</span>}
          </div>
        </button>
        <button
          onClick={() => pick('light')}
          className={cn(
            'relative rounded-xl border p-4 text-left transition-all',
            current === 'light' ? 'border-orange bg-orange/5' : 'border-border-subtle hover:border-border-emphasis',
          )}
        >
          <div className="h-16 rounded-lg bg-[#F6F3EF] border border-black/10 mb-3 relative overflow-hidden">
            <div className="absolute left-2 top-2 h-1.5 w-8 rounded-full bg-black/60" />
            <div className="absolute left-2 bottom-2 h-1 w-12 rounded-full bg-orange" />
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-orange" />
            <p className="font-semibold text-sm">Light</p>
            {current === 'light' && <span className="ml-auto text-[10px] uppercase tracking-wider text-orange font-semibold">Active</span>}
          </div>
        </button>
      </div>
    </SettingsCard>
  );
}

function SessionCard() {
  const [signingOut, setSigningOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  const signOutAll = async () => {
    setConfirmOpen(false);
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success('Signed out everywhere');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Could not sign out', { description: (err as Error).message });
      setSigningOut(false);
    }
  };

  return (
    <SettingsCard icon={ShieldOff} title="Sessions" subtitle="Sign out of every device where you are logged in. Use this if you suspect your account is compromised.">
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={signingOut}
        className="btn-danger"
      >
        <ShieldOff className="h-4 w-4" /> {signingOut ? 'Signing out…' : 'Sign out everywhere'}
      </button>
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-all-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmOpen(false)}
          onKeyDown={e => { if (e.key === 'Escape') setConfirmOpen(false); }}
        >
          <div
            className="card max-w-md w-full space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <ShieldOff className="h-5 w-5" />
              </div>
              <div>
                <h3 id="signout-all-title" className="font-display font-bold text-lg tracking-[-0.01em]">Sign out everywhere?</h3>
                <p className="text-xs text-white/60 leading-relaxed mt-1">
                  You'll be signed out of every device where you're currently logged in, including this one. You'll need to log in again.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setConfirmOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={signOutAll} className="btn-primary text-error border-error/30 bg-error/10 hover:bg-error/20">
                <ShieldOff className="h-4 w-4" /> Yes, sign out everywhere
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

function SettingsCard({ icon: Icon, title, subtitle, children }: {
  icon: typeof User;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg tracking-[-0.01em]">{title}</h3>
          <p className="text-xs text-white/55 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

function calcStrength(pw: string): { pct: number; label: string; color: string } {
  if (pw.length === 0) return { pct: 0, label: '', color: 'bg-white/20' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 1) return { pct: 20, label: 'Weak',     color: 'bg-error' };
  if (score === 2) return { pct: 40, label: 'Okay',     color: 'bg-warning' };
  if (score === 3) return { pct: 65, label: 'Good',     color: 'bg-orange' };
  if (score === 4) return { pct: 85, label: 'Strong',   color: 'bg-success' };
  return            { pct: 100, label: 'Excellent',     color: 'bg-success' };
}
