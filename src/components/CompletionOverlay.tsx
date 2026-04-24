import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { fireCompletionConfetti } from '../lib/confetti';
import { useModal } from '../hooks/useModal';

interface Props {
  show: boolean;
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function CompletionOverlay({ show, title, subtitle, primaryLabel, onPrimary, secondaryLabel, onSecondary }: Props) {
  useEffect(() => {
    if (show) fireCompletionConfetti();
  }, [show]);
  const modalRef = useModal(show, onPrimary);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-bg/80 backdrop-blur-md flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.92, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-md text-center card p-10 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
            <div className="relative">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="h-20 w-20 rounded-full bg-orange mx-auto flex items-center justify-center mb-6 shadow-orange-glow"
              >
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </motion.div>
              <h2 id="completion-title" className="font-display font-black text-3xl tracking-[-0.025em] mb-2">{title}</h2>
              <p className="text-white/60 mb-8">{subtitle}</p>
              <div className="flex flex-col gap-2">
                <button onClick={onPrimary} className="btn-primary">
                  {primaryLabel} <ArrowRight className="h-4 w-4" />
                </button>
                {secondaryLabel && onSecondary && (
                  <button onClick={onSecondary} className="text-sm text-white/60 hover:text-white py-2">
                    {secondaryLabel}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
