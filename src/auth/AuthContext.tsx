import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { supabase } from '../lib/supabase';
import { loadProfile, signIn as authSignIn, signOut as authSignOut } from '../lib/db/auth';
import { queryClient } from '../lib/queryClient';
import { stopImpersonation } from '../lib/impersonation';
import type { Profile } from '../types';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<Profile | null>(null);
  useEffect(() => {
    userRef.current = user;
    // Tag every Sentry event with the current user so we know who hit each
    // error. We send id + role only, no email or name (PII).
    if (user) {
      Sentry.setUser({ id: user.id, segment: user.role });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  // Idle logout. Resets on any user interaction. Fires signOut after an hour
  // of no activity so abandoned sessions can't be hijacked from a stolen laptop.
  useEffect(() => {
    if (!user) return;
    let timer: number | undefined;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        supabase.auth.signOut().catch(() => {});
      }, IDLE_TIMEOUT_MS);
    };
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [user]);

  // Force a session refresh when the tab regains focus. Browsers throttle
  // setInterval in hidden tabs, so supabase-js's autoRefreshToken can miss
  // its window if a client opens onboarding, switches tabs to grab a doc,
  // and comes back 40+ minutes later. Without this they'd be silently
  // signed out on the next API call. Cheap call when the session is healthy.
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) return;
        const expiresAt = data.session.expires_at ?? 0;
        const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);
        // Refresh proactively if less than 5 minutes left.
        if (secondsLeft < 300) {
          supabase.auth.refreshSession().catch(() => {});
        }
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [user]);

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

      if (event === 'SIGNED_OUT') {
        stopImpersonation();
        setUser(null);
        queryClient.clear();
        markSettled();
        return;
      }

      if (session?.user) {
        // Set stub user from JWT immediately so routing + subsequent queries
        // can fire. Unblock the UI NOW, then hydrate real profile in bg.
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
        markSettled();

        // Background hydrate. Do NOT block markSettled on this.
        hydrate(session.user.id)
          .then(profile => { if (mounted) setUser(profile); })
          .catch(err => console.error('[auth] profile hydrate failed, keeping stub', err));

        if (event === 'SIGNED_IN' && (session.user.user_metadata as { role?: string })?.role !== 'admin') {
          supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
              const orgId = (data as { organization_id: string } | null)?.organization_id;
              if (!orgId) return;
              import('../lib/teamNotifications').then(m =>
                m.fireFirstLoginNotification(orgId).catch(() => {}),
              );
            });
        }
        return;
      }

      if (event === 'INITIAL_SESSION') {
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

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const profile = await authSignIn(email, password, captchaToken);
    setUser(profile);
    return profile;
  };

  const signOut = async () => {
    stopImpersonation();
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
