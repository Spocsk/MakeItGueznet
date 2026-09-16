"use client";

import { PolaroidMedia } from "@/components/PolaroidMedia";
import { useEffect, useRef, useState, type ReactNode } from "react";

type LazyThumbProps = {
  src?: string | null;
  thumbSrc?: string | null;
  kind?: string | null;
  label?: ReactNode;
  testId?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function LazyThumb({
  src,
  thumbSrc,
  kind,
  label,
  testId,
  onClick,
  disabled,
}: LazyThumbProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const poster = thumbSrc ?? src;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className="thumb"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
    >
      {visible ? (
        <PolaroidMedia
          src={src}
          thumbSrc={poster}
          kind={kind}
          variant="thumb"
          lazy
        />
      ) : (
        <div className="polaroid-empty" aria-hidden="true" />
      )}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
