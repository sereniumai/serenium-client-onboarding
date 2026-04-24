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

    // Hydrate a profile for the given session id, with one retry. Never
    // clears the session; a DB hiccup must not log the user out.
    const hydrate = async (userId: string) => {
      const cached = userRef.current;
      if (cached && cached.id === userId) return cached;
      try {
        return await loadProfile(userId);
      } catch (err) {
        console.warn('[auth] profile load failed, retrying in 800ms', err);
        await new Promise(r => setTimeout(r, 800));
        return loadProfile(userId);
      }
    };

    // Safety net in case the Supabase listener never fires (extremely rare).
    const safetyTimer = window.setTimeout(() => {
      if (mounted && !settled) { settled = true; setLoading(false); }
    }, 8000);

    // Single source of truth. INITIAL_SESSION fires on every mount, SIGNED_IN
    // on fresh login, TOKEN_REFRESHED on background refresh, SIGNED_OUT only
    // on explicit logout. We intentionally do NOT clear the user on a missing
    // session during a non-SIGNED_OUT event, that's a transient hydration gap.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        queryClient.clear();
        if (!settled) { settled = true; setLoading(false); }
        return;
      }

      if (session?.user) {
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
          console.error('[auth] profile hydrate failed, keeping session intact', err);
        }
      } else if (event === 'INITIAL_SESSION') {
        // No session on first load, user isn't signed in. Fine.
        if (mounted) setUser(null);
      }

      if (!settled) { settled = true; setLoading(false); }
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
