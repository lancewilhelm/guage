import confetti from "canvas-confetti";

// --- Burst Confetti ---
function fire(particleRatio: number, opts: confetti.Options) {
  const count = 200;
  const defaults = {
    angle: 270,
    origin: { y: -0.1 },
    ticks: 200,
  };
  confetti({
    ...defaults,
    ...opts,
    particleCount: Math.floor(count * particleRatio),
  });
}

export function fireConfetti() {
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

// --- Continuous Snow Confetti ---
let snowIsOn = false;
let snowAnimationRunning = false;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function startSnow(): void {
  if (snowAnimationRunning) return; // Prevent multiple loops
  snowIsOn = true;
  snowAnimationRunning = true;

  const duration = 15 * 1000;
  let animationEnd = Date.now() + duration;
  let skew = 1;

  function frame() {
    if (!snowIsOn) {
      snowAnimationRunning = false;
      return;
    }
    const timeLeft = animationEnd - Date.now();
    const ticks = Math.max(200, 500 * (timeLeft / duration));
    skew = Math.max(0.8, skew - 0.001);

    confetti({
      particleCount: 1,
      startVelocity: 0,
      ticks,
      origin: {
        x: Math.random(),
        y: Math.random() * skew - 0.2,
      },
      colors: ["#ffffff"],
      shapes: ["circle"],
      gravity: randomInRange(0.4, 0.6),
      scalar: randomInRange(0.4, 1),
      drift: randomInRange(-0.4, 0.4),
    });

    if (timeLeft > 0) {
      requestAnimationFrame(frame);
    } else if (snowIsOn) {
      animationEnd = Date.now() + duration;
      skew = 1;
      requestAnimationFrame(frame);
    } else {
      snowAnimationRunning = false;
    }
  }

  frame();
}

export function stopSnow(): void {
  snowIsOn = false;
}
