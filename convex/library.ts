import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MAX_UPLOAD_BYTES } from "./gameLogic";
import { fail, requireProfile } from "./lib";

export const generateUploadUrl = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    await requireProfile(ctx, args.sessionId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    sessionId: v.string(),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("image"), v.literal("gif")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProfile(ctx, args.sessionId);
    const meta = await ctx.db.system.get(args.storageId);
    if (meta && "size" in meta && meta.size > MAX_UPLOAD_BYTES) {
      await ctx.storage.delete(args.storageId);
      fail("Fichier trop lourd (max 8 Mo).");
    }
    const id = await ctx.db.insert("media", {
      sessionId: args.sessionId,
      storageId: args.storageId,
      kind: args.kind,
      title: args.title,
    });
    await ctx.db.insert("events", {
      sessionId: args.sessionId,
      type: "library.save",
      detail: args.title,
    });
    return id;
  },
});

export const list = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("media")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return await Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await ctx.storage.getUrl(row.storageId),
      })),
    );
  },
});

export const remove = mutation({
  args: { sessionId: v.string(), mediaId: v.id("media") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.mediaId);
    if (!row || row.sessionId !== args.sessionId) {
      fail("Tu ne peux retirer que tes fichiers.");
    }
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(row._id);
    await ctx.db.insert("events", {
      sessionId: args.sessionId,
      type: "library.remove",
      detail: row.title,
    });
  },
});
