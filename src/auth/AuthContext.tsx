import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { loadProfile, signIn as authSignIn, signOut as authSignOut } from '../lib/db/auth';
import { queryClient } from '../lib/queryClient';
import type { Profile } from '../types';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<Profile | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    let mounted = true;
    let settled = false;
    const markSettled = () => {
      if (mounted && !settled) { settled = true; setLoading(false); }
    };

    // Retry loadProfile up to 3x with backoff. On every failure we keep
    // whatever user was previously set, never clear to null. A DB hiccup on
    // refresh must never cause an apparent logout.
    const hydrate = async (userId: string) => {
      const cached = userRef.current;
      if (cached && cached.id === userId) return cached;
      const delays = [0, 500, 1500];
      let lastErr: unknown;
      for (const d of delays) {
        if (d) await new Promise(r => setTimeout(r, d));
        try {
          const p = await loadProfile(userId);
          console.log('[auth] profile loaded for', userId);
          return p;
        } catch (err) {
          lastErr = err;
          console.warn(`[auth] loadProfile attempt (delay=${d}) failed`, err);
        }
      }
      throw lastErr;
    };

    // Safety net in case the Supabase listener never fires.
    const safetyTimer = window.setTimeout(markSettled, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('[auth] event=', event, 'hasSession=', !!session);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        queryClient.clear();
        markSettled();
        return;
      }

      if (session?.user) {
        // First, set a stub user from the JWT so routing works immediately
        // even if the profile DB call is slow or blocked. We'll upgrade to
        // the full profile once hydrate resolves.
        if (!userRef.current || userRef.current.id !== session.user.id) {
          const meta = session.user.user_metadata ?? {};
          const stub: Profile = {
            id: session.user.id,
            email: session.user.email ?? '',
            fullName: (meta.full_name as string) ?? session.user.email ?? '',
            role: ((meta.role as 'admin' | 'client') ?? 'client'),
          };
          if (mounted) setUser(stub);
        }

        try {
          const profile = await hydrate(session.user.id);
          if (mounted) setUser(profile);

          if (event === 'SIGNED_IN' && profile.role === 'client') {
            const { data } = await supabase
              .from('organization_members')
              .select('organization_id')
              .eq('user_id', profile.id)
              .limit(1)
              .maybeSingle();
            const orgId = (data as { organization_id: string } | null)?.organization_id;
            if (orgId) {
              const { fireFirstLoginNotification } = await import('../lib/teamNotifications');
              fireFirstLoginNotification(orgId).catch(() => {});
            }
          }
        } catch (err) {
          console.error('[auth] profile hydrate failed after retries, keeping session', err);
          // Do NOT clear user here. If userRef has a prior value, it persists.
        }
      } else if (event === 'INITIAL_SESSION') {
        // Truly no session on first mount, user isn't signed in.
        if (mounted) setUser(null);
      }

      markSettled();
    });

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const profile = await authSignIn(email, password);
    setUser(profile);
    return profile;
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    queryClient.clear();
  };

  const refresh = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUser(null); return; }
    const profile = await loadProfile(session.user.id);
    setUser(profile);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
