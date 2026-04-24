import { supabase } from '../supabase';
import { toProfile } from './mappers';
import type { Profile } from '../../types';

/**
 * Sign in with email/password. Returns the authenticated Profile.
 * Throws on any failure (invalid credentials, network error, etc.).
 */
export async function signIn(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Sign-in returned no user');
  return loadProfile(data.user.id);
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
