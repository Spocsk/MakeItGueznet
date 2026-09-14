export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const CAPTION_MAX = 120;
export const NAME_MAX = 24;
export const MIN_PLAYERS = 2;
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

export function canHostStart(phase: string) {
  return phase === "lobby" || phase === "score";
}

export function advanceVote(orderLength: number, currentIndex: number) {
  const next = currentIndex + 1;
  return next >= orderLength ? ("score" as const) : next;
}
