"use client";

import { isVideoSource } from "@/lib/poster";
import { useEffect, useRef, useState } from "react";

type PolaroidMediaProps = {
  src?: string | null;
  thumbSrc?: string | null;
  kind?: string | null;
  variant?: "thumb" | "hero";
  alt?: string;
  lazy?: boolean;
  waiting?: boolean;
  onReady?: () => void;
};

function PolaroidImage({
  src,
  alt,
  variant,
  lazy,
  onReady,
}: {
  src: string;
  alt: string;
  variant: "thumb" | "hero";
  lazy: boolean;
  onReady?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const fired = useRef(false);

  function markReady() {
    if (fired.current) return;
    fired.current = true;
    setReady(true);
    onReady?.();
  }

  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) markReady();
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={variant === "thumb" ? 72 : 640}
      height={variant === "thumb" ? 72 : 640}
      loading={lazy || variant === "thumb" ? "lazy" : "eager"}
      decoding="async"
      referrerPolicy="no-referrer"
      fetchPriority={variant === "hero" && !lazy ? "high" : "low"}
      className={ready ? "is-ready" : ""}
      onLoad={markReady}
      onError={markReady}
    />
  );
}

function PolaroidVideo({
  src,
  onReady,
}: {
  src: string;
  onReady?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const fired = useRef(false);

  function markReady() {
    if (fired.current) return;
    fired.current = true;
    setReady(true);
    onReady?.();
  }

  return (
    <video
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      referrerPolicy="no-referrer"
      className={ready ? "is-ready" : ""}
      onLoadedData={markReady}
      onCanPlay={markReady}
      onError={markReady}
    />
  );
}

export function PolaroidMedia({
  src,
  thumbSrc,
  variant = "hero",
  alt = "",
  lazy = false,
  waiting = false,
  onReady,
}: PolaroidMediaProps) {
  const display =
    variant === "thumb" ? (thumbSrc ?? src) : (src ?? thumbSrc);

  if (!display) {
    return (
      <div
        className={`polaroid-empty ${waiting ? "is-waiting" : ""}`}
        aria-hidden="true"
      />
    );
  }

  if (isVideoSource(display)) {
    return <PolaroidVideo key={display} src={display} onReady={onReady} />;
  }

  return (
    <PolaroidImage
      key={display}
      src={display}
      alt={alt}
      variant={variant}
      lazy={lazy}
      onReady={onReady}
    />
  );
}
