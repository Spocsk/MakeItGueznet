import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MAX_UPLOAD_BYTES } from "./gameLogic";
import { fail, requireProfile } from "./lib";

export const generateUploadUrl = mutation({
  args: { sessionId: v.string() },
  returns: v.string(),
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
    thumbStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("media"),
  handler: async (ctx, args) => {
    await requireProfile(ctx, args.sessionId);
    const meta = await ctx.db.system.get(args.storageId);
    if (meta && "size" in meta && meta.size > MAX_UPLOAD_BYTES) {
      await ctx.storage.delete(args.storageId);
      if (args.thumbStorageId) await ctx.storage.delete(args.thumbStorageId);
      fail("Fichier trop lourd (max 8 Mo).");
    }
    const id = await ctx.db.insert("media", {
      sessionId: args.sessionId,
      storageId: args.storageId,
      thumbStorageId: args.thumbStorageId,
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

const libraryItem = v.object({
  _id: v.id("media"),
  _creationTime: v.number(),
  sessionId: v.string(),
  storageId: v.id("_storage"),
  thumbStorageId: v.optional(v.id("_storage")),
  kind: v.union(v.literal("image"), v.literal("gif")),
  title: v.optional(v.string()),
  url: v.union(v.string(), v.null()),
  thumbUrl: v.union(v.string(), v.null()),
});

export const list = query({
  args: { sessionId: v.string() },
  returns: v.array(libraryItem),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("media")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return await Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await ctx.storage.getUrl(row.storageId),
        thumbUrl: row.thumbStorageId
          ? await ctx.storage.getUrl(row.thumbStorageId)
          : row.kind === "gif"
            ? null
            : await ctx.storage.getUrl(row.storageId),
      })),
    );
  },
});

export const remove = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("media"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.mediaId);
    if (!row || row.sessionId !== args.sessionId) {
      fail("Tu ne peux retirer que tes fichiers.");
    }
    if (row.thumbStorageId) await ctx.storage.delete(row.thumbStorageId);
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(row._id);
    await ctx.db.insert("events", {
      sessionId: args.sessionId,
      type: "library.remove",
      detail: row.title,
    });
    return null;
  },
});
