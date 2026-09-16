export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const CAPTION_MAX = 120;
export const NAME_MAX = 24;
export const MIN_PLAYERS = 2;
export const CAPTION_SECONDS_MIN = 30;
export const CAPTION_SECONDS_MAX = 300;
export const CAPTION_SECONDS_DEFAULT = 90;
export const ROUND_COUNT_MIN = 1;
export const ROUND_COUNT_MAX = 10;
export const ROUND_COUNT_DEFAULT = 3;
export const VOTE_SECONDS = 15;
export const CATALOG_FILTERS = ["all", "popular", "recent"] as const;
export const RANDOM_CATALOG_COUNTS = [5, 10, 15, 20, 25] as const;

export type CatalogFilter = (typeof CATALOG_FILTERS)[number];
export type RandomCatalogCount = (typeof RANDOM_CATALOG_COUNTS)[number];
export const BUILTIN_KITS = [
  "grain",
  "noyer",
  "lait",
  "safran",
  "encre",
  "ciel",
] as const;

export function normalizeName(name: string) {
  return name.trim().slice(0, NAME_MAX);
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function clampStars(stars: number) {
  if (!Number.isFinite(stars)) return 1;
  return Math.min(5, Math.max(1, Math.round(stars)));
}

export function fileKind(mime: string, filename = "") {
  const lower = filename.toLowerCase();
  if (mime === "image/gif" || lower.endsWith(".gif")) return "gif" as const;
  if (mime.startsWith("image/")) return "image" as const;
  return null;
}

export function catalogKindFromUrl(url: string) {
  const lower = url.toLowerCase();
  if (
    lower.includes(".gif") ||
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".mov")
  ) {
    return "gif" as const;
  }
  return "image" as const;
}

export function roomCodeFromRandom(random: () => number = Math.random) {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function shuffleWith<T>(items: T[], random: () => number = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function dealForPlayers<T>(pool: T[], playerCount: number) {
  if (playerCount <= 0 || pool.length === 0) return [] as T[];
  const deck = shuffleWith(pool);
  return Array.from({ length: playerCount }, (_, i) => deck[i % deck.length]);
}

export function pickUniqueDeals<T>(
  pool: T[],
  playerCount: number,
  random: () => number = Math.random,
) {
  if (playerCount <= 0) return [] as T[];
  if (pool.length < playerCount) {
    throw new Error("Il faut au moins une image par joueur.");
  }
  return shuffleWith(pool, random).slice(0, playerCount);
}

export function extraBuiltinsNeeded(
  poolLength: number,
  playerCount: number,
  usedBuiltinIds: string[],
) {
  const extra: string[] = [];
  const used = new Set(usedBuiltinIds);
  while (poolLength + extra.length < playerCount) {
    const next = BUILTIN_KITS.find((id) => !used.has(id));
    if (!next) break;
    used.add(next);
    extra.push(next);
  }
  return extra;
}

export function validateUpload(size: number, mime: string, filename = "") {
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error("Fichier trop lourd (max 8 Mo).");
  }
  const kind = fileKind(mime, filename);
  if (!kind) throw new Error("Images et GIF uniquement.");
  return kind;
}

export function eligibleVoterCount(
  playerSessionIds: string[],
  authorSessionId: string,
) {
  return playerSessionIds.filter((id) => id !== authorSessionId).length;
}

export function canRateSubmission(
  voterSessionId: string,
  authorSessionId: string,
) {
  return voterSessionId !== authorSessionId;
}

export function sumStars(stars: number[]) {
  return stars.reduce((acc, n) => acc + n, 0);
}

export function isJoinablePhase(phase: string, alreadyIn: boolean) {
  return alreadyIn || phase === "lobby";
}

export function canHostStart(
  phase: string,
  round = 0,
  roundCount = ROUND_COUNT_DEFAULT,
) {
  if (phase === "lobby") return true;
  if (phase === "score") return round < roundCount;
  return false;
}

export function advanceVote(orderLength: number, currentIndex: number) {
  const next = currentIndex + 1;
  return next >= orderLength ? ("score" as const) : next;
}

export function clampCaptionSeconds(value: number) {
  if (!Number.isFinite(value)) return CAPTION_SECONDS_DEFAULT;
  return Math.min(
    CAPTION_SECONDS_MAX,
    Math.max(CAPTION_SECONDS_MIN, Math.round(value)),
  );
}

export function clampRoundCount(value: number) {
  if (!Number.isFinite(value)) return ROUND_COUNT_DEFAULT;
  return Math.min(
    ROUND_COUNT_MAX,
    Math.max(ROUND_COUNT_MIN, Math.round(value)),
  );
}

export function isCatalogFilter(value: string): value is CatalogFilter {
  return (CATALOG_FILTERS as readonly string[]).includes(value);
}

export function effectiveCatalogFilter(value: string | undefined): CatalogFilter {
  return value && isCatalogFilter(value) ? value : "popular";
}

export function effectiveCaptionSeconds(value: number | undefined) {
  return clampCaptionSeconds(value ?? CAPTION_SECONDS_DEFAULT);
}

export function effectiveRoundCount(value: number | undefined) {
  return clampRoundCount(value ?? ROUND_COUNT_DEFAULT);
}

export function matchIsOver(round: number, roundCount: number) {
  return round >= roundCount;
}

export function isTimerDue(endsAt: number | undefined, now: number) {
  return endsAt != null && now >= endsAt;
}

export function remainingSeconds(endsAt: number | undefined, now: number) {
  if (endsAt == null) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function normalizeCatalogQuery(query: string) {
  return query.trim().slice(0, 40);
}

export function catalogNameMatches(name: string, query: string) {
  const needle = normalizeCatalogQuery(query).toLowerCase();
  if (!needle) return true;
  return name.toLowerCase().includes(needle);
}

export function sortCatalog<
  T extends { popularity: number; firstSeenAt: number; name: string },
>(items: T[], filter: CatalogFilter) {
  const copy = [...items];
  if (filter === "recent") {
    copy.sort(
      (a, b) => b.firstSeenAt - a.firstSeenAt || b.popularity - a.popularity,
    );
  } else if (filter === "all") {
    copy.sort(
      (a, b) => a.name.localeCompare(b.name) || b.popularity - a.popularity,
    );
  } else {
    copy.sort(
      (a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name),
    );
  }
  return copy;
}

export function pickCatalogFill<T extends { url: string }>(
  catalog: T[],
  usedUrls: Iterable<string>,
  needed: number,
) {
  const used = new Set(usedUrls);
  const picked: T[] = [];
  for (const item of catalog) {
    if (picked.length >= needed) break;
    if (used.has(item.url)) continue;
    used.add(item.url);
    picked.push(item);
  }
  return picked;
}

export function poolAlreadyHasCatalog(
  pool: Array<{ catalogId?: string; remoteUrl?: string }>,
  catalogId: string,
  remoteUrl: string,
) {
  return pool.some(
    (item) => item.catalogId === catalogId || item.remoteUrl === remoteUrl,
  );
}

export function isRandomCatalogCount(value: number): value is RandomCatalogCount {
  return (RANDOM_CATALOG_COUNTS as readonly number[]).includes(value);
}

export function pickRandomUnused<T extends { _id: string; url: string }>(
  items: T[],
  pool: Array<{ catalogId?: string; remoteUrl?: string }>,
  count: number,
  random: () => number = Math.random,
) {
  const available = items.filter(
    (item) => !poolAlreadyHasCatalog(pool, item._id, item.url),
  );
  const take = Math.min(Math.max(0, count), available.length);
  return shuffleWith(available, random).slice(0, take);
}
