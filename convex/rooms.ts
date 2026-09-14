import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  extraBuiltinsNeeded,
  canHostStart,
  isJoinablePhase,
  MIN_PLAYERS,
  normalizeCode,
  normalizeName,
  pickUniqueDeals,
} from "./gameLogic";
import { fail, requirePlayer, roomCode } from "./lib";

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
        url: item.storageId ? await ctx.storage.getUrl(item.storageId) : null,
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

export const startRound = mutation({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await findRoom(ctx, args.code);
    if (room.hostSessionId !== args.sessionId) {
      fail("Seul l’hôte lance la manche.");
    }
    if (!canHostStart(room.phase)) {
      fail("La manche est déjà en cours.");
    }
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (players.length < MIN_PLAYERS) {
      fail("Il faut au moins deux joueurs.");
    }
    let pool = await ctx.db
      .query("pool")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const extra = extraBuiltinsNeeded(
      pool.length,
      players.length,
      pool
        .map((item) => item.builtinId)
        .filter((id): id is string => Boolean(id)),
    );
    for (const builtinId of extra) {
      const id = await ctx.db.insert("pool", {
        roomId: room._id,
        builtinId,
        kind: "builtin",
        addedBy: args.sessionId,
      });
      pool.push((await ctx.db.get(id))!);
    }
    if (pool.length < players.length) {
      fail("Il faut au moins une image par joueur.");
    }
    const round = room.round + 1;
    const dealt = pickUniqueDeals(pool, players.length);
    for (let i = 0; i < players.length; i++) {
      await ctx.db.insert("deals", {
        roomId: room._id,
        round,
        sessionId: players[i].sessionId,
        poolId: dealt[i]._id,
      });
    }
    await ctx.db.patch(room._id, {
      phase: "caption",
      round,
      voteOrder: undefined,
      voteIndex: 0,
    });
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "round.start",
      detail: String(round),
    });
  },
});
