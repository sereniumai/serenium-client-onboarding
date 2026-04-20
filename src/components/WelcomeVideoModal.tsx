import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { db } from '../lib/mockDb';
import { useAuth } from '../auth/AuthContext';
import { useDbVersion } from '../hooks/useDb';

export function WelcomeVideoModal() {
  const { user } = useAuth();
  useDbVersion();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (dismissed) return;
    if (!user || user.role !== 'client') return;
    const welcome = db.getWelcomeVideo();
    if (!welcome) { setShow(false); return; }
    if (db.hasSeenWelcome(user.id)) { setShow(false); return; }
    setShow(true);
  }, [user, dismissed]);

  const dismiss = () => {
    if (user) db.markWelcomeSeen(user.id);
    setDismissed(true);
    setShow(false);
  };

  const welcome = db.getWelcomeVideo();
  if (!welcome) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-bg/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className="w-full max-w-3xl card p-0 overflow-hidden relative"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-bg/80 backdrop-blur flex items-center justify-center text-white/70 hover:text-white hover:bg-bg transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="aspect-video bg-black">
              <video
                ref={videoRef}
                src={welcome.fileUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>

            <div className="p-6 md:p-8 text-center">
              <p className="eyebrow mb-3">Welcome to Serenium</p>
              <h2 className="font-display font-black text-2xl md:text-3xl tracking-[-0.025em] mb-2">
                {user?.fullName.split(' ')[0] ?? 'Hey there'}, we're glad you're here.
              </h2>
              <p className="text-white/60 text-sm max-w-md mx-auto mb-6">
                Watch this short intro, then dive into the steps below whenever you're ready.
              </p>
              <button onClick={dismiss} className="btn-primary">Let's get started</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
