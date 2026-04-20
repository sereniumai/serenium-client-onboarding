import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../lib/mockDb';
import type { Profile } from '../types';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(db.getCurrentUser());
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const profile = await db.signIn(email, password);
    setUser(profile);
    return profile;
  };

  const signOut = async () => {
    await db.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
