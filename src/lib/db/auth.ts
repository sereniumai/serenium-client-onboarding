import { supabase } from '../supabase';
import { toProfile } from './mappers';
import type { Profile } from '../../types';

/**
 * Sign in with email/password. Returns the authenticated Profile.
 *
 * Race-prone scenarios handled:
 * 1. A stuck session-restore from page load can contend with the new login.
 *    We clear any partial session state first so signInWithPassword starts
 *    on clean ground.
 * 2. loadProfile is decoupled from signIn and raced against a short timeout
 *    independently, so a slow RLS check can't block the navigation.
 *
 * Throws on any failure (invalid credentials, network error, etc.).
 */
/**
 * Thrown by signIn() when the user has a verified MFA factor and needs
 * to enter their 6-digit code before the session is fully authenticated.
 * Caller (LoginPage) should switch to the MFA code prompt and call
 * completeMfaChallenge() with the resulting code.
 */
export class MfaRequiredError extends Error {
  factorId: string;
  constructor(factorId: string) {
    super('MFA_REQUIRED');
    this.factorId = factorId;
    this.name = 'MfaRequiredError';
  }
}

/** Verify the 6-digit TOTP code against an active factor + new challenge. */
export async function completeMfaChallenge(factorId: string, code: string): Promise<Profile> {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw challengeErr;
  if (!challenge?.id) throw new Error('Could not start MFA challenge');

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyErr) throw verifyErr;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Lost session after MFA verify');
  return loadProfile(user.id);
}

export async function signIn(email: string, password: string, captchaToken?: string): Promise<Profile> {
  // Clear any stale session on disk. Don't block on it.
  try {
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing) {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise(r => setTimeout(r, 500)),
      ]);
    }
  } catch {}

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign-in returned no user');

  // If the user has a verified MFA factor, the session is currently AAL1
  // and must be elevated to AAL2 via a TOTP code before we treat them as
  // signed in. Surface a typed error so LoginPage can swap to the code
  // prompt without trying to navigate.
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = (factors?.totp ?? []).find(f => f.status === 'verified');
      if (verified) throw new MfaRequiredError(verified.id);
    }
  } catch (e) {
    if (e instanceof MfaRequiredError) throw e;
    // Fall through, AAL lookup failures shouldn't block sign-in.
    console.warn('[auth] MFA AAL check failed, continuing', e);
  }

  // Try to load the full profile with a short 3s budget. If the DB is slow,
  // fall back to a stub profile derived from the JWT metadata so the user
  // gets navigated into the app. AuthContext's listener will finish hydrating
  // the full profile in the background.
  try {
    const profile = await Promise.race([
      loadProfile(data.user.id),
      new Promise<Profile>((_, reject) => setTimeout(() => reject(new Error('slow')), 3000)),
    ]);
    return profile;
  } catch (err) {
    console.warn('[auth] loadProfile slow or failed, using JWT stub', err);
    const meta = data.user.user_metadata ?? {};
    const stub: Profile = {
      id: data.user.id,
      email: data.user.email ?? email,
      fullName: (meta.full_name as string) ?? data.user.email ?? '',
      role: ((meta.role as 'admin' | 'client') ?? 'client'),
    };
    return stub;
  }
}

export async function signUp(args: {
  email: string;
  password: string;
  fullName: string;
  role?: 'admin' | 'client';
  captchaToken?: string;
}): Promise<Profile> {
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        full_name: args.fullName,
        role: args.role ?? 'client',
      },
      ...(args.captchaToken ? { captchaToken: args.captchaToken } : {}),
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign-up returned no user');
  return loadProfile(data.user.id);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? (typeof window !== 'undefined' ? `${window.location.origin}/` : undefined),
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string, captchaToken?: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
    ...(captchaToken ? { captchaToken } : {}),
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Profile not found for user ' + userId);
  return toProfile(data);
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return loadProfile(session.user.id);
}
