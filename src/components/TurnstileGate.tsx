import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { env } from '../lib/env';

/**
 * Cloudflare Turnstile gate around the auth forms. Passes the verified
 * token to the parent via onToken; supabase-js then forwards it as
 * `captchaToken` to signInWithPassword / signUp / resetPasswordForEmail.
 *
 * Tokens are single-use and expire ~5 min after issue. To stop the
 * "timeout-or-duplicate" rejection that hits users who:
 *   - linger on the form longer than the token lifetime, or
 *   - retry after a failed attempt that already consumed the token,
 * we tell Turnstile to auto-refresh on both expiry and timeout, and
 * expose a `reset()` via ref so callers can force a fresh challenge
 * after their submit fails for any reason.
 *
 * If VITE_TURNSTILE_SITE_KEY isn't set (local dev, preview without env)
 * we render nothing and immediately resolve onToken('') so callers can
 * still proceed without the challenge.
 */
export type TurnstileGateHandle = {
  reset: () => void;
};

export const TurnstileGate = forwardRef<TurnstileGateHandle, {
  onToken: (token: string) => void;
  theme?: 'light' | 'dark' | 'auto';
}>(function TurnstileGate({ onToken, theme = 'dark' }, ref) {
  const widgetRef = useRef<TurnstileInstance | null>(null);
  const siteKey = env.turnstileSiteKey;

  useImperativeHandle(ref, () => ({
    reset: () => {
      onToken('');
      widgetRef.current?.reset();
    },
  }), [onToken]);

  if (!siteKey) {
    if (typeof window !== 'undefined') {
      queueMicrotask(() => onToken(''));
    }
    return null;
  }

  return (
    <Turnstile
      ref={widgetRef}
      siteKey={siteKey}
      onSuccess={onToken}
      onExpire={() => onToken('')}
      onError={() => onToken('')}
      options={{
        theme,
        size: 'flexible',
        action: 'auth',
        refreshExpired: 'auto',
        refreshTimeout: 'auto',
      }}
    />
  );
});
