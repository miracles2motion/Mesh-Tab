import confetti from "canvas-confetti";

export function fireSettlementConfetti() {
  if (typeof window === "undefined") return;

  // Monad purple, vibrant emerald, luxury gold
  const colors = ["#836EF9", "#10B981", "#F59E0B", "#6366F1", "#3B82F6"];

  // Left cannon
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.7 },
    colors
  });

  // Right cannon
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.7 },
    colors
  });

  // Central starburst
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { y: 0.6 },
      colors
    });
  }, 180);
}

export function fireFaucetConfetti() {
  if (typeof window === "undefined") return;

  const colors = ["#10B981", "#34D399", "#F59E0B", "#FCD34D"];

  confetti({
    particleCount: 40,
    spread: 70,
    origin: { y: 0.4 },
    colors,
    gravity: 1.2,
    scalar: 1.1
  });
}
