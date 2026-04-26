import { useRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { env } from '../lib/env';

/**
 * Cloudflare Turnstile gate around the auth forms. Passes the verified
 * token to the parent via onToken; supabase-js then forwards it as
 * `captchaToken` to signInWithPassword / signUp / resetPasswordForEmail.
 *
 * If VITE_TURNSTILE_SITE_KEY isn't set (local dev, preview without env)
 * we render nothing and immediately resolve onToken('') so callers can
 * still proceed without the challenge.
 */
export function TurnstileGate({ onToken, theme = 'dark' }: {
  onToken: (token: string) => void;
  theme?: 'light' | 'dark' | 'auto';
}) {
  const ref = useRef<TurnstileInstance | null>(null);
  const siteKey = env.turnstileSiteKey;

  if (!siteKey) {
    // No-op for local dev / previews without the env var. We deliberately
    // hand back an empty string so the consuming form can still call its
    // onSubmit, knowing supabase will reject if Supabase Auth has captcha
    // required (it won't in dev because the secret isn't set there).
    if (typeof window !== 'undefined') {
      // Defer to next tick so we don't update parent state during render.
      queueMicrotask(() => onToken(''));
    }
    return null;
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={onToken}
      onExpire={() => onToken('')}
      onError={() => onToken('')}
      options={{
        theme,
        size: 'flexible',
        action: 'auth',
      }}
    />
  );
}
