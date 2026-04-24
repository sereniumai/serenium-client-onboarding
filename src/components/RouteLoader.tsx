import { Logo } from './Logo';

/**
 * Quiet route-transition fallback. Shown only during lazy-loaded chunk fetches,
 * which are typically <200ms — so intentionally low-key to avoid a flash of UI
 * that competes with the page about to render.
 */
export function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4 opacity-60">
        <Logo />
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-orange animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-orange animate-bounce" />
        </div>
      </div>
    </div>
  );
}
