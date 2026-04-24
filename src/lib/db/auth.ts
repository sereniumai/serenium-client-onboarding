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
export async function signIn(email: string, password: string): Promise<Profile> {
  const t0 = performance.now();
  console.log('[auth] signIn, starting');

  // Step 1, clear any stale session state that might be blocking a fresh sign-in.
  try {
    await Promise.race([
      supabase.auth.signOut({ scope: 'local' }),
      new Promise(r => setTimeout(r, 500)),
    ]);
  } catch {
    // Ignore, just being defensive.
  }
  console.log(`[auth] cleanup done in ${Math.round(performance.now() - t0)}ms`);

  // Step 2, actually sign in.
  const t1 = performance.now();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log(`[auth] signInWithPassword resolved in ${Math.round(performance.now() - t1)}ms`);
  if (error) throw error;
  if (!data.user) throw new Error('Sign-in returned no user');

  // Step 3, load profile with its own 8s budget.
  const t2 = performance.now();
  const profile = await Promise.race([
    loadProfile(data.user.id),
    new Promise<Profile>((_, reject) => setTimeout(() => reject(new Error('Profile load timed out. Try again.')), 8000)),
  ]);
  console.log(`[auth] loadProfile done in ${Math.round(performance.now() - t2)}ms`);
  return profile;
}

export async function signUp(args: {
  email: string;
  password: string;
  fullName: string;
  role?: 'admin' | 'client';
}): Promise<Profile> {
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        full_name: args.fullName,
        role: args.role ?? 'client',
      },
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

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
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
