import confetti from 'canvas-confetti';

export function fireCompletionConfetti() {
  const defaults = {
    startVelocity: 32,
    spread: 360,
    ticks: 90,
    zIndex: 9999,
    colors: ['#FF6B1F', '#FF7A35', '#FFD4BA', '#ffffff'],
  };

  confetti({
    ...defaults,
    particleCount: 80,
    origin: { x: 0.5, y: 0.55 },
    scalar: 1.1,
  });

  setTimeout(() => {
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.2, y: 0.65 } });
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.8, y: 0.65 } });
  }, 180);
}
