"use client";

import { kitSrc } from "@/lib/kits";
import type { CSSProperties, ReactNode } from "react";

type PolaroidFrameProps = {
  src?: string | null;
  builtinId?: string | null;
  caption?: string;
  author?: string;
  flipped?: boolean;
  band?: ReactNode;
  print?: ReactNode;
  wide?: boolean;
};

export function PolaroidFrame({
  src,
  builtinId,
  caption,
  author,
  flipped = false,
  band,
  print,
  wide = false,
}: PolaroidFrameProps) {
  const image = src ?? (builtinId ? kitSrc(builtinId) : null);
  return (
    <div
      className={`polaroid-scene ${wide ? "polaroid-scene-wide" : ""}`}
      data-testid="polaroid"
      style={{ "--flip": flipped ? "180deg" : "0deg" } as CSSProperties}
    >
      <div className="polaroid">
        <div className="polaroid-face polaroid-front">
          <div className="polaroid-print">
            {print ??
              (image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" />
              ) : (
                <div className="polaroid-empty" />
              ))}
          </div>
          <div className="polaroid-band">
            {band ?? (
              <p className="polaroid-caption">{caption || "\u00a0"}</p>
            )}
          </div>
        </div>
        <div className="polaroid-face polaroid-back">
          <p className="polaroid-back-label">tirage</p>
          <p className="polaroid-author">{author ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
