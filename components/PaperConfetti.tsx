"use client";

import { useEffect, useState } from "react";

const COLORS = ["#c8f542", "#f5c518", "#e8edf2", "#9bc41f", "#2a3140"];

type PaperConfettiProps = {
  burst?: boolean;
  count?: number;
};

export function PaperConfetti({ burst = true, count = 16 }: PaperConfettiProps) {
  const [alive, setAlive] = useState(burst);

  useEffect(() => {
    if (!burst) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setAlive(false), reduced ? 0 : 1200);
    return () => window.clearTimeout(id);
  }, [burst]);

  if (!alive) return null;

  return (
    <div className="paper-confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="paper-bit"
          style={{
            left: `${6 + ((i * 17) % 88)}%`,
            animationDelay: `${(i % 7) * 40}ms`,
            background: COLORS[i % COLORS.length],
            transform: `rotate(${(i * 37) % 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}
