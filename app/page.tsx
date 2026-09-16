"use client";

import { PolaroidFrame } from "@/components/PolaroidFrame";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errorMessage";
import { logEvent } from "@/lib/log";
import { useSessionId } from "@/lib/session";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Home() {
  const sessionId = useSessionId();
  const router = useRouter();
  const create = useMutation(api.rooms.create);
  const join = useMutation(api.rooms.join);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom() {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const room = await create({ sessionId, name });
      logEvent("room.create", { code: room.code });
      router.push(`/salle/${room.code}`);
    } catch (err) {
      setError(errorMessage(err, "Impossible de créer."));
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const room = await join({ sessionId, name, code });
      logEvent("room.join", { code: room.code });
      router.push(`/salle/${room.code}`);
    } catch (err) {
      setError(errorMessage(err, "Impossible de rejoindre."));
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Entre un code de salle.");
      return;
    }
    await joinRoom();
  }

  return (
    <main className="table-room" data-testid="home-root">
      <nav className="nav-mini">
        <span className="live-tick">Live</span>
      </nav>
      <div className="home-hero">
        <div className="table-copy">
          <h1>MakeItGueznet</h1>
        </div>
        <PolaroidFrame waiting={busy} caption="NOW PLAYING" />
        <form onSubmit={onSubmit} data-testid="home-form">
          <input
            className="field"
            name="name"
            data-testid="home-name"
            autoComplete="nickname"
            placeholder="ton prénom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={24}
          />
          <div className="actions">
            <input
              className="field field-on-table"
              name="code"
              data-testid="home-code"
              placeholder="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              aria-label="Code de salle"
            />
          </div>
          <div className="actions">
            <button
              className="btn"
              type="submit"
              data-testid="home-submit"
              disabled={busy || !sessionId}
            >
              Live
            </button>
          </div>
          {error ? (
            <p className="note err" data-testid="error-banner">
              {error}
            </p>
          ) : null}
        </form>
      </div>
      <div className="home-secondary">
        <button
          className="btn-ghost"
          type="button"
          data-testid="home-create"
          disabled={busy || !sessionId}
          onClick={() => void createRoom()}
        >
          Nouvelle salle
        </button>
        <Link href="/bibliotheque">Bibliothèque</Link>
        <p className="note">
          Tes images et GIF restent les tiens. Tu es responsable de ce que tu
          déposes.
        </p>
      </div>
    </main>
  );
}
