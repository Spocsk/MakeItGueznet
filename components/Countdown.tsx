"use client";

import { remainingSeconds } from "@/convex/gameLogic";
import { useEffect, useRef, useState } from "react";

export function Countdown({
  endsAt,
  testId,
  onDue,
}: {
  endsAt?: number | null;
  testId: string;
  onDue?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (endsAt == null) return;
    if (now < endsAt) return;
    if (firedFor.current === endsAt) return;
    firedFor.current = endsAt;
    onDue?.();
  }, [endsAt, now, onDue]);

  if (endsAt == null) return null;
  return (
    <p className="timer" data-testid={testId}>
      {remainingSeconds(endsAt, now)}s
    </p>
  );
}
