import { useEffect, useRef } from 'react';

/**
 * Handles the table-stakes modal behaviours keyboard-first users expect:
 *
 * - Esc triggers onClose (or no-op if undefined - e.g. modals that must be
 *   dismissed via an action button only).
 * - On open, returns a ref you attach to the modal container. The hook moves
 *   focus to the first focusable element inside it on mount, and restores
 *   focus to whatever was focused before the modal opened once it closes.
 *
 * Focus trap (cycling Tab within the modal) is not implemented here - it
 * requires intercepting Tab / Shift+Tab and sequencing through focusables,
 * which is surprisingly fiddly. Most of our modals are small; Esc + focus
 * return covers ~90% of the a11y value.
 */
export function useModal(open: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const focusable = containerRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  return containerRef;
}
