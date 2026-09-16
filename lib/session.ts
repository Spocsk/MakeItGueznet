"use client";

import { useSyncExternalStore } from "react";

const KEY = "gueznet-session";
const listeners = new Set<() => void>();
let cached: string | null = null;

function readId() {
  if (typeof window === "undefined") return null;
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot() {
  if (cached) return cached;
  cached = readId();
  return cached;
}

function getServerSnapshot() {
  return null;
}

export function useSessionId() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
