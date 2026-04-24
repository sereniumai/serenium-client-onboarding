import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { HeroGlow } from './HeroGlow';

interface Props {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'narrow' | 'wide';
}

export function AuthLayout({ eyebrow, title, subtitle, children, footer, width = 'narrow' }: Props) {
  const widthClass = width === 'wide' ? 'max-w-3xl' : 'max-w-md';
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroGlow />
      <div className="relative flex min-h-screen flex-col">
        <header className="px-6 py-8 md:px-12">
          <Logo />
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className={`w-full ${widthClass}`}>
            {eyebrow && <p className="eyebrow text-center mb-4">{eyebrow}</p>}
            <h1 className="text-center font-display font-black text-4xl md:text-5xl leading-[1.05] tracking-[-0.03em] mb-3">
              {title}
            </h1>
            {subtitle && <p className="text-center text-white/60 mb-10">{subtitle}</p>}

            <div className="card p-8">
              {children}
            </div>

            {footer && <div className="text-center mt-6 text-sm text-white/50">{footer}</div>}
          </div>
        </main>

        <footer className="px-6 py-8 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Serenium AI · Client Portal
        </footer>
      </div>
    </div>
  );
}
