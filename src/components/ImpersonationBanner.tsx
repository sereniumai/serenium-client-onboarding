import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../lib/mockDb';

const IMPERSONATOR_KEY = 'serenium.impersonator';

export function registerImpersonation(adminUserId: string) {
  sessionStorage.setItem(IMPERSONATOR_KEY, adminUserId);
}

export function ImpersonationBanner() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [impersonatorId, setImpersonatorId] = useState<string | null>(null);

  useEffect(() => {
    setImpersonatorId(sessionStorage.getItem(IMPERSONATOR_KEY));
  }, [user]);

  const active = impersonatorId && user && user.id !== impersonatorId;
  if (!active) return null;

  const stop = async () => {
    const adminId = sessionStorage.getItem(IMPERSONATOR_KEY);
    sessionStorage.removeItem(IMPERSONATOR_KEY);
    if (adminId) {
      db.impersonate(adminId);
      window.location.href = '/admin';
    } else {
      await signOut();
      navigate('/login');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="sticky top-0 z-[60] bg-gradient-to-r from-orange via-orange-hover to-orange text-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-2.5 flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-4 w-4 shrink-0" />
            <p className="truncate">
              <span className="font-semibold">Viewing as client</span>
              {user && <> · {user.fullName}</>}
            </p>
          </div>
          <button
            onClick={stop}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 font-semibold text-xs transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
