import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getReportsVideo, hasSeenReportsVideo, markReportsVideoSeen } from '../lib/db/welcomeVideo';
import { videoEmbedUrl } from '../lib/videoEmbed';
import { useModal } from '../hooks/useModal';

/**
 * Mirrors WelcomeVideoModal but on its own URL slot + seen-state record so
 * live clients see a one-time "intro to your reports" video the first time
 * they hit the dashboard, plus a sidebar trigger to rewatch any time.
 */
export const REPORTS_VIDEO_EVENT = 'serenium:open-reports-video';

export function openReportsVideo() {
  window.dispatchEvent(new CustomEvent(REPORTS_VIDEO_EVENT));
}

export function ReportsVideoModal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const autoHandledRef = useRef(false);

  const { data: video } = useQuery({
    queryKey: ['reports_video'],
    queryFn: getReportsVideo,
    enabled: !!user && user.role === 'client',
  });

  const { data: seen } = useQuery({
    queryKey: ['reports_video_seen', user?.id],
    queryFn: () => hasSeenReportsVideo(user!.id),
    enabled: !!user && user.role === 'client',
  });

  const embed = useMemo(
    () => (video?.videoUrl ? videoEmbedUrl(video.videoUrl) : null),
    [video?.videoUrl],
  );

  useEffect(() => {
    if (autoHandledRef.current) return;
    if (!user || user.role !== 'client') return;
    if (!embed || seen === undefined || seen) return;
    autoHandledRef.current = true;
    setManuallyOpened(false);
    setShow(true);
  }, [user, embed, seen]);

  useEffect(() => {
    const handler = () => {
      if (!embed) return;
      setManuallyOpened(true);
      setShow(true);
    };
    window.addEventListener(REPORTS_VIDEO_EVENT, handler);
    return () => window.removeEventListener(REPORTS_VIDEO_EVENT, handler);
  }, [embed]);

  const dismiss = () => {
    setShow(false);
    if (!manuallyOpened && user) {
      qc.setQueryData(['reports_video_seen', user.id], true);
      markReportsVideoSeen(user.id).catch(() => {});
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
            aria-label="Reports dashboard video"
          >
            <div ref={modalRef} className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
              <div className="absolute inset-x-12 -bottom-8 h-32 bg-orange/20 blur-3xl rounded-full pointer-events-none" aria-hidden />
              <div className="relative rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/[0.08] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange/50 to-transparent" />
                <div className="relative flex items-start justify-between gap-4 px-7 md:px-9 pt-7 pb-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] font-semibold text-orange/90 mb-2.5">A quick guide</p>
                    <h2 className="font-display font-black text-2xl md:text-[28px] tracking-[-0.025em] leading-[1.1]">
                      Your reports dashboard
                    </h2>
                    <p className="text-[13px] text-white/50 mt-2 max-w-md leading-relaxed">
                      How to read your monthly reports and get the most out of what we send you.
                    </p>
                  </div>
                  <button
                    onClick={dismiss}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Close reports video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative px-5 md:px-7">
                  <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black">
                    <iframe
                      src={embed}
                      className="w-full aspect-video"
                      title="Reports dashboard"
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
