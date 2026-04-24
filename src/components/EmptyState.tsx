import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card text-center py-14 md:py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-6 -translate-x-1/2 h-32 w-32 rounded-full bg-orange/10 blur-3xl" />
      </div>
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-orange/10 border border-orange/20 flex items-center justify-center mx-auto mb-5">
          <Icon className="h-8 w-8 text-orange" strokeWidth={1.8} />
        </div>
        <h3 className="font-display font-bold text-xl mb-2">{title}</h3>
        {description && <p className="text-white/55 text-sm max-w-md mx-auto mb-6 leading-relaxed">{description}</p>}
        {action && <div className="flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-shimmer ${className}`}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

export function ClientRowSkeleton() {
  return (
    <tr className="border-b border-border-subtle">
      <td className="px-6 py-4"><Shimmer className="h-4 w-32" /></td>
      <td className="px-6 py-4"><Shimmer className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Shimmer className="h-6 w-16 rounded-full" /></td>
      <td className="px-6 py-4"><Shimmer className="h-4 w-32" /></td>
      <td className="px-6 py-4"></td>
    </tr>
  );
}
