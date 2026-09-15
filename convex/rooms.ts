import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  canHostStart,
  clampCaptionSeconds,
  clampRoundCount,
  effectiveCatalogFilter,
  effectiveRoundCount,
  isCatalogFilter,
  isJoinablePhase,
  MIN_PLAYERS,
  normalizeCode,
  normalizeName,
  CAPTION_SECONDS_DEFAULT,
  ROUND_COUNT_DEFAULT,
} from "./gameLogic";
import { fail, poolSrc, requirePlayer, roomCode } from "./lib";
import { dealAndBeginCaption, fillPoolIfShort } from "./roundEngine";

async function findRoom(ctx: QueryCtx | MutationCtx, code: string) {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", normalizeCode(code)))
    .unique();
  if (!room) fail("Salle introuvable.");
  return room;
}

export const create = mutation({
  args: { sessionId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name);
    if (!name) fail("Il faut un prénom.");
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { name });
    else await ctx.db.insert("profiles", { sessionId: args.sessionId, name });

    let code = roomCode();
    for (let i = 0; i < 8; i++) {
      const clash = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!clash) break;
      code = roomCode();
    }

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostSessionId: args.sessionId,
      phase: "lobby",
      round: 0,
      catalogFilter: "popular",
      captionSeconds: CAPTION_SECONDS_DEFAULT,
      roundCount: ROUND_COUNT_DEFAULT,
    });
    await ctx.db.insert("players", {
      roomId,
      sessionId: args.sessionId,
      name,
      score: 0,
    });
    await ctx.db.insert("events", {
      roomId,
      sessionId: args.sessionId,
      type: "room.create",
      detail: code,
    });
    return { roomId, code };
  },
});

export const join = mutation({
  args: { sessionId: v.string(), name: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name);
    if (!name) fail("Il faut un prénom.");
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) fail("Aucune salle avec ce code.");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { name });
    else await ctx.db.insert("profiles", { sessionId: args.sessionId, name });

    const already = await ctx.db
      .query("players")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", room._id).eq("sessionId", args.sessionId),
      )
      .unique();
    const wasHere = Boolean(already);
    if (!already) {
      if (!isJoinablePhase(room.phase, false)) {
        fail("La partie a déjà commencé.");
      }
      await ctx.db.insert("players", {
        roomId: room._id,
        sessionId: args.sessionId,
        name,
        score: 0,
      });
    } else {
      await ctx.db.patch(already._id, { name });
    }
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: wasHere ? "room.rejoin" : "room.join",
      detail: name,
    });
    return { roomId: room._id, code: room.code };
  },
});

export const getByCode = query({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const you = players.find((p) => p.sessionId === args.sessionId);
    if (!you) return null;

    const pool = await ctx.db
      .query("pool")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const poolWithUrls = await Promise.all(
      pool.map(async (item) => ({
        ...item,
        url: await poolSrc(ctx, item),
      })),
    );

    return {
      room,
      players,
      pool: poolWithUrls,
      isHost: room.hostSessionId === args.sessionId,
    };
  },
});

export const addFromLibrary = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    mediaId: v.id("media"),
  },
  handler: async (ctx, args) => {
    const room = await findRoom(ctx, args.code);
    await requirePlayer(ctx, room._id, args.sessionId);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.sessionId !== args.sessionId) {
      fail("Ce fichier n’est pas dans ta bibliothèque.");
    }
    const id = await ctx.db.insert("pool", {
      roomId: room._id,
      storageId: media.storageId,
      kind: media.kind,
      addedBy: args.sessionId,
    });
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "pool.library",
      detail: media.title,
    });
    return id;
  },
});

export const dropFile = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("image"), v.literal("gif")),
  },
  handler: async (ctx, args) => {
    const room = await findRoom(ctx, args.code);
    await requirePlayer(ctx, room._id, args.sessionId);
    const id = await ctx.db.insert("pool", {
      roomId: room._id,
      storageId: args.storageId,
      kind: args.kind,
      addedBy: args.sessionId,
    });
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "pool.drop",
      detail: args.kind,
    });
    return id;
  },
});

export const addBuiltin = mutation({
  args: { sessionId: v.string(), code: v.string(), builtinId: v.string() },
  handler: async (ctx, args) => {
    const room = await findRoom(ctx, args.code);
    await requirePlayer(ctx, room._id, args.sessionId);
    const id = await ctx.db.insert("pool", {
      roomId: room._id,
      builtinId: args.builtinId,
      kind: "builtin",
      addedBy: args.sessionId,
    });
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "pool.builtin",
      detail: args.builtinId,
    });
    return id;
  },
});

export const updateSettings = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    catalogFilter: v.optional(
      v.union(v.literal("all"), v.literal("popular"), v.literal("recent")),
    ),
    captionSeconds: v.optional(v.number()),
    roundCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await findRoom(ctx, args.code);
    if (room.hostSessionId !== args.sessionId) {
      fail("Seul l’hôte règle la table.");
    }
    if (room.phase !== "lobby") {
      fail("Les réglages se changent avant le lancement.");
    }
    const patch: {
      catalogFilter?: "all" | "popular" | "recent";
      captionSeconds?: number;
      roundCount?: number;
    } = {};
    if (args.catalogFilter !== undefined) {
      if (!isCatalogFilter(args.catalogFilter)) {
        fail("Filtre de catalogue inconnu.");
      }
      patch.catalogFilter = effectiveCatalogFilter(args.catalogFilter);
    }
    if (args.captionSeconds !== undefined) {
      patch.captionSeconds = clampCaptionSeconds(args.captionSeconds);
    }
    if (args.roundCount !== undefined) {
      patch.roundCount = clampRoundCount(args.roundCount);
    }
    await ctx.db.patch(room._id, patch);
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "room.settings",
      detail: [
        patch.catalogFilter,
        patch.captionSeconds,
        patch.roundCount,
      ]
        .filter((value) => value !== undefined)
        .join(","),
    });
    return null;
  },
});

export const startRound = mutation({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await findRoom(ctx, args.code);
    if (room.hostSessionId !== args.sessionId) {
      fail("Seul l’hôte lance la manche.");
    }
    if (
      !canHostStart(
        room.phase,
        room.round,
        effectiveRoundCount(room.roundCount),
      )
    ) {
      fail(
        room.phase === "score"
          ? "La partie est terminée."
          : "La manche est déjà en cours.",
      );
    }
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (players.length < MIN_PLAYERS) {
      fail("Il faut au moins deux joueurs.");
    }
    const pool = await fillPoolIfShort(
      ctx,
      room,
      players.length,
      args.sessionId,
    );
    await dealAndBeginCaption(ctx, room, players, pool, args.sessionId);
  },
});
