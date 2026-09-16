"use client";

import { PolaroidFrame } from "@/components/PolaroidFrame";

export function TableLoading({
  message,
  testId,
}: {
  message: string;
  testId?: string;
}) {
  return (
    <main className="table-room" data-testid={testId}>
      <PolaroidFrame waiting caption="…" />
      <p className="note">{message}</p>
    </main>
  );
}
