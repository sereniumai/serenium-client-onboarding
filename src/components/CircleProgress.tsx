import { motion } from 'framer-motion';

interface Props {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
}

export function CircleProgress({ value, size = 64, strokeWidth = 4, children, className }: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#FF6B1F" strokeWidth={strokeWidth} strokeLinecap="round" fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {children ?? `${Math.round(value)}%`}
      </div>
    </div>
  );
}
