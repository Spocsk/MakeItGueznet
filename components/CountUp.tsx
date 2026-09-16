"use client";

import { useEffect, useState } from "react";

export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 520;
    let frame = 0;
    const tick = (time: number) => {
      if (start == null) start = time;
      const progress =
        duration === 0 ? 1 : Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="score-pop">{shown}</span>;
}
