"use client";

import { PolaroidFrame } from "@/components/PolaroidFrame";
import { StarStickers } from "@/components/StarStickers";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errorMessage";
import { KITS } from "@/lib/kits";
import { logEvent } from "@/lib/log";
import { useSessionId } from "@/lib/session";
import { useUploader } from "@/lib/upload";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type LobbyState = {
  isHost: boolean;
  room: { hostSessionId: string };
  players: { _id: string; name: string; sessionId: string }[];
  pool: { builtinId?: string; url?: string | null }[];
};

export default function SallePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return <GameTable code={code.toUpperCase()} />;
}

function GameTable({ code }: { code: string }) {
  const sessionId = useSessionId();
  const state = useQuery(
    api.rooms.getByCode,
    sessionId ? { code, sessionId } : "skip",
  );
  const phase = state?.room.phase;

  if (!sessionId) {
    return (
      <main className="table-room" data-testid="phase-loading">
        <p className="note">Ouverture de la table…</p>
      </main>
    );
  }

  if (state === undefined) {
    return (
      <main className="table-room" data-testid="phase-loading">
        <p className="note">On cherche la salle {code}…</p>
      </main>
    );
  }

  if (state === null) {
    return (
      <main className="table-room" data-testid="phase-missing">
        <div className="table-copy">
          <h1>Salle introuvable</h1>
          <p>Mauvais code, ou tu n’y es pas encore.</p>
        </div>
        <Link className="btn" href="/">
          Retour
        </Link>
      </main>
    );
  }

  return (
    <main className="table-room" data-testid={`phase-${phase}`}>
      <nav className="nav-mini">
        <Link href="/">Table</Link>
        <span data-testid="room-code">{code}</span>
        <Link href="/bibliotheque">Bibliothèque</Link>
      </nav>
      {phase === "lobby" ? (
        <Lobby code={code} sessionId={sessionId} state={state} />
      ) : null}
      {phase === "caption" ? (
        <Caption code={code} sessionId={sessionId} />
      ) : null}
      {phase === "vote" ? <Vote code={code} sessionId={sessionId} /> : null}
      {phase === "score" ? (
        <Score code={code} sessionId={sessionId} isHost={state.isHost} />
      ) : null}
    </main>
  );
}

function Lobby({
  code,
  sessionId,
  state,
}: {
  code: string;
  sessionId: string;
  state: LobbyState;
}) {
  const start = useMutation(api.rooms.startRound);
  const addBuiltin = useMutation(api.rooms.addBuiltin);
  const addFromLibrary = useMutation(api.rooms.addFromLibrary);
  const dropFile = useMutation(api.rooms.dropFile);
  const library = useQuery(api.library.list, { sessionId });
  const upload = useUploader();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function launch() {
    setBusy(true);
    setError(null);
    try {
      await start({ sessionId, code });
      logEvent("round.start", { code });
    } catch (err) {
      setError(errorMessage(err, "Impossible de lancer."));
    } finally {
      setBusy(false);
    }
  }

  async function onDrop(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const { storageId, kind } = await upload(sessionId, file);
        await dropFile({ sessionId, code, storageId, kind });
      }
      logEvent("pool.drop", { code, n: files.length });
    } catch (err) {
      setError(errorMessage(err, "Dépôt impossible."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="table-copy">
        <h1>Salle {code}</h1>
        <p>
          {state.isHost
            ? "Quand le pool est prêt, lance la manche."
            : "En attente de l’hôte. Tu peux déjà poser des fichiers."}
        </p>
      </div>
      <PolaroidFrame
        builtinId={state.pool[0]?.builtinId}
        src={state.pool[0]?.url}
        caption={`${state.players.length} autour de la table`}
      />
      <ul className="lobby-list" data-testid="player-list">
        {state.players.map((p) => (
          <li key={p._id} data-testid={`player-${p.name}`}>
            {p.name}
            {p.sessionId === state.room.hostSessionId ? " · hôte" : ""}
          </li>
        ))}
      </ul>
      <div className="kit-row" data-testid="kit-row">
        {KITS.map((kit) => (
          <button
            key={kit.id}
            type="button"
            className="thumb"
            data-testid={`kit-${kit.id}`}
            onClick={() => {
              logEvent("pool.builtin", { code, kit: kit.id });
              void addBuiltin({ sessionId, code, builtinId: kit.id });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/kits/${kit.id}.svg`} alt="" />
            <span>{kit.label}</span>
          </button>
        ))}
      </div>
      {library && library.length > 0 ? (
        <div className="lib-row" data-testid="library-row">
          {library.map((item) => (
            <button
              key={item._id}
              type="button"
              className="thumb"
              data-testid="library-to-pool"
              onClick={() =>
                void addFromLibrary({ sessionId, code, mediaId: item._id })
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.url ? <img src={item.url} alt="" /> : <span />}
            </button>
          ))}
        </div>
      ) : null}
      <label className="drop">
        Dépose pour cette partie
        <input
          data-testid="lobby-upload"
          type="file"
          accept="image/*,image/gif"
          multiple
          disabled={busy}
          onChange={(e) => void onDrop(e.target.files)}
        />
      </label>
      <p className="note" data-testid="pool-count">
        {state.pool.length} fichier{state.pool.length > 1 ? "s" : ""} dans le
        pool
      </p>
      {state.isHost ? (
        <div className="actions">
          <button
            className="btn"
            type="button"
            data-testid="start-round"
            disabled={busy}
            onClick={() => void launch()}
          >
            Lancer
          </button>
        </div>
      ) : (
        <p className="note" data-testid="waiting-host">
          L’hôte lance quand tout le monde est là.
        </p>
      )}
      {error ? (
        <p className="note err" data-testid="error-banner">
          {error}
        </p>
      ) : null}
    </>
  );
}

function Caption({ code, sessionId }: { code: string; sessionId: string }) {
  const deal = useQuery(api.game.myDeal, { code, sessionId });
  const progress = useQuery(api.game.captionProgress, { code });
  const submit = useMutation(api.game.submitCaption);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (deal?.caption) setCaption(deal.caption);
  }, [deal?.caption]);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await submit({ sessionId, code, caption });
      logEvent("caption.submit", { code });
    } catch (err) {
      setError(errorMessage(err, "Légende refusée."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="table-copy">
        <h1>Écris sur la bande.</h1>
        <p data-testid="caption-progress">
          {progress
            ? `${progress.done}/${progress.total} légendes`
            : "On attend les tirages…"}
        </p>
      </div>
      <PolaroidFrame
        src={deal?.url}
        builtinId={deal?.builtinId}
        band={
          <input
            className="field"
            data-testid="caption-input"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="ta légende"
            maxLength={120}
          />
        }
      />
      <div className="actions">
        <button
          className="btn"
          type="button"
          data-testid="caption-submit"
          disabled={busy || !deal || deal.submitted}
          onClick={() => void onSubmit()}
        >
          {deal?.submitted ? "Posée" : "Poser"}
        </button>
      </div>
      {error ? (
        <p className="note err" data-testid="error-banner">
          {error}
        </p>
      ) : null}
    </>
  );
}

function Vote({ code, sessionId }: { code: string; sessionId: string }) {
  const ballot = useQuery(api.game.currentVote, { code, sessionId });
  const rate = useMutation(api.game.rate);
  const [error, setError] = useState<string | null>(null);

  async function onRate(stars: number) {
    if (!ballot || ballot.done || ballot.isOwn || !ballot.submissionId) return;
    try {
      await rate({
        sessionId,
        code,
        submissionId: ballot.submissionId,
        stars,
      });
      logEvent("vote.rate", { code, stars });
    } catch (err) {
      setError(errorMessage(err, "Note refusée."));
    }
  }

  if (!ballot) {
    return <p className="note">On mélange les tirages…</p>;
  }

  if (ballot.done) {
    return (
      <div className="table-copy">
        <h1>Tu as tout noté.</h1>
        <p>On attend les autres gommettes.</p>
      </div>
    );
  }

  if (ballot.isOwn) {
    return (
      <>
        <div className="table-copy">
          <h1>C’est le tien.</h1>
          <p data-testid="vote-own">Les autres notent. Tu attends.</p>
        </div>
        <PolaroidFrame
          src={ballot.url}
          builtinId={ballot.builtinId}
          caption={ballot.caption}
        />
      </>
    );
  }

  return (
    <>
      <div className="table-copy">
        <h1>Note sans savoir qui.</h1>
        <p data-testid="vote-index">
          {ballot.index + 1}/{ballot.total}
        </p>
      </div>
      <PolaroidFrame
        src={ballot.url}
        builtinId={ballot.builtinId}
        caption={ballot.caption}
      />
      <StarStickers
        value={ballot.yourStars ?? null}
        onChange={(n) => void onRate(n)}
      />
      {error ? (
        <p className="note err" data-testid="error-banner">
          {error}
        </p>
      ) : null}
    </>
  );
}

function Score({
  code,
  sessionId,
  isHost,
}: {
  code: string;
  sessionId: string;
  isHost: boolean;
}) {
  const board = useQuery(api.game.scores, { code, sessionId });
  const start = useMutation(api.rooms.startRound);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  if (!board) return <p className="note">On compte…</p>;

  return (
    <>
      <div className="table-copy">
        <h1>On retourne les tirages.</h1>
        <p>
          Touche une Polaroid pour voir qui a écrit. Le score est la somme des
          étoiles.
        </p>
      </div>
      <ol className="lobby-list" data-testid="ranking">
        {board.ranking.map((p) => (
          <li key={p._id} data-testid={`rank-${p.name}`}>
            {p.name} · {p.score}
          </li>
        ))}
      </ol>
      <div className="score-spread" data-testid="score-spread">
        {board.prints.map((print) => (
          <button
            key={print.id}
            type="button"
            className="thumb score-print"
            data-testid="score-print"
            onClick={() =>
              setFlipped((prev) => ({ ...prev, [print.id]: !prev[print.id] }))
            }
          >
            <PolaroidFrame
              src={print.url}
              builtinId={print.builtinId}
              caption={`${print.caption} · ${print.stars}★`}
              author={print.author}
              flipped={Boolean(flipped[print.id])}
            />
          </button>
        ))}
      </div>
      {isHost ? (
        <div className="actions">
          <button
            className="btn"
            type="button"
            data-testid="next-round"
            onClick={() => {
              setError(null);
              logEvent("round.next", { code });
              void start({ sessionId, code }).catch((err) =>
                setError(errorMessage(err, "Manche impossible.")),
              );
            }}
          >
            Manche suivante
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="note err" data-testid="error-banner">
          {error}
        </p>
      ) : null}
    </>
  );
}
