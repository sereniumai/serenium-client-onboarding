// Lightweight UI sound effects via the Web Audio API — no asset files needed.
// Toggleable per user via localStorage.

const KEY = 'serenium.sounds.enabled';

export function soundsEnabled(): boolean {
  return localStorage.getItem(KEY) !== 'false';
}

export function setSoundsEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? 'true' : 'false');
}

let ctx: AudioContext | null = null;
function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch { return null; }
  }
  return ctx;
}

function tone(freq: number, duration: number, volume = 0.08, type: OscillatorType = 'sine', delay = 0) {
  if (!soundsEnabled()) return;
  const c = context();
  if (!c) return;
  const now = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

export const sfx = {
  check()    { tone(880, 0.12, 0.05, 'sine'); },
  submit()   { tone(523.25, 0.1, 0.06, 'sine'); tone(783.99, 0.16, 0.06, 'sine', 0.07); },
  complete() { tone(523.25, 0.12, 0.08, 'sine'); tone(659.25, 0.12, 0.08, 'sine', 0.1); tone(783.99, 0.2, 0.08, 'sine', 0.2); },
  milestone(){ tone(440, 0.12, 0.06, 'sine'); tone(554.37, 0.2, 0.06, 'sine', 0.1); },
};
