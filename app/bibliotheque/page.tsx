"use client";

import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errorMessage";
import { logEvent } from "@/lib/log";
import { useSessionId } from "@/lib/session";
import { useUploader } from "@/lib/upload";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

export default function LibraryPage() {
  const sessionId = useSessionId();
  const ensure = useMutation(api.profiles.ensure);
  const save = useMutation(api.library.save);
  const remove = useMutation(api.library.remove);
  const items = useQuery(api.library.list, sessionId ? { sessionId } : "skip");
  const upload = useUploader();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || !sessionId) return;
    setBusy(true);
    setError(null);
    try {
      await ensure({ sessionId, name: "toi" });
      for (const file of Array.from(files)) {
        const { storageId, kind } = await upload(sessionId, file);
        await save({ sessionId, storageId, kind, title: file.name });
        logEvent("library.save", { title: file.name, kind });
      }
    } catch (err) {
      setError(errorMessage(err, "Envoi impossible."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="table-room" data-testid="library-root">
      <nav className="nav-mini">
        <Link href="/">Table</Link>
        <span>Bibliothèque</span>
      </nav>
      <div className="table-copy">
        <h1>Tes tirages</h1>
        <p>
          Images et GIF, sur cet appareil. Tu les poses ensuite dans une salle.
        </p>
      </div>
      <label className="drop">
        Dépose ici
        <input
          data-testid="library-upload"
          type="file"
          accept="image/*,image/gif"
          multiple
          disabled={!sessionId || busy}
          onChange={(e) => void onFiles(e.target.files)}
        />
      </label>
      {error ? (
        <p className="note err" data-testid="error-banner">
          {error}
        </p>
      ) : null}
      <ul className="lobby-list" data-testid="library-list">
        {items?.map((item) => (
          <li key={item._id} data-testid="library-item">
            {item.title ?? item.kind}
            <button
              className="btn-ghost"
              type="button"
              data-testid="library-remove"
              onClick={() => {
                if (!sessionId) return;
                logEvent("library.remove", { title: item.title });
                void remove({ sessionId, mediaId: item._id });
              }}
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
      {items && items.length === 0 ? (
        <p className="note" data-testid="library-empty">
          Encore vide — un fichier et ça devient un kit.
        </p>
      ) : null}
    </main>
  );
}
