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
  // or "manual rewatch" (don't touch seen-state - they've already seen it).
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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={dismiss}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome video"
          >
            <div ref={modalRef} className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
              {/* Ambient glow behind, not around */}
              <div className="absolute inset-x-12 -bottom-8 h-32 bg-orange/20 blur-3xl rounded-full pointer-events-none" aria-hidden />

              <div className="relative rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/[0.08] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
                {/* Hairline top accent */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange/50 to-transparent" />

                {/* Header */}
                <div className="relative flex items-start justify-between gap-4 px-7 md:px-9 pt-7 pb-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] font-semibold text-orange/90 mb-2.5">A note from the founder</p>
                    <h2 className="font-display font-black text-2xl md:text-[28px] tracking-[-0.025em] leading-[1.1]">
                      Welcome to Serenium
                    </h2>
                    <p className="text-[13px] text-white/50 mt-2 max-w-md leading-relaxed">
                      90 seconds on what's inside and how to get the most out of your portal.
                    </p>
                  </div>
                  <button
                    onClick={dismiss}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Close welcome video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Video, framed in same dark with thin separator above */}
                <div className="relative px-5 md:px-7">
                  <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black">
                    <iframe
                      src={embed}
                      className="w-full aspect-video"
                      title="Welcome"
                      allow="fullscreen; clipboard-write; autoplay"
                      allowFullScreen
                    />
                  </div>
                </div>

                {!manuallyOpened && (
                  <div className="relative px-7 md:px-9 pt-5 pb-6">
                    <p className="text-[11px] text-white/40 text-center sm:text-right">
                      You'll only see this on first sign-in. Rewatch anytime from the sidebar.
                    </p>
                  </div>
                )}
                {manuallyOpened && <div className="pb-6" />}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
