"use client";

export type ClientLog = {
  t: number;
  event: string;
  [key: string]: unknown;
};

const KEY = "gueznet-logs";

export function logEvent(event: string, data: Record<string, unknown> = {}) {
  const payload: ClientLog = { t: Date.now(), event, ...data };
  console.info("[gueznet]", payload);
  if (typeof window === "undefined") return payload;
  try {
    const prev = JSON.parse(sessionStorage.getItem(KEY) || "[]") as ClientLog[];
    prev.push(payload);
    sessionStorage.setItem(KEY, JSON.stringify(prev.slice(-100)));
  } catch {
    // ignore quota / private mode
  }
  return payload;
}

export function readLogs(): ClientLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]") as ClientLog[];
  } catch {
    return [];
  }
}
