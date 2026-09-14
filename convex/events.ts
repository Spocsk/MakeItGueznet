import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const record = mutation({
  args: {
    sessionId: v.string(),
    roomId: v.optional(v.id("rooms")),
    type: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      sessionId: args.sessionId,
      roomId: args.roomId,
      type: args.type.slice(0, 40),
      detail: args.detail?.slice(0, 200),
    });
  },
});

export const listByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!room) return [];
    const rows = await ctx.db
      .query("events")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    return rows.map((row) => ({
      type: row.type,
      detail: row.detail ?? "",
      sessionId: row.sessionId,
    }));
  },
});

export const listBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("events")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return rows.map((row) => ({
      type: row.type,
      detail: row.detail ?? "",
      roomId: row.roomId ?? null,
    }));
  },
});
