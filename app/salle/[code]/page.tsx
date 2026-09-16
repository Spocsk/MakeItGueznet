"use client";

import { Countdown } from "@/components/Countdown";
import { CountUp } from "@/components/CountUp";
import { DropZone } from "@/components/DropZone";
import { LazyThumb } from "@/components/LazyThumb";
import { PaperConfetti } from "@/components/PaperConfetti";
import { PolaroidFrame } from "@/components/PolaroidFrame";
import { PolaroidMedia } from "@/components/PolaroidMedia";
import { StarStickers } from "@/components/StarStickers";
import { TableLoading } from "@/components/TableLoading";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  effectiveCaptionSeconds,
  effectiveCatalogFilter,
  effectiveRoundCount,
  RANDOM_CATALOG_COUNTS,
  type CatalogFilter,
  type RandomCatalogCount,
} from "@/convex/gameLogic";
import { errorMessage } from "@/lib/errorMessage";
import { kitSrc } from "@/lib/kits";
import { logEvent } from "@/lib/log";
import { useSessionId } from "@/lib/session";
import { useUploader } from "@/lib/upload";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";

type PoolPreview = {
  _id: string;
  kind: string;
  builtinId?: string | null;
  url?: string | null;
  thumbUrl?: string | null;
};

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
  pool: PoolPreview[];
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

function LiveNav({
  code,
  sessionId,
  phase,
}: {
  code: string;
  sessionId: string;
  phase: string;
}) {
  const progress = useQuery(
    api.game.captionProgress,
    phase === "caption" ? { code } : "skip",
  );
  const ballot = useQuery(
    api.game.currentVote,
    phase === "vote" ? { code, sessionId } : "skip",
  );
  const board = useQuery(
    api.game.scores,
    phase === "score" ? { code, sessionId } : "skip",
  );
  const tryCloseCaption = useMutation(api.timers.tryCloseCaption);
  const tryCloseVote = useMutation(api.timers.tryCloseVote);

  const round =
    phase === "caption"
      ? progress?.round
      : phase === "vote"
        ? ballot?.round
        : board?.round;
  const roundCount =
    phase === "caption"
      ? progress?.roundCount
      : phase === "vote"
        ? ballot?.roundCount
        : board?.roundCount;

  return (
    <nav className="nav-mini">
      <Link href="/" className="live-tick">
        Live
      </Link>
      {round != null && roundCount != null ? (
        <span data-testid="round-label">
          Manche {round}/{roundCount}
        </span>
      ) : null}
      {phase === "caption" ? (
        <Countdown
          endsAt={progress?.captionEndsAt}
          testId="caption-timer"
          onDue={() => {
            void tryCloseCaption({ sessionId, code });
          }}
        />
      ) : null}
      {phase === "vote" ? (
        <Countdown
          endsAt={ballot?.voteEndsAt}
          testId="vote-timer"
          onDue={() => {
            void tryCloseVote({ sessionId, code });
          }}
        />
      ) : null}
      {phase === "score" && board ? (
        <ol className="ranking-list ranking-live" data-testid="ranking">
          {board.ranking.map((player, i) => (
            <li key={player._id} data-testid={`rank-${player.name}`}>
              <span className="rank-pos">{i + 1}</span>
              <span>{player.name}</span>
              <CountUp value={player.score} />
            </li>
          ))}
        </ol>
      ) : null}
      <span data-testid="room-code">{code}</span>
      <Link href="/bibliotheque">Bibliothèque</Link>
    </nav>
  );
}

function GameTable({ code }: { code: string }) {
  const sessionId = useSessionId();
  const state = useQuery(
    api.rooms.getByCode,
    sessionId ? { code, sessionId } : "skip",
  );
  if (!sessionId) {
    return (
      <TableLoading message="Ouverture du tableau…" testId="phase-loading" />
    );
  }

  if (state === undefined) {
    return (
      <TableLoading
        message={`On cherche la salle ${code}…`}
        testId="phase-loading"
      />
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

  const phase = state.room.phase;

  return (
    <main className="table-room" data-testid={`phase-${phase}`}>
      <LiveNav code={code} sessionId={sessionId} phase={phase} />
      <div className="phase-stage" key={phase}>
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
      </div>
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
  const addFromLibrary = useMutation(api.rooms.addFromLibrary);
  const addFromCatalog = useMutation(api.catalog.addToPool);
  const addRandomCatalog = useMutation(api.catalog.addRandomToPool);
  const dropFile = useMutation(api.rooms.dropFile);
  const updateSettings = useMutation(api.rooms.updateSettings);
  const refreshCatalog = useAction(api.catalogActions.refresh);
  const library = useQuery(api.library.list, { sessionId });
  const filter = effectiveCatalogFilter(state.room.catalogFilter);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogLookup, setCatalogLookup] = useState("");
  const [randomCount, setRandomCount] = useState<RandomCatalogCount>(10);
  const catalog = useQuery(api.catalog.list, {
    filter,
    query: catalogLookup || undefined,
  });
  const upload = useUploader();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestedCatalog = useRef(false);

  const captionSeconds = effectiveCaptionSeconds(state.room.captionSeconds);
  const roundCount = effectiveRoundCount(state.room.roundCount);
  const lead = state.pool[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCatalogLookup(catalogQuery.trim());
    }, 180);
    return () => window.clearTimeout(timer);
  }, [catalogQuery]);

  useEffect(() => {
    if (catalog === undefined || catalogLookup) return;
    if (catalog.length > 0 || requestedCatalog.current) return;
    requestedCatalog.current = true;
    void refreshCatalog().catch(() => {
      requestedCatalog.current = false;
    });
  }, [catalog, catalogLookup, refreshCatalog]);

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

  async function onDrop(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of list) {
        const uploaded = await upload(sessionId, file);
        await dropFile({
          sessionId,
          code,
          storageId: uploaded.storageId,
          kind: uploaded.kind,
          ...(uploaded.thumbStorageId
            ? { thumbStorageId: uploaded.thumbStorageId }
            : {}),
        });
      }
      logEvent("pool.drop", { code, n: list.length });
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

  async function drawRandom() {
    setBusy(true);
    setError(null);
    try {
      const result = await addRandomCatalog({
        sessionId,
        code,
        count: randomCount,
        ...(catalogLookup ? { query: catalogLookup } : {}),
      });
      logEvent("pool.catalog", { code, n: result.added, random: true });
    } catch (err) {
      setError(errorMessage(err, "Pioche impossible."));
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
            ? "Choisis les templates, le temps et le nombre de manches."
            : "En attente de l’hôte. Tu peux déjà poser des fichiers."}
        </p>
      </div>
      <PolaroidFrame
        builtinId={lead?.builtinId}
        thumbSrc={lead?.thumbUrl}
        kind={lead?.kind}
        caption={`${state.players.length} au tableau`}
        alt="Aperçu du pool"
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
          <input
            className="field field-on-table catalog-search"
            data-testid="catalog-search"
            type="search"
            value={catalogQuery}
            onChange={(event) => setCatalogQuery(event.target.value)}
            placeholder="cherche un template"
            maxLength={40}
            autoComplete="off"
            aria-label="Chercher un template"
          />
          <div className="catalog-draw">
            <label className="setting-field">
              Au hasard
              <select
                data-testid="catalog-random-count"
                value={randomCount}
                aria-label="Nombre de templates à piocher"
                onChange={(event) =>
                  setRandomCount(Number(event.target.value) as RandomCatalogCount)
                }
              >
                {RANDOM_CATALOG_COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="chip"
              data-testid="catalog-random"
              disabled={busy || catalog === undefined || catalog.length === 0}
              onClick={() => void drawRandom()}
            >
              Pioche {randomCount}
            </button>
          </div>
          <div className="catalog-grid" data-testid="catalog-grid">
            {catalog === undefined ? (
              <p className="note">On charge les templates…</p>
            ) : catalog.length === 0 ? (
              <p className="note">
                {catalogLookup
                  ? `Aucun template pour « ${catalogLookup} ».`
                  : "Aucun template pour l’instant."}
              </p>
            ) : (
              catalog.map((item) => (
                <LazyThumb
                  key={item._id}
                  src={item.url}
                  kind={item.kind}
                  label={item.name}
                  testId="catalog-item"
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
                />
              ))
            )}
          </div>
        </div>

        <div className="source-block">
          <h2>Bibliothèque</h2>
          {library && library.length > 0 ? (
            <div className="lib-row" data-testid="library-row">
              {library.map((item) => (
                <LazyThumb
                  key={item._id}
                  src={item.url}
                  thumbSrc={item.thumbUrl}
                  kind={item.kind}
                  testId="library-to-pool"
                  onClick={() =>
                    void addFromLibrary({
                      sessionId,
                      code,
                      mediaId: item._id,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <p className="note" data-testid="library-empty">
              Rien sur cet appareil. Va dans Bibliothèque pour garder un
              fichier.
            </p>
          )}
        </div>

        <div className="source-block">
          <h2>Le pool</h2>
          <DropZone
            testId="lobby-upload"
            disabled={busy}
            onFiles={(files) => void onDrop(files)}
            label="Dépose un fichier"
            hint="Image ou GIF, pour cette partie seulement"
          />
          {state.pool.length > 0 ? (
            <div className="lib-row" data-testid="pool-strip">
              {state.pool.map((item) => (
                <div key={item._id} className="thumb" aria-hidden="true">
                  {item.builtinId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={kitSrc(item.builtinId)} alt="" />
                  ) : (
                    <PolaroidMedia
                      src={item.url}
                      thumbSrc={item.thumbUrl}
                      kind={item.kind}
                      variant="thumb"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}
          <p className="note" data-testid="pool-count">
            {state.pool.length} fichier{state.pool.length > 1 ? "s" : ""} dans le
            pool
          </p>
        </div>
      </section>
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
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const caption = draft ?? deal?.caption ?? "";

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
        <h1>Écris sur l’écran.</h1>
        <p data-testid="caption-progress">
          {progress
            ? `${progress.done}/${progress.total} légendes`
            : "On attend les fichiers…"}
        </p>
      </div>
      <PolaroidFrame
        src={deal?.url}
        builtinId={deal?.builtinId}
        kind={deal?.kind}
        enter
        stamped={Boolean(deal?.submitted)}
        alt="Ton écran"
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
          {deal?.submitted ? "Envoyé" : "Envoyer"}
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
  const [combo, setCombo] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const streak = useRef(0);

  useEffect(() => {
    if (!ballot || !("nextUrl" in ballot) || !ballot.nextUrl) return;
    const img = new Image();
    img.src = ballot.nextUrl;
  }, [ballot]);

  async function onRate(stars: number) {
    if (!ballot || ballot.done || ballot.isOwn || !ballot.submissionId) return;
    if (stars === 5) {
      streak.current += 1;
      setCombo(streak.current);
      setBurstKey((key) => key + 1);
    } else {
      streak.current = 0;
      setCombo(0);
    }
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
    return (
      <>
        <PolaroidFrame waiting caption="…" />
        <p className="note">On mélange les fichiers…</p>
      </>
    );
  }

  if (ballot.done) {
    return (
      <div className="table-copy">
        <h1>Tu as tout noté.</h1>
        <p>On attend les autres notes.</p>
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
          kind={ballot.kind}
          caption={ballot.caption}
          enter
          alt="Ton écran"
        />
      </>
    );
  }

  return (
    <>
      {burstKey > 0 ? <PaperConfetti key={burstKey} count={10} burst /> : null}
      <div className="table-copy">
        <h1>Note sans savoir qui.</h1>
        <p data-testid="vote-index">
          {ballot.index + 1}/{ballot.total}
        </p>
      </div>
      <PolaroidFrame
        key={ballot.submissionId}
        src={ballot.url}
        builtinId={ballot.builtinId}
        kind={ballot.kind}
        caption={ballot.caption}
        enter
        alt="Fichier à noter"
      />
      {combo >= 2 ? (
        <p className="combo-mark" data-testid="combo-mark">
          Enchaînement
        </p>
      ) : null}
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

  if (!board) {
    return (
      <>
        <PolaroidFrame waiting caption="…" />
        <p className="note">On compte…</p>
      </>
    );
  }

  return (
    <>
      <PaperConfetti />
      <div className="table-copy">
        <h1>Le tableau.</h1>
        <p>
          Touche un écran pour voir qui a écrit. Le score est la somme des
          étoiles.
        </p>
      </div>
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
              kind={print.kind}
              caption={`${print.caption} · ${print.stars}★`}
              author={print.author}
              flipped={Boolean(flipped[print.id])}
              alt={print.caption}
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
