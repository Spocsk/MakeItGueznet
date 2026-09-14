import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib";

export const ensure = mutation({
  args: { sessionId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, 24);
    if (!name) fail("Il faut un prénom.");
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("profiles", {
      sessionId: args.sessionId,
      name,
    });
  },
});

export const mine = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});
