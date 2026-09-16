"use client";

import { DropZone } from "@/components/DropZone";
import { PolaroidMedia } from "@/components/PolaroidMedia";
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

  async function addFiles(files: FileList | null) {
    const list = files ? Array.from(files) : [];
    if (!list.length || !sessionId) return;
    setBusy(true);
    setError(null);
    try {
      await ensure({ sessionId, name: "toi" });
      for (const file of list) {
        const uploaded = await upload(sessionId, file);
        await save({
          sessionId,
          storageId: uploaded.storageId,
          kind: uploaded.kind,
          title: file.name,
          ...(uploaded.thumbStorageId
            ? { thumbStorageId: uploaded.thumbStorageId }
            : {}),
        });
        logEvent("library.save", { title: file.name, kind: uploaded.kind });
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
        <Link href="/" className="live-tick">
          Live
        </Link>
        <span>Bibliothèque</span>
      </nav>
      <div className="table-copy">
        <h1>Tes fichiers</h1>
        <p>
          Images et GIF, sur cet appareil. Tu les envoies ensuite dans une
          salle.
        </p>
      </div>
      <DropZone
        testId="library-upload"
        disabled={busy}
        onFiles={(files) => void addFiles(files)}
        label="Dépose un fichier"
        hint="Image ou GIF, il reste sur cet appareil"
      />
      {error ? (
        <p className="note err" data-testid="error-banner">
          {error}
        </p>
      ) : null}
      <ul className="library-grid" data-testid="library-list">
        {items?.map((item) => (
          <li key={item._id} data-testid="library-item" className="library-card">
            <div className="polaroid-print">
              <PolaroidMedia
                src={item.url}
                thumbSrc={item.thumbUrl}
                kind={item.kind}
                variant="thumb"
                alt=""
              />
            </div>
            <p>{item.title ?? item.kind}</p>
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
