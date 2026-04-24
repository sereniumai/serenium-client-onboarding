import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getWelcomeVideo, hasSeenWelcome, markWelcomeSeen } from '../lib/db/welcomeVideo';
import { videoEmbedUrl } from '../lib/videoEmbed';
import { useModal } from '../hooks/useModal';

/**
 * Event name the sidebar (or any other trigger) dispatches to re-open the
 * welcome video on demand. Keeps the modal globally-mounted and avoids a
 * full context/provider for a single trigger.
 */
export const WELCOME_VIDEO_EVENT = 'serenium:open-welcome-video';

/** Call this from anywhere to open the welcome video modal. */
export function openWelcomeVideo() {
  window.dispatchEvent(new CustomEvent(WELCOME_VIDEO_EVENT));
}

export function WelcomeVideoModal() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  // Track whether this open is "first login" (should mark seen on dismiss)
  // or "manual rewatch" (don't touch seen-state — they've already seen it).
  const [manuallyOpened, setManuallyOpened] = useState(false);

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

  const embed = useMemo(
    () => (video?.videoUrl ? videoEmbedUrl(video.videoUrl) : null),
    [video?.videoUrl],
  );

  // Auto-open on first login: client role + video exists + not yet seen.
  useEffect(() => {
    if (!user || user.role !== 'client') return;
    if (!embed || seen === undefined || seen) return;
    setManuallyOpened(false);
    setShow(true);
  }, [user, embed, seen]);

  // Manual open via sidebar / event dispatch. Always shows regardless of
  // seen-state. Doesn't re-mark as unseen; doesn't re-mark as seen either.
  useEffect(() => {
    const handler = () => {
      if (!embed) return;
      setManuallyOpened(true);
      setShow(true);
    };
    window.addEventListener(WELCOME_VIDEO_EVENT, handler);
    return () => window.removeEventListener(WELCOME_VIDEO_EVENT, handler);
  }, [embed]);

  const dismiss = () => {
    setShow(false);
    // Only mark seen on the first-login auto-open path. Manual rewatches
    // shouldn't change persisted state.
    if (!manuallyOpened && user) {
      markWelcomeSeen(user.id).catch(() => {});
    }
  };
  const modalRef = useModal(show, dismiss);

  return (
    <AnimatePresence>
      {show && embed && (
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
                <iframe
                  src={embed}
                  className="w-full aspect-video"
                  title="Welcome"
                  allow="fullscreen; clipboard-write; autoplay"
                  allowFullScreen
                />
              </div>
              {!manuallyOpened && (
                <p className="text-center text-xs text-white/55 mt-3">You'll only see this once. Close anytime.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
