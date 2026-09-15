"use client";

import { Countdown } from "@/components/Countdown";
import { PolaroidFrame } from "@/components/PolaroidFrame";
import { StarStickers } from "@/components/StarStickers";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  effectiveCaptionSeconds,
  effectiveCatalogFilter,
  effectiveRoundCount,
  type CatalogFilter,
} from "@/convex/gameLogic";
import { errorMessage } from "@/lib/errorMessage";
import { KITS } from "@/lib/kits";
import { logEvent } from "@/lib/log";
import { useSessionId } from "@/lib/session";
import { useUploader } from "@/lib/upload";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";

type LobbyState = {
  isHost: boolean;
  room: {
    hostSessionId: string;
    catalogFilter?: CatalogFilter;
    captionSeconds?: number;
    roundCount?: number;
    round: number;
  };
  players: { _id: string; name: string; sessionId: string }[];
  pool: { builtinId?: string; url?: string | null }[];
};

const FILTER_LABELS: Record<CatalogFilter, string> = {
  all: "Tous",
  popular: "Populaires",
  recent: "Récents",
};

const CAPTION_PRESETS = [30, 45, 60, 90, 120, 180, 300];

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
        <Caption
          key={`caption-${state.room.round}`}
          code={code}
          sessionId={sessionId}
        />
      ) : null}
      {phase === "vote" ? (
        <Vote
          key={`vote-${state.room.round}`}
          code={code}
          sessionId={sessionId}
        />
      ) : null}
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
  const addFromCatalog = useMutation(api.catalog.addToPool);
  const dropFile = useMutation(api.rooms.dropFile);
  const updateSettings = useMutation(api.rooms.updateSettings);
  const refreshCatalog = useAction(api.catalogActions.refresh);
  const library = useQuery(api.library.list, { sessionId });
  const filter = effectiveCatalogFilter(state.room.catalogFilter);
  const catalog = useQuery(api.catalog.list, { filter });
  const upload = useUploader();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestedCatalog = useRef(false);

  const captionSeconds = effectiveCaptionSeconds(state.room.captionSeconds);
  const roundCount = effectiveRoundCount(state.room.roundCount);

  useEffect(() => {
    if (catalog === undefined) return;
    if (catalog.length > 0 || requestedCatalog.current) return;
    requestedCatalog.current = true;
    void refreshCatalog().catch(() => {
      requestedCatalog.current = false;
    });
  }, [catalog, refreshCatalog]);

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

  async function saveSettings(patch: {
    catalogFilter?: CatalogFilter;
    captionSeconds?: number;
    roundCount?: number;
  }) {
    setError(null);
    try {
      await updateSettings({ sessionId, code, ...patch });
      logEvent("room.settings", { code, ...patch });
    } catch (err) {
      setError(errorMessage(err, "Réglage refusé."));
    }
  }

  return (
    <>
      <div className="table-copy">
        <h1>Salle {code}</h1>
        <p>
          {state.isHost
            ? "Choisis les templates, le temps et le nombre de manches."
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

      {state.isHost ? (
        <section className="lobby-settings" data-testid="host-settings">
          <p className="settings-label">Templates</p>
          <div className="filter-row" data-testid="catalog-filters">
            {(Object.keys(FILTER_LABELS) as CatalogFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                className={filter === key ? "chip on" : "chip"}
                data-testid={`filter-${key}`}
                aria-pressed={filter === key}
                onClick={() => void saveSettings({ catalogFilter: key })}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>
          <label className="setting-field">
            Légende
            <select
              data-testid="caption-seconds"
              value={captionSeconds}
              onChange={(e) =>
                void saveSettings({
                  captionSeconds: Number(e.target.value),
                })
              }
            >
              {CAPTION_PRESETS.map((n) => (
                <option key={n} value={n}>
                  {n}s
                </option>
              ))}
            </select>
          </label>
          <label className="setting-field">
            Manches
            <select
              data-testid="round-count"
              value={roundCount}
              onChange={(e) =>
                void saveSettings({ roundCount: Number(e.target.value) })
              }
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : (
        <p className="note" data-testid="settings-readonly">
          {FILTER_LABELS[filter]} · {captionSeconds}s · {roundCount} manche
          {roundCount > 1 ? "s" : ""}
        </p>
      )}

      <section className="source-board">
        <div className="source-block">
          <div className="source-head">
            <h2>Catalogue</h2>
            <button
              type="button"
              className="chip"
              data-testid="catalog-refresh"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void refreshCatalog()
                  .catch((err) =>
                    setError(errorMessage(err, "Catalogue indisponible.")),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Actualiser
            </button>
          </div>
          <p className="note">Templates Imgflip</p>
          <div className="catalog-grid" data-testid="catalog-grid">
            {catalog === undefined ? (
              <p className="note">On charge les templates…</p>
            ) : catalog.length === 0 ? (
              <p className="note">Aucun template pour l’instant.</p>
            ) : (
              catalog.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="thumb"
                  data-testid="catalog-item"
                  onClick={() => {
                    logEvent("pool.catalog", { code, id: item._id });
                    void addFromCatalog({
                      sessionId,
                      code,
                      catalogId: item._id,
                    }).catch((err) =>
                      setError(errorMessage(err, "Ajout impossible.")),
                    );
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" />
                  <span>{item.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="source-block">
          <h2>Bibliothèque</h2>
          {library && library.length > 0 ? (
            <div className="lib-row" data-testid="library-row">
              {library.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="thumb"
                  data-testid="library-to-pool"
                  onClick={() =>
                    void addFromLibrary({
                      sessionId,
                      code,
                      mediaId: item._id,
                    })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.url ? <img src={item.url} alt="" /> : <span />}
                </button>
              ))}
            </div>
          ) : (
            <p className="note" data-testid="library-empty">
              Rien sur cet appareil. Va dans Bibliothèque pour poser un fichier
              une bonne fois.
            </p>
          )}
        </div>

        <div className="source-block">
          <h2>Cette table</h2>
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
          <p className="note">Kits de secours</p>
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
        </div>
      </section>

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
  const tryClose = useMutation(api.timers.tryCloseCaption);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const caption = draft ?? deal?.caption ?? "";

  const onDue = useCallback(() => {
    void tryClose({ sessionId, code });
  }, [tryClose, sessionId, code]);

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
        <p data-testid="round-label">
          Manche {progress?.round ?? "—"}/{progress?.roundCount ?? "—"}
        </p>
        <Countdown
          endsAt={progress?.captionEndsAt}
          testId="caption-timer"
          onDue={onDue}
        />
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
            onChange={(e) => setDraft(e.target.value)}
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
  const tryClose = useMutation(api.timers.tryCloseVote);
  const [error, setError] = useState<string | null>(null);

  const onDue = useCallback(() => {
    void tryClose({ sessionId, code });
  }, [tryClose, sessionId, code]);

  async function onRate(stars: number) {
    if (!ballot || ballot.done || ballot.isOwn || !ballot.submissionId) return;
    try {
      await rate({
        sessionId,
        code,
        submissionId: ballot.submissionId as Id<"submissions">,
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
          <Countdown
            endsAt={ballot.voteEndsAt}
            testId="vote-timer"
            onDue={onDue}
          />
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
        <p data-testid="round-label">
          Manche {ballot.round}/{ballot.roundCount}
        </p>
        <Countdown
          endsAt={ballot.voteEndsAt}
          testId="vote-timer"
          onDue={onDue}
        />
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
        <p data-testid="round-label">
          Manche {board.round}/{board.roundCount}
        </p>
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
      {board.finished ? (
        <p className="note" data-testid="match-over">
          Partie terminée.
        </p>
      ) : isHost ? (
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
