import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useModal } from '../hooks/useModal';

interface Props {
  show: boolean;
  businessName: string;
  firstName: string;
  onContinue: () => void;
}

function fireBigCelebration() {
  const duration = 2400;
  const end = Date.now() + duration;
  const colors = ['#FF6B1F', '#FF7A35', '#FFD4BA', '#ffffff'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60, spread: 55, origin: { x: 0, y: 0.7 },
      colors, zIndex: 10000,
    });
    confetti({
      particleCount: 3,
      angle: 120, spread: 55, origin: { x: 1, y: 0.7 },
      colors, zIndex: 10000,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());

  confetti({
    particleCount: 120, spread: 120, startVelocity: 45,
    origin: { x: 0.5, y: 0.6 }, colors, zIndex: 10000, scalar: 1.2,
  });
}

export function FinalCelebration({ show, businessName, firstName, onContinue }: Props) {
  useEffect(() => { if (show) fireBigCelebration(); }, [show]);
  const modalRef = useModal(show, onContinue);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-bg/90 backdrop-blur-md flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="final-celebration-title"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            className="w-full max-w-xl text-center card p-10 md:p-14 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
            <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-orange/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-orange/10 blur-3xl pointer-events-none" />

            <div className="relative">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.2 }}
                className="h-24 w-24 rounded-3xl bg-orange mx-auto flex items-center justify-center mb-6 shadow-orange-glow"
              >
                <Rocket className="h-12 w-12 text-white" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="eyebrow flex items-center justify-center gap-1.5 mb-3"
              >
                <Sparkles className="h-3 w-3" /> Onboarding complete
              </motion.p>

              <motion.h2
                id="final-celebration-title"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="font-display font-black text-4xl md:text-5xl tracking-[-0.03em] mb-4 leading-[1.02]"
              >
                Nice work, <span className="text-orange">{firstName}</span>.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="text-white/70 text-lg mb-2"
              >
                {businessName} is live.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="text-white/50 text-sm max-w-md mx-auto mb-8"
              >
                We've got everything we need. From here you'll get a monthly report walking you through performance, wins, and what's next, check back at the end of the month.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                onClick={onContinue}
                className="btn-primary"
              >
                View your dashboard <ArrowRight className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
