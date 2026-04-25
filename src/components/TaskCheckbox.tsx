import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../lib/cn';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function TaskCheckbox({ checked, onChange, label, disabled }: Props) {
  const toggle = () => { if (!disabled) onChange(!checked); };

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle();
        }
      }}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border border-border-subtle hover:border-border-emphasis cursor-pointer transition-colors select-none',
        checked && 'bg-orange/5 border-orange/30',
        disabled && 'opacity-50 cursor-not-allowed hover:border-border-subtle',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
      )}
    >
      <div
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all',
          checked ? 'bg-orange border-orange' : 'bg-white/[0.04] border-white/55 group-hover:border-white/80'
        )}
        aria-hidden
      >
        {checked && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </motion.span>
        )}
      </div>
      <span className={cn('text-sm leading-relaxed', checked ? 'text-white/90' : 'text-white/80')}>{label}</span>
    </div>
  );
}
