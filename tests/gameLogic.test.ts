import { describe, expect, it } from "vitest";
import {
  advanceVote,
  canHostStart,
  canRateSubmission,
  clampStars,
  dealForPlayers,
  eligibleVoterCount,
  extraBuiltinsNeeded,
  fileKind,
  isJoinablePhase,
  MAX_UPLOAD_BYTES,
  MIN_PLAYERS,
  normalizeCode,
  normalizeName,
  pickUniqueDeals,
  roomCodeFromRandom,
  shuffleWith,
  sumStars,
  validateUpload,
} from "../convex/gameLogic";

describe("normalizeName", () => {
  it("trim et coupe à 24", () => {
    expect(normalizeName("  Dylan  ")).toBe("Dylan");
    expect(normalizeName("x".repeat(30))).toHaveLength(24);
  });
});

describe("normalizeCode", () => {
  it("passe en majuscules", () => {
    expect(normalizeCode(" ab12 ")).toBe("AB12");
  });
});

describe("clampStars", () => {
  it("borne entre 1 et 5", () => {
    expect(clampStars(0)).toBe(1);
    expect(clampStars(6)).toBe(5);
    expect(clampStars(3.4)).toBe(3);
    expect(clampStars(3.5)).toBe(4);
    expect(clampStars(Number.NaN)).toBe(1);
  });
});

describe("fileKind", () => {
  it("détecte gif, image, ou refuse", () => {
    expect(fileKind("image/gif")).toBe("gif");
    expect(fileKind("image/png", "x.PNG")).toBe("image");
    expect(fileKind("application/octet-stream", "loop.GIF")).toBe("gif");
    expect(fileKind("text/plain", "note.txt")).toBeNull();
  });
});

describe("roomCodeFromRandom", () => {
  it("tire 4 caractères dans l’alphabet", () => {
    expect(roomCodeFromRandom(() => 0)).toBe("AAAA");
    expect(roomCodeFromRandom(() => 0.999)).toHaveLength(4);
  });
});

describe("shuffleWith", () => {
  it("est déterministe avec une source figée", () => {
    const seq = [0.2, 0.8, 0.1, 0.9, 0.4];
    const random = () => {
      const value = seq.shift();
      return value ?? 0.5;
    };
    const a = shuffleWith([1, 2, 3, 4], () => 0.3);
    const b = shuffleWith([1, 2, 3, 4], () => 0.3);
    expect(a).toEqual(b);
    expect(shuffleWith([1, 2, 3], random)).toHaveLength(3);
  });
});

describe("dealForPlayers", () => {
  it("recycle le pool si besoin", () => {
    expect(dealForPlayers(["a"], 3)).toEqual(["a", "a", "a"]);
    expect(dealForPlayers([], 2)).toEqual([]);
    expect(dealForPlayers(["a", "b"], 0)).toEqual([]);
  });
});

describe("pickUniqueDeals", () => {
  it("donne une image distincte par joueur", () => {
    const dealt = pickUniqueDeals(["a", "b", "c", "d"], 3, () => 0.1);
    expect(dealt).toHaveLength(3);
    expect(new Set(dealt).size).toBe(3);
  });

  it("refuse s’il n’y a pas assez d’images", () => {
    expect(() => pickUniqueDeals(["a"], 2)).toThrow(
      "Il faut au moins une image par joueur.",
    );
  });
});

describe("extraBuiltinsNeeded", () => {
  it("complète avec les kits encore libres", () => {
    expect(extraBuiltinsNeeded(0, 2, [])).toEqual(["grain", "noyer"]);
    expect(extraBuiltinsNeeded(1, 2, ["grain"])).toEqual(["noyer"]);
    expect(extraBuiltinsNeeded(6, 2, ["grain"])).toEqual([]);
  });
});

describe("validateUpload", () => {
  it("accepte une image légère", () => {
    expect(validateUpload(12, "image/png", "a.png")).toBe("image");
    expect(validateUpload(12, "image/gif", "a.gif")).toBe("gif");
  });

  it("refuse le poids et le type", () => {
    expect(() =>
      validateUpload(MAX_UPLOAD_BYTES + 1, "image/png", "a.png"),
    ).toThrow("Fichier trop lourd (max 8 Mo).");
    expect(() => validateUpload(10, "application/pdf", "a.pdf")).toThrow(
      "Images et GIF uniquement.",
    );
  });
});

describe("votes et scores", () => {
  it("compte les votants éligibles", () => {
    expect(eligibleVoterCount(["h", "g", "t"], "h")).toBe(2);
    expect(canRateSubmission("h", "h")).toBe(false);
    expect(canRateSubmission("g", "h")).toBe(true);
    expect(sumStars([5, 4, 1])).toBe(10);
  });

  it("avance le vote puis passe aux scores", () => {
    expect(advanceVote(2, 0)).toBe(1);
    expect(advanceVote(2, 1)).toBe("score");
  });
});

describe("phases", () => {
  it("autorise le join et le lancement aux bons moments", () => {
    expect(isJoinablePhase("lobby", false)).toBe(true);
    expect(isJoinablePhase("caption", false)).toBe(false);
    expect(isJoinablePhase("vote", true)).toBe(true);
    expect(canHostStart("lobby")).toBe(true);
    expect(canHostStart("score")).toBe(true);
    expect(canHostStart("vote")).toBe(false);
    expect(MIN_PLAYERS).toBe(2);
  });
});
