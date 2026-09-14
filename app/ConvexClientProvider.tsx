"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!client) {
    return (
      <main className="table-room">
        <p className="note err" data-testid="error-banner">
          Configuration Convex manquante.
        </p>
      </main>
    );
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
