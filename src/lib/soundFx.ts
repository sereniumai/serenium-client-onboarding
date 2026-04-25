// Lightweight UI sound effects via the Web Audio API, no asset files needed.
// Toggleable per user via localStorage.

const KEY = 'serenium.sounds.enabled';

export function soundsEnabled(): boolean {
  return localStorage.getItem(KEY) !== 'false';
}

export function setSoundsEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? 'true' : 'false');
}

// Sounds disabled across the portal. Keeping the no-op interface so existing
// call sites stay compiling without churn; remove when next refactoring pass.
export const sfx = {
  check()    { /* sounds removed */ },
  submit()   { /* sounds removed */ },
  complete() { /* sounds removed */ },
  milestone(){ /* sounds removed */ },
};
