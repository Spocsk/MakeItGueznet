"use client";

import { kitSrc } from "@/lib/kits";
import type { ReactNode } from "react";
import { PolaroidMedia } from "./PolaroidMedia";

type PolaroidFrameProps = {
  src?: string | null;
  thumbSrc?: string | null;
  builtinId?: string | null;
  kind?: string | null;
  caption?: string;
  author?: string;
  flipped?: boolean;
  band?: ReactNode;
  print?: ReactNode;
  wide?: boolean;
  variant?: "hero" | "thumb";
  alt?: string;
  waiting?: boolean;
  stamped?: boolean;
  enter?: boolean;
};

export function PolaroidFrame({
  src,
  thumbSrc,
  builtinId,
  kind,
  caption,
  author,
  flipped = false,
  band,
  print,
  wide = false,
  variant = "hero",
  alt,
  waiting = false,
  stamped = false,
  enter = false,
}: PolaroidFrameProps) {
  const image = src ?? (builtinId ? kitSrc(builtinId) : null);
  const poster = thumbSrc ?? (builtinId ? kitSrc(builtinId) : null);
  return (
    <div
      className={`polaroid-scene ${wide ? "polaroid-scene-wide" : ""} ${enter ? "polaroid-enter" : ""} ${flipped ? "is-frozen" : ""}`}
      data-testid="polaroid"
    >
      <div className={`polaroid ${stamped ? "is-stamped" : ""}`}>
        <div className="polaroid-face polaroid-front">
          {stamped ? <span className="polaroid-stamp">ENVOYÉ</span> : null}
          <div className="polaroid-print">
            {print ?? (
              <PolaroidMedia
                src={image}
                thumbSrc={poster}
                kind={builtinId ? "image" : kind}
                variant={variant}
                alt={alt ?? ""}
                waiting={waiting}
              />
            )}
            <div className="polaroid-band">
              {band ?? (
                <p className="polaroid-caption">{caption || "\u00a0"}</p>
              )}
            </div>
            {flipped ? (
              <p className="polaroid-author" aria-live="polite">
                {author ?? "—"}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
