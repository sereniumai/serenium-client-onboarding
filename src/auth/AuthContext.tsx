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

    // Hard safety net, if session restore hangs for some reason, unblock the UI
    // after 8 seconds so the user can retry instead of staring at a blank screen.
    const safetyTimer = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session) {
          try {
            const profile = await loadProfile(session.user.id);
            if (mounted) setUser(profile);
          } catch (profileErr) {
            // Profile row missing or RLS blocked, sign out to force a clean re-auth.
            console.error('[auth] profile load failed, signing out', profileErr);
            await supabase.auth.signOut().catch(() => {});
          }
        }
      } catch (err) {
        console.error('[auth] session restore failed', err);
      } finally {
        window.clearTimeout(safetyTimer);
        if (mounted) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        queryClient.clear();
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          // Skip redundant DB fetch if signIn() already populated the same user.
          const cached = userRef.current;
          let profile = cached && cached.id === session.user.id ? cached : null;
          if (!profile) {
            profile = await loadProfile(session.user.id);
            if (mounted) setUser(profile);
          }

          // Fire first-login team notification for clients. Deduped server-side.
          if (event === 'SIGNED_IN' && profile.role === 'client') {
            const { supabase: sb } = await import('../lib/supabase');
            const { data } = await sb
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
          console.error('[auth] profile load failed', err);
        }
      }
    });

    return () => {
      mounted = false;
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
