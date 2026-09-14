"use client";

import { PolaroidFrame } from "@/components/PolaroidFrame";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errorMessage";
import { logEvent } from "@/lib/log";
import { useSessionId } from "@/lib/session";
import { useMutation } from "convex/react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function Home() {
  const sessionId = useSessionId();
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
      window.location.assign(`/salle/${room.code}`);
    } catch (err) {
      setError(errorMessage(err, "Impossible de créer."));
    } finally {
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
      window.location.assign(`/salle/${room.code}`);
    } catch (err) {
      setError(errorMessage(err, "Impossible de rejoindre."));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) await joinRoom();
    else await createRoom();
  }

  return (
    <main className="table-room" data-testid="home-root">
      <nav className="nav-mini">
        <span>MakeItGueznet</span>
        <Link href="/bibliotheque">Bibliothèque</Link>
      </nav>
      <div className="table-copy">
        <h1>Pose tes fichiers sur la table.</h1>
        <p>
          Une Polaroid chacun, une légende, des gommettes. Pas leurs kits : les
          tiens.
        </p>
      </div>
      <form onSubmit={onSubmit} data-testid="home-form">
        <PolaroidFrame
          band={
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
          }
        />
        <div className="actions">
          <input
            className="field"
            style={{
              color: "var(--paper)",
              borderBottomColor:
                "color-mix(in srgb, var(--paper) 35%, transparent)",
            }}
            name="code"
            data-testid="home-code"
            placeholder="code (si tu rejoins)"
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
            {code.trim() ? "Rejoindre" : "Entrer"}
          </button>
          {code.trim() ? null : (
            <button
              className="btn-ghost"
              type="button"
              data-testid="home-create"
              disabled={busy || !sessionId}
              onClick={() => void createRoom()}
            >
              Nouvelle salle
            </button>
          )}
        </div>
        {error ? (
          <p className="note err" data-testid="error-banner">
            {error}
          </p>
        ) : null}
        <p className="note">
          Tes images et GIF restent les tiens. Tu es responsable de ce que tu
          déposes.
        </p>
      </form>
    </main>
  );
}
