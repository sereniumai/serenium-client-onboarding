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
  return (
    <label className={cn(
      'group flex items-start gap-3 p-3 rounded-lg border border-border-subtle hover:border-border-emphasis cursor-pointer transition-colors',
      checked && 'bg-orange/5 border-orange/30',
      disabled && 'opacity-50 cursor-not-allowed'
    )}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all',
          checked ? 'bg-orange border-orange' : 'border-white/30 group-hover:border-white/50'
        )}
      >
        {checked && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </motion.span>
        )}
      </button>
      <span className={cn('text-sm leading-relaxed', checked ? 'text-white/90' : 'text-white/80')}>{label}</span>
    </label>
  );
}
