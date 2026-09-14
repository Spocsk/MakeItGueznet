"use client";

import { useEffect, useState } from "react";

const KEY = "gueznet-session";

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    setSessionId(id);
  }, []);
  return sessionId;
}
