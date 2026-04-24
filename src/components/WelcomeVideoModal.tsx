import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getWelcomeVideo, getWelcomeVideoSignedUrl, hasSeenWelcome, markWelcomeSeen } from '../lib/db/welcomeVideo';
import { useModal } from '../hooks/useModal';

export function WelcomeVideoModal() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: video } = useQuery({
    queryKey: ['welcome_video'],
    queryFn: getWelcomeVideo,
    enabled: !!user && user.role === 'client',
  });

  const { data: seen } = useQuery({
    queryKey: ['welcomed', user?.id],
    queryFn: () => hasSeenWelcome(user!.id),
    enabled: !!user && user.role === 'client',
  });

  useEffect(() => {
    if (!user || user.role !== 'client') return;
    if (!video?.storagePath || seen === undefined || seen) return;
    getWelcomeVideoSignedUrl(video.storagePath)
      .then(url => { setSignedUrl(url); setShow(true); })
      .catch(() => {/* silently skip */});
  }, [user, video?.storagePath, seen]);

  const dismiss = () => {
    setShow(false);
    if (videoRef.current) videoRef.current.pause();
    if (user) markWelcomeSeen(user.id).catch(() => {});
  };
  const modalRef = useModal(show, dismiss);

  return (
    <AnimatePresence>
      {show && signedUrl && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={dismiss}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome video"
          >
            <div ref={modalRef} className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={dismiss}
                className="absolute -top-10 right-0 text-white/60 hover:text-white inline-flex items-center gap-1.5 text-sm"
                aria-label="Close welcome video"
              >
                <X className="h-4 w-4" /> Close
              </button>
              <div className="rounded-2xl overflow-hidden border border-border-subtle bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  src={signedUrl}
                  controls
                  autoPlay
                  className="w-full aspect-video"
                />
              </div>
              <p className="text-center text-xs text-white/40 mt-3">You'll only see this once. Close anytime.</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
