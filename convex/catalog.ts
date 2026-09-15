import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  effectiveCatalogFilter,
  normalizeCode,
  poolAlreadyHasCatalog,
  sortCatalog,
} from "./gameLogic";
import { fail, requirePlayer } from "./lib";

const catalogKind = v.union(v.literal("image"), v.literal("gif"));

const catalogItemDoc = v.object({
  _id: v.id("catalog"),
  name: v.string(),
  url: v.string(),
  kind: catalogKind,
  popularity: v.number(),
  firstSeenAt: v.number(),
});

export const list = query({
  args: {
    filter: v.optional(
      v.union(v.literal("all"), v.literal("popular"), v.literal("recent")),
    ),
  },
  returns: v.array(catalogItemDoc),
  handler: async (ctx, args) => {
    const filter = effectiveCatalogFilter(args.filter);
    const rows = await ctx.db.query("catalog").collect();
    return sortCatalog(rows, filter)
      .slice(0, 80)
      .map((row) => ({
        _id: row._id,
        name: row.name,
        url: row.url,
        kind: row.kind,
        popularity: row.popularity,
        firstSeenAt: row.firstSeenAt,
      }));
  },
});

export const upsertBatch = internalMutation({
  args: {
    now: v.number(),
    items: v.array(
      v.object({
        externalId: v.string(),
        name: v.string(),
        url: v.string(),
        kind: catalogKind,
        popularity: v.number(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let written = 0;
    for (const item of args.items) {
      const existing = await ctx.db
        .query("catalog")
        .withIndex("by_external", (q) => q.eq("externalId", item.externalId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: item.name,
          url: item.url,
          kind: item.kind,
          popularity: item.popularity,
        });
      } else {
        await ctx.db.insert("catalog", {
          externalId: item.externalId,
          name: item.name,
          url: item.url,
          kind: item.kind,
          popularity: item.popularity,
          firstSeenAt: args.now,
        });
      }
      written += 1;
    }
    return written;
  },
});

export const addToPool = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    catalogId: v.id("catalog"),
  },
  returns: v.id("pool"),
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) fail("Salle introuvable.");
    await requirePlayer(ctx, room._id, args.sessionId);
    const item = await ctx.db.get(args.catalogId);
    if (!item) fail("Template introuvable.");
    const pool = await ctx.db
      .query("pool")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (poolAlreadyHasCatalog(pool, args.catalogId, item.url)) {
      const already = pool.find(
        (row) => row.catalogId === args.catalogId || row.remoteUrl === item.url,
      );
      if (already) return already._id;
    }
    const id = await ctx.db.insert("pool", {
      roomId: room._id,
      catalogId: item._id,
      remoteUrl: item.url,
      kind: "remote",
      addedBy: args.sessionId,
    });
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "pool.catalog",
      detail: item.name,
    });
    return id;
  },
});
